"""
Integrations API Endpoints - Tool Data Sync and Retrieval

This module provides endpoints for managing tool integrations,
syncing data from external services, and retrieving stored data.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

import httpx
from datetime import timedelta

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService, normalize_wallet_address
from app.services.rag_service import BusinessRAGService
from app.core.database import get_db
from app.core.config import settings
from app.models.marketplace import Product
from app.models.purchase import Purchase, OAuthToken, SyncLog, SyncStatus

logger = logging.getLogger(__name__)


# OAuth token refresh configurations
TOKEN_REFRESH_CONFIGS = {
    "quickbooks": {
        "token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "client_id": getattr(settings, 'quickbooks_client_id', ''),
        "client_secret": getattr(settings, 'quickbooks_client_secret', ''),
    },
    "google": {
        "token_url": "https://oauth2.googleapis.com/token",
        "client_id": getattr(settings, 'google_client_id', ''),
        "client_secret": getattr(settings, 'google_client_secret', ''),
    },
    "microsoft": {
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "client_id": getattr(settings, 'microsoft_client_id', ''),
        "client_secret": getattr(settings, 'microsoft_client_secret', ''),
    },
    "hubspot": {
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "client_id": getattr(settings, 'hubspot_client_id', ''),
        "client_secret": getattr(settings, 'hubspot_client_secret', ''),
    },
    "salesforce": {
        "token_url": "https://login.salesforce.com/services/oauth2/token",
        "client_id": getattr(settings, 'salesforce_client_id', ''),
        "client_secret": getattr(settings, 'salesforce_client_secret', ''),
    },
    "slack": {
        "token_url": "https://slack.com/api/oauth.v2.access",
        "client_id": getattr(settings, 'slack_client_id', ''),
        "client_secret": getattr(settings, 'slack_client_secret', ''),
    },
}


async def refresh_oauth_token(
    oauth_token: OAuthToken,
    provider: str,
    db: AsyncSession
) -> bool:
    """
    Refresh an expired OAuth token using the refresh_token.

    Args:
        oauth_token: The OAuthToken model instance
        provider: The provider name (google, microsoft, etc.)
        db: Database session

    Returns:
        True if refresh succeeded, False otherwise
    """
    if provider not in TOKEN_REFRESH_CONFIGS:
        logger.warning(f"No refresh config for provider: {provider}")
        return False

    if not oauth_token.refresh_token:
        logger.warning(f"No refresh token available for {provider}")
        return False

    config = TOKEN_REFRESH_CONFIGS[provider]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": oauth_token.refresh_token,
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )

            if response.status_code != 200:
                logger.error(f"Token refresh failed for {provider}: {response.text}")
                return False

            token_data = response.json()

            # Update the token in the database
            oauth_token.access_token = token_data.get("access_token")

            # Some providers return a new refresh token
            if token_data.get("refresh_token"):
                oauth_token.refresh_token = token_data.get("refresh_token")

            # Update expiration
            if token_data.get("expires_in"):
                oauth_token.expires_at = datetime.utcnow() + timedelta(
                    seconds=int(token_data["expires_in"])
                )

            oauth_token.last_refreshed_at = datetime.utcnow()
            oauth_token.updated_at = datetime.utcnow()

            await db.commit()

            logger.info(f"Successfully refreshed {provider} token for user {oauth_token.user_address[:10]}...")
            return True

    except Exception as e:
        logger.error(f"Token refresh error for {provider}: {e}")
        return False

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# Initialize RAG service with graceful fallback
try:
    rag_service = BusinessRAGService()
    logger.info("RAG service initialized successfully in integrations module")
except Exception as e:
    logger.warning(f"Failed to initialize RAG service in integrations (Qdrant may not be configured): {e}")
    rag_service = None  # type: ignore


# Integration name normalization mapping
# Maps user-facing names to storage names (as used by adapters)
# IMPORTANT: The Google adapter stores data with integration="google", so all variations must map to "google"
INTEGRATION_NAME_MAPPING = {
    # Microsoft variations
    "microsoft 365": "microsoft",
    "microsoft365": "microsoft",
    "microsoft-365": "microsoft",
    "ms365": "microsoft",
    # Google variations - ALL map to "google" (what adapter uses for storage)
    "google workspace": "google",
    "googleworkspace": "google",
    "google-workspace": "google",
    "google_workspace": "google",
    "gsuite": "google",
    "g-suite": "google",
    # Keep canonical names as-is
    "microsoft": "microsoft",
    "google": "google",
}


def normalize_integration_name(name: str) -> str:
    """
    Normalize integration name to match storage format.

    The frontend may send various forms like 'microsoft 365' or 'Microsoft 365',
    but data is stored under canonical names like 'microsoft'.
    """
    normalized = name.lower().strip()
    return INTEGRATION_NAME_MAPPING.get(normalized, normalized)


# Pydantic models
class InstalledTool(BaseModel):
    """Installed tool information"""
    tool_id: int
    tool_name: str
    integration: str
    installed_at: str
    last_sync: Optional[str] = None
    sync_status: str
    data_count: int


class SyncRequest(BaseModel):
    """Data sync request"""
    wallet_address: str
    force: bool = False


class ToolData(BaseModel):
    """Tool data response"""
    integration: str
    data_type: str
    data: Dict[str, Any]
    last_updated: str
    encrypted: bool


@router.get("/installed")
async def get_installed_integrations(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's connected integrations based on OAuth tokens.

    This endpoint checks the OAuthToken table for active OAuth connections,
    which is where tokens are stored after successful OAuth flows.
    """
    try:
        logger.info(f"Getting installed integrations for wallet {wallet_address}")

        # Normalize wallet address
        user_address = wallet_address.lower()

        # Get all active OAuth tokens for this user
        tokens_result = await db.execute(
            select(OAuthToken)
            .where(
                and_(
                    OAuthToken.user_address == user_address,
                    OAuthToken.is_active == True,  # noqa: E712
                )
            )
        )
        oauth_tokens = tokens_result.scalars().all()

        installed_tools: list[dict[str, Any]] = []

        # Provider display names mapping
        provider_names = {
            "quickbooks": "QuickBooks",
            "google": "Google Workspace",
            "microsoft": "Microsoft 365",
            "slack": "Slack",
            "hubspot": "HubSpot",
            "salesforce": "Salesforce",
            "shopify": "Shopify",
            "zendesk": "Zendesk",
            "stripe": "Stripe",
            "monday": "Monday.com",
        }

        for token in oauth_tokens:
            # Determine sync status
            sync_status = "connected"
            needs_reauth = False
            if token.expires_at and token.expires_at < datetime.utcnow():
                sync_status = "expired"
                needs_reauth = True

            installed_tools.append(
                {
                    "tool_id": token.id,
                    "tool_name": provider_names.get(token.provider, token.provider.title()),
                    "integration": token.provider,
                    "installed_at": token.connected_at.isoformat() if token.connected_at else token.created_at.isoformat(),
                    "last_sync": token.last_sync_at.isoformat() if token.last_sync_at else None,
                    "sync_status": sync_status,
                    "needs_reauth": needs_reauth,
                    "data_count": 0,  # Would need to query Filecoin for actual count
                }
            )

        # Convert to the simple integrations format expected by frontend
        # NOTE: connected = True for any active token (is_active=True in database)
        # Token expiry just means they need to re-authenticate, but it's still "connected"
        integrations = [
            {
                "id": tool["tool_id"],
                "name": tool["tool_name"],
                "slug": tool["integration"],
                "connected": True,  # If token exists and is_active, it's connected
                "needs_reauth": tool["needs_reauth"],
            }
            for tool in installed_tools
        ]

        return {
            "success": True,
            "wallet_address": wallet_address,
            "integrations": integrations,
            "installed_tools": installed_tools,
            "count": len(installed_tools),
        }

    except Exception as e:
        logger.error(f"Failed to get installed integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tool}/sync")
