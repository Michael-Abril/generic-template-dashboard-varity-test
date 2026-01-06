"""
Integrations API Endpoints - Tool Data Sync and Retrieval

This module provides endpoints for managing tool integrations,
syncing data from external services, and retrieving stored data.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timezone, timedelta
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

import httpx

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService, normalize_wallet_address
from app.services.rag_service import BusinessRAGService
from app.services.mcp_ingestion_service import MCPIngestionService, DATA_ROUTING_RULES
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

    Security Note (YELLOW-001):
        Uses OAuthToken.auth_context to verify caller is authorized
        to access this token's refresh_token for the refresh operation.
    """
    if provider not in TOKEN_REFRESH_CONFIGS:
        logger.warning(f"No refresh config for provider: {provider}")
        return False

    # YELLOW-001 FIX: Use auth context to access tokens securely
    # Wrap all token access operations in auth context
    with OAuthToken.auth_context(oauth_token.user_address):
        # Diagnostic logging for token refresh debugging
        logger.info(
            f"Attempting token refresh for {provider}:\n"
            f"  User: {oauth_token.user_address[:10]}...\n"
            f"  Has refresh_token: {bool(oauth_token.refresh_token)}\n"
            f"  Refresh token length: {len(oauth_token.refresh_token) if oauth_token.refresh_token else 0}\n"
            f"  Token expires_at: {oauth_token.expires_at}\n"
            f"  Last refreshed: {oauth_token.last_refreshed_at}"
        )

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
                    # Parse detailed error from OAuth provider
                    try:
                        error_data = response.json()
                        error_code = error_data.get("error", "unknown")
                        error_desc = error_data.get("error_description", "No description")

                        logger.error(
                            f"Token refresh failed for {provider}:\n"
                            f"  HTTP Status: {response.status_code}\n"
                            f"  Error Code: {error_code}\n"
                            f"  Error Description: {error_desc}\n"
                            f"  User: {oauth_token.user_address[:10]}..."
                        )

                        # Common OAuth errors:
                        # - invalid_grant: Refresh token revoked, expired, or never issued
                        # - invalid_client: Wrong client_id or client_secret
                        # - invalid_scope: Requested scope changed
                        # - unauthorized_client: App not authorized
                        if error_code == "invalid_grant":
                            logger.warning(
                                f"DIAGNOSTIC: {provider} refresh token is invalid. "
                                f"Possible causes:\n"
                                f"  1. User revoked access in their account settings\n"
                                f"  2. App is in 'Testing' mode and token expired (7-day limit)\n"
                                f"  3. refresh_token was never stored (check if null)\n"
                                f"  4. Token was rotated but old one sent\n"
                                f"User must reconnect the integration."
                            )
                    except Exception as parse_error:
                        logger.error(f"Token refresh failed for {provider}: {response.text} (parse error: {parse_error})")

                    return False

                token_data = response.json()

                # Update the token in the database
                oauth_token.access_token = token_data.get("access_token")

                # Some providers return a new refresh token
                if token_data.get("refresh_token"):
                    oauth_token.refresh_token = token_data.get("refresh_token")

                # Update expiration
                # CRITICAL FIX (Jan 4, 2026): Use timezone-naive datetimes to match
                # OAuthToken model's DateTime columns (not DateTime(timezone=True))
                # This fixes: "can't subtract offset-naive and offset-aware datetimes"
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

    This endpoint:
    1. Checks the OAuthToken table for active OAuth connections
    2. Queries Pinata for RAG data count per integration
    3. Gets live API configurations from Redis
    4. Returns comprehensive data_by_type showing RAG vs LIVE vs HYBRID

    FIXED January 5, 2026: Replaced hardcoded data_count: 0 with actual data.
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

        # Initialize services for data counting
        filecoin_service = FilecoinService()

        # Get live API configs from Redis (for all integrations)
        live_configs = await MCPIngestionService.get_live_api_configs(user_address)

        for token in oauth_tokens:
            provider = token.provider

            # Determine sync status
            sync_status = "connected"
            needs_reauth = False
            # Use timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)
            if token.expires_at:
                # Ensure token.expires_at is timezone-aware before comparison
                expires_at = token.expires_at
                if expires_at.tzinfo is None:
                    # If naive, assume UTC
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at < now:
                    sync_status = "expired"
                    needs_reauth = True

            # Get RAG data count from Pinata (files stored in decentralized storage)
            rag_data_count = 0
            try:
                files = await filecoin_service.list_customer_files(
                    customer_wallet=user_address,
                    integration=provider,
                    limit=1000  # Get count of all files
                )
                # Filter out OAuth credentials
                rag_data_count = len([
                    f for f in files
                    if f.get("metadata", {}).get("data_type") != "oauth-credentials"
                ])
            except Exception as e:
                logger.warning(f"Could not count RAG files for {provider}: {e}")

            # Build data_by_type based on routing rules
            routing_rules = DATA_ROUTING_RULES.get(provider, {})
            provider_live_configs = live_configs.get("configs", {}).get(provider, {})

            data_by_type = {}
            for data_type, destination in routing_rules.items():
                if destination.value == "rag":
                    data_by_type[data_type] = {
                        "source": "rag",
                        "available": rag_data_count > 0,
                        "synced": rag_data_count > 0,
                    }
                elif destination.value == "live":
                    live_config = provider_live_configs.get(data_type, {})
                    data_by_type[data_type] = {
                        "source": "live_api",
                        "available": not needs_reauth,  # Live API only available if token valid
                        "endpoint": live_config.get("endpoint", f"/api/v1/integrations/{provider}/{data_type}"),
                    }
                elif destination.value == "hybrid":
                    live_config = provider_live_configs.get(data_type, {})
                    data_by_type[data_type] = {
                        "source": "hybrid",
                        "rag_available": rag_data_count > 0,
                        "live_available": not needs_reauth,
                        "endpoint": live_config.get("endpoint"),
                    }

            # Total data count: RAG files + count live endpoints as "available"
            live_endpoint_count = len([
                dt for dt, dest in routing_rules.items()
                if dest.value in ("live", "hybrid") and not needs_reauth
            ])
            total_data_count = rag_data_count + live_endpoint_count

            installed_tools.append(
                {
                    "tool_id": token.id,
                    "tool_name": provider_names.get(provider, provider.title()),
                    "integration": provider,
                    "installed_at": token.connected_at.isoformat() if token.connected_at else token.created_at.isoformat(),
                    "last_sync": token.last_sync_at.isoformat() if token.last_sync_at else None,
                    "sync_status": sync_status,
                    "needs_reauth": needs_reauth,
                    "data_count": total_data_count,
                    "rag_file_count": rag_data_count,
                    "live_endpoint_count": live_endpoint_count,
                    "data_by_type": data_by_type,
                }
            )

        # Convert to the simple integrations format expected by frontend
        # FIXED (Jan 5, 2026): connected should be False if token expired
        # Google APIs work even with expired tokens because backend auto-refreshes
        # But UI should show "not connected" to prompt user to reconnect if refresh fails
        integrations = [
            {
                "id": tool["tool_id"],
                "name": tool["tool_name"],
                "slug": tool["integration"],
                "connected": not tool["needs_reauth"],  # False if expired, True if valid
                "needs_reauth": tool["needs_reauth"],
                "data_count": tool["data_count"],
            }
            for tool in installed_tools
        ]

        return {
            "success": True,
            "wallet_address": wallet_address,
            "integrations": integrations,
            "installed_tools": installed_tools,
            "count": len(installed_tools),
            "redis_available": live_configs.get("redis_available", False),
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
        # Use timezone-aware datetime for comparison
        now = datetime.now(timezone.utc)
        if oauth_token.expires_at:
            # Ensure expires_at is timezone-aware before comparison
            expires_at = oauth_token.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            # PROACTIVE REFRESH: Refresh 5 minutes BEFORE expiration to prevent failures
            refresh_buffer = timedelta(minutes=5)
            should_refresh = expires_at < (now + refresh_buffer)
        else:
            should_refresh = False

        if should_refresh:
            logger.info(f"OAuth token for {tool} is expired, attempting refresh...")

            refresh_success = await refresh_oauth_token(oauth_token, provider, db)

            if not refresh_success:
                logger.warning(f"Token refresh failed for {tool}, wallet {wallet_address}")
                raise HTTPException(
                    status_code=401,
                    detail=f"OAuth token for {tool} has expired and refresh failed. Please reconnect the integration."
                )

            logger.info(f"Token refreshed successfully for {tool}")

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(wallet_address):
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

        # =====================================================================
        # MCP PIPELINE SYNC (January 5, 2026)
        # Legacy adapters deleted - now using MCP ingestion service exclusively
        # =====================================================================
        from app.services.mcp_ingestion_service import get_mcp_ingestion_service

        mcp_service = get_mcp_ingestion_service()

        # Check if integration is MCP-enabled
        mcp_integrations = {"google", "slack", "quickbooks", "microsoft", "salesforce", "hubspot"}

        if provider not in mcp_integrations:
            raise HTTPException(
                status_code=404,
                detail=f"Integration '{tool}' not found or not yet supported"
            )

        # Sync via MCP pipeline (handles encryption, routing, L3 commits)
        result = await mcp_service.sync_integration_data(
            integration=provider,
            wallet_address=normalized_wallet,
            oauth_token=access_token,
            data_types=request.data_types if hasattr(request, 'data_types') else None
        )

        # Update last_sync_at timestamp
        # Use timezone-naive datetime to match OAuthToken model's DateTime column
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

                # CRITICAL FIX (Jan 5, 2026): Legacy adapter check removed
                # Now using MCP pipeline - all data types should be indexed unless explicitly excluded
                # Skip OAuth credentials which should never be indexed
                if data_type == "oauth-credentials":
                    logger.info(f"Skipping RAG indexing for {data_type} (credentials should not be indexed)")
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
    limit: int = Query(1000, description="Maximum results to return (max 1000, Pinata limit)"),
    latest_only: bool = Query(False, description="Return all data per type (set True for faster but incomplete loading)")
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
        latest_only: If True, only returns most recent file per data_type (faster but incomplete)

    Returns:
        Tool data (decrypted)
    """
    try:
        # Normalize integration name (e.g., "microsoft 365" -> "microsoft")
        normalized_tool = normalize_integration_name(tool)

        # CRITICAL: Normalize wallet address to match how data was stored during sync
        normalized_wallet = normalize_wallet_address(wallet_address)

        logger.info(
            f"Retrieving {tool} (normalized: {normalized_tool}) data for wallet {wallet_address} "
            f"(normalized: {normalized_wallet}), type={data_type}, limit={limit}, latest_only={latest_only}"
        )

        # List files for this integration using normalized wallet and tool name
        files = await filecoin_service.list_customer_files(
            customer_wallet=normalized_wallet,
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

                # Decrypt with normalized wallet (must match encryption key)
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=normalized_wallet
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

        # CRITICAL: Normalize wallet address for consistent storage/retrieval
        normalized_wallet = normalize_wallet_address(wallet_address)

        logger.info(
            f"Re-indexing {tool} (normalized: {normalized_tool}) data for wallet {wallet_address} (normalized: {normalized_wallet})"
        )

        # List all files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=normalized_wallet,
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
                    customer_wallet=normalized_wallet
                )

                # Index in Qdrant
                await rag_service.index_business_data(
                    business_wallet=normalized_wallet,
                    cid=cid,
                    data=decrypted,
                    integration=normalized_tool,
                    data_type=data_type
                )
                indexed_count += 1
                logger.info(f"Re-indexed {data_type} for {normalized_wallet[:10]}..., CID: {cid}")

            except Exception as e:
                errors.append({"cid": file.get("cid"), "error": str(e)})
                logger.warning(f"Failed to re-index {file.get('cid')}: {e}")
                continue

        return {
            "success": True,
            "integration": tool,
            "wallet_address": normalized_wallet,
            "indexed_count": indexed_count,
            "total_files": len(files),
            "errors": errors if errors else None,
            "message": f"Re-indexed {indexed_count}/{len(files)} files for AI queries"
        }

    except Exception as e:
        logger.error(f"Re-indexing failed for {tool}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tool}/force-reindex")
async def force_reindex_tool_data(
    tool: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Force re-index ALL data for an integration with NEW embeddings.

    CRITICAL: Use this endpoint when the embedding model has changed.
    The Dec 28 2025 model change from m2-bert-80M-8k-retrieval to BAAI/bge-base-en-v1.5
    requires all documents to be re-embedded for queries to work.

    This endpoint:
    1. Retrieves all files from Pinata for this integration
    2. DELETES existing Qdrant points for each CID
    3. Generates NEW embeddings with current model
    4. Stores new points in Qdrant

    Args:
        tool: Tool identifier (e.g., 'google', 'quickbooks')
        wallet_address: User's wallet address

    Returns:
        Force re-indexing result with count and any errors
    """
    try:
        # Normalize integration name
        normalized_tool = normalize_integration_name(tool)

        # CRITICAL: Normalize wallet address for consistent storage/retrieval
        normalized_wallet = normalize_wallet_address(wallet_address)

        logger.info(
            f"Force re-indexing {tool} (normalized: {normalized_tool}) data for wallet {wallet_address} "
            f"(normalized: {normalized_wallet}) with model {rag_service.get_embedding_model()}"
        )

        # List all files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=normalized_wallet,
            integration=normalized_tool,
            limit=100
        )

        if not files:
            return {
                "success": True,
                "integration": tool,
                "message": f"No data found for {tool}. Run sync first.",
                "indexed_count": 0,
                "embedding_model": rag_service.get_embedding_model()
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
                    customer_wallet=normalized_wallet
                )

                # Force re-index in Qdrant (deletes old, creates new with current embedding model)
                await rag_service.force_reindex_business_data(
                    business_wallet=normalized_wallet,
                    cid=cid,
                    data=decrypted,
                    integration=normalized_tool,
                    data_type=data_type
                )
                indexed_count += 1
                logger.info(f"Force re-indexed {data_type} for {normalized_wallet[:10]}..., CID: {cid}")

            except Exception as e:
                errors.append({"cid": file.get("cid"), "error": str(e)})
                logger.warning(f"Failed to force re-index {file.get('cid')}: {e}")
                continue

        return {
            "success": True,
            "integration": tool,
            "wallet_address": normalized_wallet,
            "indexed_count": indexed_count,
            "total_files": len(files),
            "embedding_model": rag_service.get_embedding_model(),
            "errors": errors if errors else None,
            "message": f"Force re-indexed {indexed_count}/{len(files)} files with new embeddings"
        }

    except Exception as e:
        logger.error(f"Force re-indexing failed for {tool}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force-reindex-all")
