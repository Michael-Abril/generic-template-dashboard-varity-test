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

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.core.database import get_db
from app.models.marketplace import Product
from app.models.purchase import Purchase, OAuthToken, SyncLog, SyncStatus

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


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
            if token.expires_at and token.expires_at < datetime.utcnow():
                sync_status = "expired"

            installed_tools.append(
                {
                    "tool_id": token.id,
                    "tool_name": provider_names.get(token.provider, token.provider.title()),
                    "integration": token.provider,
                    "installed_at": token.connected_at.isoformat() if token.connected_at else token.created_at.isoformat(),
                    "last_sync": token.last_sync_at.isoformat() if token.last_sync_at else None,
                    "sync_status": sync_status,
                    "data_count": 0,  # Would need to query Filecoin for actual count
                }
            )

        # Convert to the simple integrations format expected by frontend
        integrations = [
            {
                "id": tool["tool_id"],
                "name": tool["tool_name"],
                "slug": tool["integration"],
                "connected": tool["sync_status"] in {"connected", "success", "partial"},
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
        logger.info(
            f"Syncing data for {tool}, wallet={request.wallet_address}, "
            f"force={request.force}"
        )

        # Normalize wallet address and provider
        wallet_address = request.wallet_address.lower()
        provider = tool.lower()

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

        # Check if token is expired
        if oauth_token.expires_at and oauth_token.expires_at < datetime.utcnow():
            # TODO: Implement token refresh logic
            logger.warning(f"OAuth token for {tool} is expired for wallet {wallet_address}")
            raise HTTPException(
                status_code=401,
                detail=f"OAuth token for {tool} has expired. Please reconnect the integration."
            )

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

        elif provider == "google":
            from app.adapters.google.sync import GoogleSyncAdapter
            adapter = GoogleSyncAdapter(access_token)
            result = await adapter.sync_data(request.wallet_address)

        elif provider == "microsoft":
            from app.adapters.microsoft.sync import MicrosoftSyncAdapter
            adapter = MicrosoftSyncAdapter(access_token)
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

        return {
            "success": True,
            "integration": tool,
            "wallet_address": request.wallet_address,
            "sync_result": result,
            "message": f"Successfully synced {tool} data"
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
    limit: int = Query(100, description="Maximum results to return")
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

    Returns:
        Tool data (decrypted)
    """
    try:
        logger.info(
            f"Retrieving {tool} data for wallet {wallet_address}, "
            f"type={data_type}, limit={limit}"
        )

        # List files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=tool,
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

        # For MVP, return mock data structure
        # In production, fetch and decrypt each file
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

                all_data.append({
                    "cid": file["cid"],
                    "data_type": file.get("data_type", "unknown"),
                    "data": decrypted,
                    "uploaded_at": file.get("uploaded_at", "")
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
        logger.info(f"Deleting {tool} data for wallet {wallet_address}")

        # List all files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=tool,
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