async def sync_tool_data(
    tool: str,
    request: SyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger data sync for a tool

    This endpoint:
    1. Retrieves OAuth credentials from the database
    2. Calls the appropriate adapter (e.g., QuickBooks, Google, Microsoft)
    3. Fetches data from the external service
    4. Encrypts data with Lit Protocol
    5. Uploads to Filecoin/IPFS
    6. Updates RAG index

    Args:
        tool: Tool identifier (e.g., 'quickbooks', 'salesforce', 'google', 'microsoft', 'slack')
        request: Sync request with wallet_address

    Returns:
        Sync result with uploaded files
    """
    try:
        # Normalize integration name (e.g., "microsoft 365" -> "microsoft")
        normalized_tool = normalize_integration_name(tool)

        # CRITICAL: Normalize wallet address for consistent storage/retrieval
        normalized_wallet = normalize_wallet_address(request.wallet_address)

        logger.info(
            f"Syncing data for {tool} (normalized: {normalized_tool}), "
            f"wallet={normalized_wallet}, force={request.force}"
        )

        # Use normalized wallet and provider
        wallet_address = normalized_wallet
        provider = normalized_tool

        # Get OAuth token from database
        token_result = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == wallet_address,
                    OAuthToken.provider == provider,
                    OAuthToken.is_active == True  # noqa: E712
                )
            )
        )
        oauth_token = token_result.scalar_one_or_none()

        if not oauth_token:
            raise HTTPException(
                status_code=404,
                detail=f"No active OAuth connection found for {tool}. Please connect the integration first."
            )

        # Check if token is expired and try to refresh
        if oauth_token.expires_at and oauth_token.expires_at < datetime.utcnow():
            logger.info(f"OAuth token for {tool} is expired, attempting refresh...")

            refresh_success = await refresh_oauth_token(oauth_token, provider, db)

            if not refresh_success:
                logger.warning(f"Token refresh failed for {tool}, wallet {wallet_address}")
                raise HTTPException(
                    status_code=401,
                    detail=f"OAuth token for {tool} has expired and refresh failed. Please reconnect the integration."
                )

            logger.info(f"Token refreshed successfully for {tool}")

        # Get decrypted access token
        access_token = oauth_token.access_token
        if not access_token:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to decrypt OAuth token for {tool}"
            )

        # Build credentials dict
        credentials = {
            "access_token": access_token,
            "refresh_token": oauth_token.refresh_token,
        }

        # Add provider-specific fields
        if oauth_token.provider_data:
            credentials.update(oauth_token.provider_data)

        # Import and call appropriate adapter
        result = None

        if provider == "quickbooks":
            from app.adapters.quickbooks.sync import QuickBooksSync
            adapter = QuickBooksSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "google" or provider == "google_workspace":
            from app.adapters.google.sync import GoogleWorkspaceSync
            adapter = GoogleWorkspaceSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "microsoft":
            from app.adapters.microsoft.sync import MicrosoftSync
            adapter = MicrosoftSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "slack":
            from app.adapters.slack.sync import SlackSync
            adapter = SlackSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "hubspot":
            from app.adapters.hubspot.sync import HubSpotSync
            adapter = HubSpotSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "salesforce":
            from app.adapters.salesforce.sync import SalesforceSync
            adapter = SalesforceSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "shopify":
            from app.adapters.shopify.sync import ShopifySync
            adapter = ShopifySync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "zendesk":
            from app.adapters.zendesk.sync import ZendeskSync
            adapter = ZendeskSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "stripe":
            from app.adapters.stripe.sync import StripeSync
            adapter = StripeSync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "monday":
            from app.adapters.monday.sync import MondaySync
            adapter = MondaySync(credentials)
            result = await adapter.sync_data(request.wallet_address)

        else:
            raise HTTPException(
                status_code=404,
                detail=f"Integration '{tool}' not found or not yet supported"
            )

        # Update last_sync_at timestamp
        oauth_token.last_sync_at = datetime.utcnow()
        await db.commit()

        # =====================================================================
        # VERIFICATION: Confirm data was stored correctly in Pinata
        # =====================================================================
        verification_results = []
        if result and result.get("data"):
            for data_type, data_info in result.get("data", {}).items():
                if data_info.get("status") == "success" and data_info.get("cid"):
                    try:
                        # Verify the data can be retrieved from Pinata
                        verification = await filecoin_service.list_customer_files(
                            customer_wallet=wallet_address,
                            integration=normalized_tool,
                            data_type=data_type,
                            limit=1
                        )
                        if verification:
                            logger.info(
                                f"VERIFIED: {data_type} data stored and retrievable, "
                                f"CID={data_info['cid']}, wallet={wallet_address[:15]}..."
                            )
                            verification_results.append({
                                "data_type": data_type,
                                "cid": data_info["cid"],
                                "verified": True
                            })
                        else:
                            logger.error(
                                f"VERIFICATION FAILED: {data_type} data uploaded (CID={data_info['cid']}) "
                                f"but NOT retrievable! wallet={wallet_address[:15]}..."
                            )
                            verification_results.append({
                                "data_type": data_type,
                                "cid": data_info["cid"],
                                "verified": False,
                                "error": "Data uploaded but not retrievable from Pinata"
                            })
                    except Exception as e:
                        logger.error(
                            f"VERIFICATION ERROR for {data_type}: {str(e)}, "
                            f"CID={data_info['cid']}, wallet={wallet_address[:15]}..."
                        )
                        verification_results.append({
                            "data_type": data_type,
                            "cid": data_info.get("cid"),
                            "verified": False,
                            "error": str(e)
                        })

        # Index synced data in Qdrant for RAG queries
        rag_indexed_count = 0
        rag_failed_count = 0
        rag_status = "disabled" if rag_service is None else "healthy"
        rag_errors: List[str] = []

        # Only attempt RAG indexing if rag_service is available
        if rag_service is None:
            logger.warning(
                f"RAG service not available - data synced to Pinata but NOT indexed for AI queries. "
                f"Configure QDRANT_URL and QDRANT_API_KEY to enable RAG."
            )
            rag_status = "disabled"
            # Count how many data types could have been indexed
            if result and result.get("data"):
                for data_type, data_info in result.get("data", {}).items():
                    if data_info.get("status") == "success" and data_info.get("cid"):
                        rag_failed_count += 1
        elif result and result.get("data"):
            for data_type, data_info in result.get("data", {}).items():
                if data_info.get("status") != "success":
                    continue

                # Handle both old format (single cid) and new chunked format (dict of cids)
                cids_to_index = []
                if data_info.get("cid"):
                    # Old format: single CID
                    cids_to_index = [("latest", data_info["cid"])]
                elif data_info.get("chunks"):
                    # New chunked format: dict of chunk_id: cid pairs
                    cids_to_index = list(data_info["chunks"].items())

                # Check if adapter specifies RAG-enabled types
                # If adapter has should_index_in_rag(), use it to filter data types
                if hasattr(adapter, 'should_index_in_rag') and not adapter.should_index_in_rag(data_type):
                    logger.info(f"Skipping RAG indexing for {data_type} (not in RAG_ENABLED_TYPES)")
                    continue

                for chunk_id, cid in cids_to_index:
                    try:
                        # Retrieve the encrypted data from Pinata
                        encrypted = await filecoin_service.retrieve_data(cid)

                        # Decrypt the data
                        decrypted = await encryption_service.decrypt_with_wallet(
                            encrypted_data=encrypted,
                            customer_wallet=wallet_address
                        )

                        # Get the records from the decrypted data
                        records = decrypted.get("records", []) if isinstance(decrypted, dict) else []

                        # Index in Qdrant for RAG
                        await rag_service.index_business_data(
                            business_wallet=wallet_address,
                            cid=cid,
                            data=decrypted,
                            integration=normalized_tool,
                            data_type=data_type
                        )
                        rag_indexed_count += 1
                        logger.info(
                            f"RAG indexed {data_type}/{chunk_id} for {wallet_address[:10]}..., "
                            f"CID: {cid}, records: {len(records)}"
                        )
                    except Exception as e:
                        rag_failed_count += 1
                        error_msg = f"Failed to index {data_type}/{chunk_id}: {str(e)}"
                        rag_errors.append(error_msg)
                        logger.warning(f"Failed to index {data_type}/{chunk_id} in RAG: {e}")
                        # Don't fail the whole sync if RAG indexing fails
                        continue

        # Determine final RAG status
        if rag_service is None:
            rag_status = "disabled"
        elif rag_failed_count > 0 and rag_indexed_count == 0:
            rag_status = "error"
        elif rag_failed_count > 0:
            rag_status = "partial"
        else:
            rag_status = "healthy"

        logger.info(
            f"Sync complete for {tool}: {rag_indexed_count} data types indexed in RAG, "
            f"{rag_failed_count} failed, status={rag_status}"
        )

        # Build message with RAG status info
        if rag_status == "disabled":
            message = f"Data synced to storage but NOT indexed for AI queries (Qdrant not configured)"
        elif rag_failed_count > 0:
            message = f"Synced {tool} data. {rag_indexed_count} indexed for AI, {rag_failed_count} failed"
        else:
            message = f"Successfully synced {tool} data and indexed {rag_indexed_count} data types for AI queries"

        # Include verification info in response
        verified_count = sum(1 for v in verification_results if v.get("verified"))
        failed_verification = sum(1 for v in verification_results if not v.get("verified"))

        return {
            "success": True,
            "integration": tool,
            "wallet_address": request.wallet_address,
            "wallet_normalized": wallet_address,  # Show normalized wallet for debugging
            "sync_result": result,
            "verification": {
                "verified": verified_count,
                "failed": failed_verification,
                "details": verification_results
            },
            "rag_indexed": rag_indexed_count,
            "rag_failed": rag_failed_count,
            "rag_status": rag_status,
            "rag_errors": rag_errors[:5] if rag_errors else [],  # Limit to first 5 errors
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync failed for {tool}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{tool}/data")
async def get_tool_data(
    tool: str,
    wallet_address: str = Query(..., description="User's wallet address"),
    data_type: Optional[str] = Query(None, description="Specific data type (e.g., 'invoices')"),
    limit: int = Query(10000, description="Maximum results to return (default 10000 for full data)"),
    latest_only: bool = Query(True, description="Only return most recent data per type (faster)")
):
    """
    Retrieve tool data from Filecoin

    This endpoint:
    1. Queries Filecoin for files in the tool's folder
    2. Retrieves and decrypts the data
    3. Returns decrypted JSON

    Args:
        tool: Tool identifier
        wallet_address: User's wallet address
        data_type: Optional filter for specific data type
        limit: Maximum number of results
        latest_only: If True, only returns most recent file per data_type (default, much faster)

    Returns:
        Tool data (decrypted)
    """
    try:
        # Normalize integration name (e.g., "microsoft 365" -> "microsoft")
        normalized_tool = normalize_integration_name(tool)

        logger.info(
            f"Retrieving {tool} (normalized: {normalized_tool}) data for wallet {wallet_address}, "
            f"type={data_type}, limit={limit}, latest_only={latest_only}"
        )

        # List files for this integration using normalized name
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=normalized_tool,
            data_type=data_type,
            limit=limit
        )

        if not files:
            return {
                "success": True,
                "integration": tool,
                "data": [],
                "message": f"No data found for {tool}. Run sync first."
            }

        # If latest_only, group by data_type and keep only the most recent per type
        # This dramatically speeds up loading (4 files instead of 60+)
        if latest_only:
            files_by_type: Dict[str, Any] = {}
            for file in files:
                file_data_type = file.get("metadata", {}).get("data_type", "unknown")
                file_timestamp = file.get("timestamp", "")

                if file_data_type not in files_by_type:
                    files_by_type[file_data_type] = file
                else:
                    # Keep the more recent file
                    existing_timestamp = files_by_type[file_data_type].get("timestamp", "")
                    if file_timestamp > existing_timestamp:
                        files_by_type[file_data_type] = file

            files = list(files_by_type.values())
            logger.info(f"Filtered to {len(files)} latest files (one per data_type)")

        # Retrieve and decrypt files
        all_data = []
        for file in files:
            try:
                # Retrieve encrypted data
                encrypted = await filecoin_service.retrieve_data(file["cid"])

                # Decrypt with wallet
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=wallet_address
                )

                # Get data_type from metadata or file info
                file_data_type = file.get("metadata", {}).get("data_type") or file.get("data_type", "unknown")

                all_data.append({
                    "cid": file["cid"],
                    "data_type": file_data_type,
                    "data": decrypted,
                    "uploaded_at": file.get("timestamp", "")
                })

            except Exception as e:
                logger.warning(f"Failed to decrypt file {file.get('cid')}: {e}")
                continue

        return {
            "success": True,
            "integration": tool,
            "wallet_address": wallet_address,
            "data_count": len(all_data),
            "data": all_data[:limit]
        }

    except Exception as e:
        logger.error(f"Failed to get {tool} data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tool}/reindex")
async def reindex_tool_data(
    tool: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Re-index existing Pinata data in Qdrant for RAG queries.

    Use this endpoint to fix missing RAG data for integrations that were
    synced before RAG indexing was enabled.

    Args:
        tool: Tool identifier
        wallet_address: User's wallet address

    Returns:
        Reindexing result
    """
    try:
        # Normalize integration name
        normalized_tool = normalize_integration_name(tool)

        logger.info(
            f"Re-indexing {tool} (normalized: {normalized_tool}) data for wallet {wallet_address}"
        )

        # List all files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=normalized_tool,
            limit=100
        )

        if not files:
            return {
                "success": True,
                "integration": tool,
                "message": f"No data found for {tool}. Run sync first.",
                "indexed_count": 0
            }

        indexed_count = 0
        errors = []

        for file in files:
            try:
                cid = file.get("cid")
                data_type = file.get("metadata", {}).get("data_type", "unknown")

                # Retrieve and decrypt the data
                encrypted = await filecoin_service.retrieve_data(cid)
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=wallet_address
                )

                # Index in Qdrant
                await rag_service.index_business_data(
                    business_wallet=wallet_address,
                    cid=cid,
                    data=decrypted,
                    integration=normalized_tool,
                    data_type=data_type
                )
                indexed_count += 1
                logger.info(f"Re-indexed {data_type} for {wallet_address[:10]}..., CID: {cid}")

            except Exception as e:
                errors.append({"cid": file.get("cid"), "error": str(e)})
                logger.warning(f"Failed to re-index {file.get('cid')}: {e}")
                continue

        return {
            "success": True,
            "integration": tool,
            "wallet_address": wallet_address,
            "indexed_count": indexed_count,
            "total_files": len(files),
            "errors": errors if errors else None,
            "message": f"Re-indexed {indexed_count}/{len(files)} files for AI queries"
        }

    except Exception as e:
        logger.error(f"Re-indexing failed for {tool}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{tool}/schema")