async def force_reindex_all_data(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Force re-index ALL data across ALL integrations with NEW embeddings.

    CRITICAL: Use this endpoint when the embedding model has changed.
    This will re-embed all documents for all integrations.

    WARNING: This can be slow for accounts with lots of data.

    Args:
        wallet_address: User's wallet address

    Returns:
        Force re-indexing result with count per integration
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        logger.info(
            f"Force re-indexing ALL data for wallet {normalized_wallet[:10]}... "
            f"with model {rag_service.get_embedding_model()}"
        )

        # List all files for this wallet (no integration filter)
        files = await filecoin_service.list_customer_files(
            customer_wallet=normalized_wallet,
            limit=500  # Higher limit for all integrations
        )

        if not files:
            return {
                "success": True,
                "message": "No data found. Sync some integrations first.",
                "indexed_count": 0,
                "embedding_model": rag_service.get_embedding_model()
            }

        indexed_count = 0
        errors = []
        integrations_processed = set()

        for file in files:
            try:
                cid = file.get("cid")
                metadata = file.get("metadata", {})
                integration = metadata.get("integration", "unknown")
                data_type = metadata.get("data_type", "unknown")
                integrations_processed.add(integration)

                # Retrieve and decrypt the data
                encrypted = await filecoin_service.retrieve_data(cid)
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=normalized_wallet
                )

                # Force re-index in Qdrant
                await rag_service.force_reindex_business_data(
                    business_wallet=normalized_wallet,
                    cid=cid,
                    data=decrypted,
                    integration=integration,
                    data_type=data_type
                )
                indexed_count += 1
                logger.info(f"Force re-indexed {integration}/{data_type} CID: {cid[:20]}...")

            except Exception as e:
                errors.append({"cid": file.get("cid"), "error": str(e)})
                logger.warning(f"Failed to force re-index {file.get('cid')}: {e}")
                continue

        return {
            "success": True,
            "wallet_address": normalized_wallet,
            "indexed_count": indexed_count,
            "total_files": len(files),
            "integrations_processed": list(integrations_processed),
            "embedding_model": rag_service.get_embedding_model(),
            "errors": errors if errors else None,
            "message": f"Force re-indexed {indexed_count}/{len(files)} files across {len(integrations_processed)} integrations"
        }

    except Exception as e:
        logger.error(f"Force re-indexing all failed: {e}")
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
    4. All RAG-indexed data for this integration from Qdrant

    Args:
        provider: Integration provider name (google, microsoft, quickbooks, etc.)
        wallet_address: User's wallet address

    Returns:
        Disconnection result
    """
    try:
        # Normalize integration name
        normalized_provider = normalize_integration_name(provider)
        # CRITICAL: Use normalize_wallet_address for consistency across all code paths
        # Some tokens may be stored with normalize_wallet_address, others with .lower()
        normalized_wallet = normalize_wallet_address(wallet_address)
        user_address = normalized_wallet  # Use normalized address for database queries

        logger.info(f"Disconnecting {provider} (normalized: {normalized_provider}) for wallet {normalized_wallet}")

        total_deleted = 0
        token_deactivated = False
        rag_deleted = 0
        debug_counts = {"all": 0, "provider": 0, "active": 0, "select_results": []}  # For debugging

        # 1. DELETE OAuth tokens from database (not just deactivate)
        # This avoids unique constraint violations from previous inactive tokens
        try:
            # DEBUG: First count ALL tokens for this wallet (ignoring filters)
            from sqlalchemy import func, delete
            debug_result = await db.execute(
                select(func.count()).select_from(OAuthToken).where(
                    OAuthToken.user_address == user_address
                )
            )
            all_tokens_count = debug_result.scalar()
            debug_counts["all"] = all_tokens_count
            logger.info(f"DEBUG: Found {all_tokens_count} total tokens for wallet {user_address}")

            # DEBUG: Count tokens for this provider specifically
            provider_result = await db.execute(
                select(func.count()).select_from(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == user_address,
                        OAuthToken.provider == normalized_provider
                    )
                )
            )
            provider_tokens_count = provider_result.scalar()
            debug_counts["provider"] = provider_tokens_count
            logger.info(f"DEBUG: Found {provider_tokens_count} tokens for provider {normalized_provider}")

            # DEBUG: Count active tokens for this provider
            active_result = await db.execute(
                select(func.count()).select_from(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == user_address,
                        OAuthToken.provider == normalized_provider,
                        OAuthToken.is_active == True  # noqa: E712
                    )
                )
            )
            active_tokens_count = active_result.scalar()
            debug_counts["active"] = active_tokens_count
            logger.info(f"DEBUG: Found {active_tokens_count} ACTIVE tokens for provider {normalized_provider}")

            # CRITICAL FIX: Delete ALL tokens (active + inactive) for this provider
            # This prevents unique constraint violations from previous disconnects
            tokens_deleted = 0

            # First try with normalized address
            delete_result = await db.execute(
                delete(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == user_address,
                        OAuthToken.provider == normalized_provider
                    )
                )
            )
            tokens_deleted = delete_result.rowcount

            # Also try legacy address format if different
            legacy_address = wallet_address.lower()
            if legacy_address != user_address:
                logger.info(f"Also deleting tokens for legacy address format")
                legacy_delete = await db.execute(
                    delete(OAuthToken).where(
                        and_(
                            OAuthToken.user_address == legacy_address,
                            OAuthToken.provider == normalized_provider
                        )
                    )
                )
                tokens_deleted += legacy_delete.rowcount

            if tokens_deleted > 0:
                await db.commit()
                token_deactivated = True
                debug_counts["deleted_token_count"] = tokens_deleted
                logger.info(f"Disconnect: Successfully DELETED {tokens_deleted} token(s) for {provider}")
            else:
                logger.warning(f"Disconnect: No OAuth tokens found for {provider} with wallet {user_address}")
        except Exception as e:
            debug_counts["exception"] = str(e)
            logger.error(f"Failed to delete OAuth token for {provider}: {e}", exc_info=True)
            await db.rollback()  # Rollback on error to prevent partial state

        # 2. Delete OAuth credentials from Filecoin
        try:
            oauth_files = await filecoin_service.list_customer_files(
                customer_wallet=normalized_wallet,
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

        # 3. Delete all synced data from Filecoin AND track CIDs for RAG cleanup
        cids_to_delete_from_rag = []
        try:
            data_files = await filecoin_service.list_customer_files(
                customer_wallet=normalized_wallet,
                integration=normalized_provider,
                limit=1000
            )
            for file in data_files:
                try:
                    cids_to_delete_from_rag.append(file["cid"])
                    await filecoin_service.unpin_file(file["cid"])
                    total_deleted += 1
                except Exception as e:
                    logger.warning(f"Failed to delete data file {file['cid']}: {e}")
        except Exception as e:
            logger.warning(f"Error listing data files: {e}")

        # 4. Delete RAG-indexed data from Qdrant for this integration
        # This ensures the AI Assistant and Context Picker don't show stale data
        if rag_service is not None:
            try:
                # Delete each CID from RAG
                for cid in cids_to_delete_from_rag:
                    try:
                        await rag_service.delete_point_by_cid(normalized_wallet, cid)
                        rag_deleted += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete RAG point for CID {cid}: {e}")

                # Also delete any RAG data by integration filter in case CIDs were missed
                try:
                    await rag_service.delete_by_integration(normalized_wallet, normalized_provider)
                    logger.info(f"Deleted RAG data for integration {normalized_provider}")
                except AttributeError:
                    # delete_by_integration may not exist yet - that's OK
                    pass
                except Exception as e:
                    logger.warning(f"Error deleting RAG data by integration: {e}")

                logger.info(f"Deleted {rag_deleted} RAG points for {provider}")
            except Exception as e:
                logger.warning(f"Error cleaning up RAG data: {e}")
        else:
            logger.info("RAG service not available, skipping RAG cleanup")

        logger.info(f"Disconnected {provider} for wallet {wallet_address}, token_deactivated={token_deactivated}, deleted {total_deleted} files, {rag_deleted} RAG points")

        # Include debug counts in response for troubleshooting
        response = {
            "success": True,
            "provider": provider,
            "wallet_address": wallet_address,
            "token_deactivated": token_deactivated,
            "files_deleted": total_deleted,
            "rag_points_deleted": rag_deleted,
            "message": f"Successfully disconnected {provider}"
        }

        # Add debug info if token was not found (helps diagnose issues)
        if not token_deactivated:
            response["debug_info"] = {
                "normalized_provider": normalized_provider,
                "normalized_wallet": normalized_wallet,
                "token_counts": debug_counts,
                "note": "Token not found - counts show how many tokens exist in DB"
            }

        return response

    except Exception as e:
        logger.error(f"Failed to disconnect {provider}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SLACK-SPECIFIC ENDPOINTS
# ============================================================================

async def slack_api_call(
    method: str,
    endpoint: str,
    access_token: str,
    json_data: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Direct Slack API call using httpx.

    Args:
        method: HTTP method (GET or POST)
        endpoint: Slack API endpoint (e.g., "chat.postMessage")
        access_token: OAuth access token
        json_data: JSON body for POST requests
        params: Query parameters for GET requests

    Returns:
        Slack API response as dict

    Raises:
        HTTPException: If Slack API returns an error
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        url = f"https://slack.com/api/{endpoint}"

        try:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            else:
                response = await client.post(url, headers=headers, json=json_data)

            data = response.json()

            # Slack API returns ok=false on errors
            if not data.get("ok"):
                error_msg = data.get("error", "Unknown Slack API error")
                logger.error(f"Slack API error: {error_msg}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Slack API error: {error_msg}"
                )

            return data

        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling Slack API: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to call Slack API: {str(e)}"
            )


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
    Send a message to a Slack channel via direct Slack API
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            payload = {
                "channel": request.channel,
                "text": request.text
            }

            if request.thread_ts:
                payload["thread_ts"] = request.thread_ts
                if request.reply_broadcast:
                    payload["reply_broadcast"] = request.reply_broadcast

            result = await slack_api_call(
                method="POST",
                endpoint="chat.postMessage",
                access_token=access_token,
                json_data=payload
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
    Add a reaction to a Slack message via direct Slack API
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            payload = {
                "channel": request.channel,
                "timestamp": request.timestamp,
                "name": request.emoji.strip(':')  # Remove colons if present
            }

            result = await slack_api_call(
                method="POST",
                endpoint="reactions.add",
                access_token=access_token,
                json_data=payload
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
    Get replies in a Slack thread via direct Slack API
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            params = {
                "channel": channel,
                "ts": thread_ts
            }

            result = await slack_api_call(
                method="GET",
                endpoint="conversations.replies",
                access_token=access_token,
                params=params
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


@router.get("/slack/channels")
async def get_slack_channels(
    wallet_address: str = Query(...),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get channels via live Slack API (not from Pinata sync).
    This is the recommended way to fetch channels for display.
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            params = {
                "limit": limit,
                "exclude_archived": True
            }

            result = await slack_api_call(
                method="GET",
                endpoint="conversations.list",
                access_token=access_token,
                params=params
            )

            channels = result.get("channels", [])

            return {
                "success": True,
                "channels": channels,
                "count": len(channels)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Slack channels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slack/messages")
async def get_slack_messages(
    wallet_address: str = Query(...),
    channel: str = Query(..., description="Channel ID to fetch messages from"),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get messages for a specific channel via live Slack API.
    This is the recommended way to fetch messages for display.
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            params = {
                "channel": channel,
                "limit": limit
            }

            result = await slack_api_call(
                method="GET",
                endpoint="conversations.history",
                access_token=access_token,
                params=params
            )

            messages = result.get("messages", [])

            return {
                "success": True,
                "messages": messages,
                "count": len(messages),
                "channel": channel
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Slack messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slack/users")
async def get_slack_users(
    wallet_address: str = Query(...),
    limit: int = Query(200),
    db: AsyncSession = Depends(get_db)
):
    """
    Get workspace users via live Slack API.
    This is the recommended way to fetch users for display.
    """
    try:
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

        # YELLOW-001 FIX: Use auth context to access tokens securely
        with OAuthToken.auth_context(user_address):
            # Get access token (auto-decrypted by OAuthToken model property)
            access_token = oauth_token.access_token
            if not access_token:
                raise HTTPException(status_code=401, detail="Slack token expired or invalid")

            # Call Slack API directly
            params = {
                "limit": limit
            }

            result = await slack_api_call(
                method="GET",
                endpoint="users.list",
                access_token=access_token,
                params=params
            )

            users = result.get("members", [])

            return {
                "success": True,
                "users": users,
                "count": len(users)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Slack users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{provider}/token-debug")
async def debug_token_state(
    provider: str,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    DEBUG ENDPOINT: Check token state for diagnosis.
    Returns non-sensitive token metadata to help debug refresh failures.

    WARNING: This is a debug endpoint. Consider removing in production.
    """
    try:
        # Normalize inputs
        normalized_provider = normalize_integration_name(provider)
        user_address = wallet_address.lower()

        # Get OAuth token from database
        token_result = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == user_address,
                    OAuthToken.provider == normalized_provider,
                )
            )
        )
        oauth_token = token_result.scalar_one_or_none()

        if not oauth_token:
            return {
                "provider": normalized_provider,
                "token_exists": False,
                "message": "No OAuth token found in database for this provider/wallet"
            }

        # Return non-sensitive metadata
        with OAuthToken.auth_context(user_address):
            return {
                "provider": normalized_provider,
                "token_exists": True,
                "is_active": oauth_token.is_active,
                "has_access_token": bool(oauth_token.access_token),
                "access_token_length": len(oauth_token.access_token) if oauth_token.access_token else 0,
                "has_refresh_token": bool(oauth_token.refresh_token),
                "refresh_token_length": len(oauth_token.refresh_token) if oauth_token.refresh_token else 0,
                "expires_at": str(oauth_token.expires_at) if oauth_token.expires_at else None,
                "last_refreshed_at": str(oauth_token.last_refreshed_at) if oauth_token.last_refreshed_at else None,
                "connected_at": str(oauth_token.connected_at) if oauth_token.connected_at else None,
                "updated_at": str(oauth_token.updated_at) if oauth_token.updated_at else None,
                "scope": oauth_token.scope,
                "token_type": oauth_token.token_type,
            }

    except Exception as e:
        logger.error(f"Token debug failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