async def get_tool_schema(tool: str):
    """
    Get data schema for a tool

    Returns the structure of data returned by this integration,
    useful for the AI to understand what queries it can answer.

    Args:
        tool: Tool identifier

    Returns:
        Data schema and sample queries
    """
    try:
        schemas = {
            "quickbooks": {
                "integration": "quickbooks",
                "data_types": {
                    "invoices": {
                        "fields": ["id", "amount", "customer", "date", "status", "due_date"],
                        "sample_queries": [
                            "What invoices are overdue?",
                            "Show me unpaid invoices",
                            "What's my total revenue this month?"
                        ]
                    },
                    "expenses": {
                        "fields": ["id", "amount", "vendor", "category", "date"],
                        "sample_queries": [
                            "What are my biggest expenses?",
                            "Show expenses by category",
                            "What did I spend on software this month?"
                        ]
                    },
                    "customers": {
                        "fields": ["id", "name", "email", "total_invoiced"],
                        "sample_queries": [
                            "Who are my top customers?",
                            "List all customers",
                            "Which customers owe money?"
                        ]
                    }
                }
            },
            "salesforce": {
                "integration": "salesforce",
                "data_types": {
                    "leads": {
                        "fields": ["id", "name", "email", "status", "source"],
                        "sample_queries": [
                            "Show new leads",
                            "What's my lead conversion rate?",
                            "Which leads need follow-up?"
                        ]
                    },
                    "opportunities": {
                        "fields": ["id", "name", "amount", "stage", "close_date"],
                        "sample_queries": [
                            "What deals are closing this month?",
                            "Show my sales pipeline",
                            "What's my win rate?"
                        ]
                    }
                }
            }
        }

        if tool not in schemas:
            raise HTTPException(status_code=404, detail=f"Schema for '{tool}' not found")

        return {
            "success": True,
            **schemas[tool]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{tool}/data")
async def delete_tool_data(
    tool: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Delete all data for a tool integration

    This unpins all files from Filecoin/IPFS for this integration.

    Args:
        tool: Tool identifier
        wallet_address: User's wallet address

    Returns:
        Deletion result
    """
    try:
        # Normalize integration name (e.g., "microsoft 365" -> "microsoft")
        normalized_tool = normalize_integration_name(tool)

        logger.info(f"Deleting {tool} (normalized: {normalized_tool}) data for wallet {wallet_address}")

        # List all files for this integration using normalized name
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=normalized_tool,
            limit=1000
        )

        # Unpin each file
        deleted_count = 0
        for file in files:
            try:
                success = await filecoin_service.unpin_file(file["cid"])
                if success:
                    deleted_count += 1
            except Exception as e:
                logger.warning(f"Failed to delete {file['cid']}: {e}")

        return {
            "success": True,
            "integration": tool,
            "wallet_address": wallet_address,
            "files_deleted": deleted_count,
            "message": f"Deleted {deleted_count} files for {tool}"
        }

    except Exception as e:
        logger.error(f"Failed to delete {tool} data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{provider}")
async def disconnect_integration(
    provider: str,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Disconnect an integration completely.

    This removes:
    1. OAuth token from database (sets is_active = False)
    2. OAuth credentials stored in Filecoin
    3. All synced data for this integration

    Args:
        provider: Integration provider name (google, microsoft, quickbooks, etc.)
        wallet_address: User's wallet address

    Returns:
        Disconnection result
    """
    try:
        # Normalize integration name
        normalized_provider = normalize_integration_name(provider)
        user_address = wallet_address.lower()

        logger.info(f"Disconnecting {provider} (normalized: {normalized_provider}) for wallet {wallet_address}")

        total_deleted = 0
        token_deactivated = False

        # 1. Deactivate OAuth token in database
        try:
            token_result = await db.execute(
                select(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == user_address,
                        OAuthToken.provider == normalized_provider,
                        OAuthToken.is_active == True  # noqa: E712
                    )
                )
            )
            oauth_token = token_result.scalar_one_or_none()

            if oauth_token:
                oauth_token.is_active = False
                await db.commit()
                token_deactivated = True
                logger.info(f"Deactivated OAuth token for {provider}")
        except Exception as e:
            logger.warning(f"Error deactivating OAuth token: {e}")

        # 2. Delete OAuth credentials from Filecoin
        try:
            oauth_files = await filecoin_service.list_customer_files(
                customer_wallet=wallet_address,
                integration=normalized_provider,
                data_type="oauth-credentials",
                limit=100
            )
            for file in oauth_files:
                try:
                    await filecoin_service.unpin_file(file["cid"])
                    total_deleted += 1
                except Exception as e:
                    logger.warning(f"Failed to delete OAuth credential {file['cid']}: {e}")
        except Exception as e:
            logger.warning(f"Error listing OAuth credentials: {e}")

        # 3. Delete all synced data from Filecoin
        try:
            data_files = await filecoin_service.list_customer_files(
                customer_wallet=wallet_address,
                integration=normalized_provider,
                limit=1000
            )
            for file in data_files:
                try:
                    await filecoin_service.unpin_file(file["cid"])
                    total_deleted += 1
                except Exception as e:
                    logger.warning(f"Failed to delete data file {file['cid']}: {e}")
        except Exception as e:
            logger.warning(f"Error listing data files: {e}")

        logger.info(f"Disconnected {provider} for wallet {wallet_address}, token_deactivated={token_deactivated}, deleted {total_deleted} files")

        return {
            "success": True,
            "provider": provider,
            "wallet_address": wallet_address,
            "token_deactivated": token_deactivated,
            "files_deleted": total_deleted,
            "message": f"Successfully disconnected {provider}"
        }

    except Exception as e:
        logger.error(f"Failed to disconnect {provider}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SLACK-SPECIFIC ENDPOINTS
# ============================================================================

class SlackMessageRequest(BaseModel):
    """Slack message send request"""
    wallet_address: str
    channel: str
    text: str
    thread_ts: Optional[str] = None
    reply_broadcast: bool = False


class SlackReactionRequest(BaseModel):
    """Slack reaction request"""
    wallet_address: str
    channel: str
    timestamp: str
    emoji: str


@router.post("/slack/messages")
async def send_slack_message(
    request: SlackMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to a Slack channel
    """
    try:
        from app.adapters.slack.sync import SlackSync

        # Get OAuth token for this user
        user_address = request.wallet_address.lower()
        token_result = await db.execute(
            select(OAuthToken)
            .where(
                and_(
                    OAuthToken.user_address == user_address,
                    OAuthToken.provider == "slack",
                    OAuthToken.is_active == True,  # noqa: E712
                )
            )
        )
        oauth_token = token_result.scalar_one_or_none()

        if not oauth_token:
            raise HTTPException(status_code=404, detail="Slack not connected")

        # Decrypt credentials
        credentials = await encryption_service.decrypt_oauth_token(
            encrypted_token=oauth_token.encrypted_token,
            customer_wallet=user_address
        )

        # Initialize Slack adapter
        slack = SlackSync(credentials)

        # Send message
        result = await slack.send_message(
            channel=request.channel,
            text=request.text,
            thread_ts=request.thread_ts,
            reply_broadcast=request.reply_broadcast
        )

        return {
            "success": True,
            "data": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send Slack message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slack/reactions")
async def add_slack_reaction(
    request: SlackReactionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Add a reaction to a Slack message
    """
    try:
        from app.adapters.slack.sync import SlackSync

        # Get OAuth token for this user
        user_address = request.wallet_address.lower()
        token_result = await db.execute(
            select(OAuthToken)
            .where(
                and_(
                    OAuthToken.user_address == user_address,
                    OAuthToken.provider == "slack",
                    OAuthToken.is_active == True,  # noqa: E712
                )
            )
        )
        oauth_token = token_result.scalar_one_or_none()

        if not oauth_token:
            raise HTTPException(status_code=404, detail="Slack not connected")

        # Decrypt credentials
        credentials = await encryption_service.decrypt_oauth_token(
            encrypted_token=oauth_token.encrypted_token,
            customer_wallet=user_address
        )

        # Initialize Slack adapter
        slack = SlackSync(credentials)

        # Add reaction
        result = await slack.add_reaction(
            channel=request.channel,
            timestamp=request.timestamp,
            emoji=request.emoji.strip(':')  # Remove colons if present
        )

        return {
            "success": True,
            "data": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add Slack reaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slack/threads/{channel}/{thread_ts}")
async def get_slack_thread(
    channel: str,
    thread_ts: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Get replies in a Slack thread
    """
    try:
        from app.adapters.slack.sync import SlackSync

        # Get OAuth token for this user
        user_address = wallet_address.lower()
        token_result = await db.execute(
            select(OAuthToken)
            .where(
                and_(
                    OAuthToken.user_address == user_address,
                    OAuthToken.provider == "slack",
                    OAuthToken.is_active == True,  # noqa: E712
                )
            )
        )
        oauth_token = token_result.scalar_one_or_none()

        if not oauth_token:
            raise HTTPException(status_code=404, detail="Slack not connected")

        # Decrypt credentials
        credentials = await encryption_service.decrypt_oauth_token(
            encrypted_token=oauth_token.encrypted_token,
            customer_wallet=user_address
        )

        # Initialize Slack adapter
        slack = SlackSync(credentials)

        # Get thread replies
        result = await slack.get_thread_replies(
            channel=channel,
            thread_ts=thread_ts
        )

        return {
            "success": True,
            "data": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Slack thread: {e}")
        raise HTTPException(status_code=500, detail=str(e))
