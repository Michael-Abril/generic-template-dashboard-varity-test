"""
Data Sync API Endpoints
Orchestrates data synchronization from external integrations to encrypted storage.

NEW ARCHITECTURE (MCP Pipeline):
- MCP servers fetch data from integrations
- All data encrypted BEFORE leaving the service
- Routed to Pinata (RAG) or Live API based on data type
- L3 Arbitrum batch commits for verification

LEGACY (Deprecated - kept for backwards compatibility):
- Direct adapter sync to Filecoin
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import asyncio
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.services.mcp_ingestion_service import get_mcp_ingestion_service, DATA_ROUTING_RULES

# =============================================================================
# LEGACY ADAPTERS DELETED: January 5, 2026
# All adapter imports removed - MCP pipeline is now the ONLY sync method.
# Legacy sync_job_worker() function kept below for reference but never called.
# =============================================================================

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# MCP-enabled integrations (the ONLY sync method as of January 5, 2026)
MCP_INTEGRATIONS = {"google", "slack", "quickbooks", "microsoft", "salesforce", "hubspot"}

# =============================================================================
# LEGACY CODE DELETED: January 5, 2026
# SYNC_ADAPTERS dictionary removed - all adapters deleted from codebase.
# sync_job_worker() function below is kept for reference but never called.
# =============================================================================

# Sync job status storage (in production, use Redis)
sync_jobs = {}


class SyncTriggerRequest(BaseModel):
    """Sync trigger request"""
    wallet_address: str
    force: bool = False
    data_types: Optional[List[str]] = None  # Specific data types to sync


class SyncStatusResponse(BaseModel):
    """Sync status response"""
    job_id: str
    integration: str
    wallet_address: str
    status: str
    progress: int
    total: int
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    synced_data: Optional[Dict[str, int]] = None


async def retrieve_oauth_credentials(wallet_address: str, integration: str) -> dict:
    """
    Retrieve OAuth credentials from PostgreSQL database.

    Uses the same pattern as live API endpoints - queries OAuthToken table,
    handles token refresh, and returns credentials dict.

    Args:
        wallet_address: User's wallet address
        integration: Integration name (provider in OAuthToken)

    Returns:
        Credentials dict with access_token, realm_id (for QB), instance_url (for SF)

    Raises:
        HTTPException if credentials not found or refresh fails
    """
    from sqlalchemy import select, and_
    from app.core.database import AsyncSessionLocal
    from app.models.purchase import OAuthToken
    from app.api.v1.integrations import refresh_oauth_token

    try:
        async with AsyncSessionLocal() as db:
            # Query token from PostgreSQL
            result = await db.execute(
                select(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == wallet_address.lower(),
                        OAuthToken.provider == integration
                    )
                )
            )
            token = result.scalar_one_or_none()

            if not token:
                raise HTTPException(
                    status_code=404,
                    detail=f"No OAuth credentials found for {integration}. Please connect first."
                )

            # Check if token is expired and attempt refresh
            now = datetime.utcnow()
            if token.expires_at and token.expires_at < now:
                logger.info(f"{integration} token for {wallet_address[:10]}... is expired, attempting refresh...")

                refresh_success = await refresh_oauth_token(token, integration, db)

                if not refresh_success:
                    logger.warning(f"{integration} token refresh failed for {wallet_address[:10]}...")
                    raise HTTPException(
                        status_code=401,
                        detail=f"{integration} token has expired and refresh failed. Please reconnect."
                    )

                logger.info(f"{integration} token refreshed successfully for {wallet_address[:10]}...")

            # Build credentials dict with access_token and integration-specific params
            with OAuthToken.auth_context(wallet_address.lower()):
                credentials = {
                    "access_token": token.access_token,
                }
                # Add QuickBooks realm_id if available (stored in provider_data JSON)
                if integration == "quickbooks" and token.provider_data:
                    realm_id = token.provider_data.get("realm_id") or token.provider_data.get("realmId")
                    if realm_id:
                        credentials["realm_id"] = realm_id
                # Add Salesforce instance_url if available
                if integration == "salesforce" and token.provider_data:
                    instance_url = token.provider_data.get("instance_url")
                    if instance_url:
                        credentials["instance_url"] = instance_url

            return credentials

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve OAuth credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# sync_job_worker() was deleted January 12, 2026 - replaced by MCP pipeline


# ============================================================================
# MCP STATUS ENDPOINT - Must be defined BEFORE wildcard {integration} routes
# ============================================================================

@router.get("/mcp/status")
async def get_mcp_status():
    """
    Get overall MCP pipeline status.

    Returns:
        MCP service status and L3 connection info
    """
    try:
        from app.services.l3_commitment_service import get_l3_service

        l3_service = get_l3_service()
        l3_connected = l3_service.is_connected()
        l3_info = l3_service.get_network_info()

        return {
            "success": True,
            "mcp_enabled_integrations": list(MCP_INTEGRATIONS),
            "l3_connected": l3_connected,
            "l3_network": {
                "name": l3_info.get("name"),
                "chain_id": l3_info.get("chain_id"),
                "rpc_url": l3_info.get("rpc_url_active"),
                "explorer_url": l3_info.get("explorer_url"),
                "contract_address": l3_info.get("contract_address"),
            }
        }

    except Exception as e:
        logger.error(f"MCP status check failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "mcp_enabled_integrations": list(MCP_INTEGRATIONS),
            "l3_connected": False
        }


# ============================================================================
# WILDCARD ROUTES - Must come after specific routes like /mcp/status
# ============================================================================

@router.post("/{integration}/trigger")
async def trigger_sync(
    integration: str,
    request: SyncTriggerRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger data sync from an integration using MCP pipeline.

    This endpoint now routes ALL syncs through the MCP pipeline which:
    1. Fetches data via MCP servers (type-safe, automatic retries)
    2. Encrypts ALL data with wallet-derived key
    3. Routes to RAG (Pinata) or Live API based on DATA_ROUTING_RULES
    4. Commits to Varity L3 for on-chain verification

    Args:
        integration: Integration name (google, slack, quickbooks, microsoft, salesforce, hubspot)
        request: Sync trigger request with wallet_address and optional data_types

    Returns:
        Sync results with routing info and L3 commit status
    """
    try:
        # Check if integration is MCP-enabled
        if integration not in MCP_INTEGRATIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Integration '{integration}' is not supported. "
                       f"Supported: {', '.join(MCP_INTEGRATIONS)}"
            )

        # Retrieve OAuth credentials
        credentials = await retrieve_oauth_credentials(
            request.wallet_address,
            integration
        )

        oauth_token = credentials.get("access_token")
        if not oauth_token:
            raise HTTPException(
                status_code=401,
                detail=f"No valid OAuth token for {integration}. Please reconnect."
            )

        # Get MCP ingestion service
        mcp_service = get_mcp_ingestion_service()

        # Perform sync via MCP pipeline
        result = await mcp_service.sync_integration_data(
            integration=integration,
            wallet_address=request.wallet_address,
            oauth_token=oauth_token,
            data_types=request.data_types,
        )

        logger.info(
            f"MCP sync completed for {integration}, "
            f"wallet: {request.wallet_address[:10]}..."
        )

        return {
            "success": True,
            "integration": integration,
            "wallet_address": request.wallet_address,
            "message": "Sync completed via MCP pipeline",
            **result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP sync failed for {integration}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{integration}/status")
async def get_sync_status(
    integration: str,
    wallet_address: str = Query(..., description="User's wallet address"),
    job_id: Optional[str] = Query(None, description="Specific job ID")
):
    """
    Get sync job status

    Args:
        integration: Integration name
        wallet_address: User's wallet address
        job_id: Optional specific job ID

    Returns:
        Sync job status
    """
    try:
        if job_id:
            # Return specific job
            if job_id not in sync_jobs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Job {job_id} not found"
                )

            return {
                "success": True,
                "job": sync_jobs[job_id]
            }
        else:
            # Return all jobs for this wallet/integration
            matching_jobs = [
                job for job in sync_jobs.values()
                if job["wallet_address"] == wallet_address
                and job["integration"] == integration
            ]

            # Sort by started_at descending
            matching_jobs.sort(
                key=lambda x: x["started_at"],
                reverse=True
            )

            return {
                "success": True,
                "integration": integration,
                "wallet_address": wallet_address,
                "jobs": matching_jobs[:10]  # Last 10 jobs
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{integration}/data")
async def get_synced_data(
    integration: str,
    wallet_address: str = Query(..., description="User's wallet address"),
    data_type: Optional[str] = Query(None, description="Filter by data type"),
    limit: int = Query(10, description="Number of records to return")
):
    """
    Get synced data from Filecoin

    Args:
        integration: Integration name
        wallet_address: User's wallet address
        data_type: Optional data type filter
        limit: Number of records

    Returns:
        Synced data records
    """
    try:
        # List synced data files
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=integration,
            data_type=data_type,
            limit=limit
        )

        # Retrieve and decrypt data
        data_records = []

        for file in files:
            # Skip OAuth credentials
            if file.get("metadata", {}).get("data_type") == "oauth-credentials":
                continue

            try:
                # Retrieve encrypted data
                encrypted_data = await filecoin_service.retrieve_data(file["cid"])

                # Decrypt
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted_data,
                    customer_wallet=wallet_address
                )

                data_records.append({
                    "cid": file["cid"],
                    "data_type": file.get("metadata", {}).get("data_type"),
                    "synced_at": decrypted.get("synced_at"),
                    "data": decrypted.get("data"),
                    "record_count": file.get("metadata", {}).get("record_count", 0)
                })

            except Exception as e:
                logger.error(f"Failed to decrypt data from CID {file['cid']}: {e}")
                continue

        return {
            "success": True,
            "integration": integration,
            "wallet_address": wallet_address,
            "data_type": data_type,
            "count": len(data_records),
            "data": data_records
        }

    except Exception as e:
        logger.error(f"Failed to get synced data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ NEW MCP PIPELINE ENDPOINTS ============


class MCPSyncRequest(BaseModel):
    """MCP sync request"""
    wallet_address: str
    data_types: Optional[List[str]] = None
    extra_params: Optional[Dict[str, str]] = None  # realm_id, instance_url, etc.


class MCPSyncResponse(BaseModel):
    """MCP sync response"""
    success: bool
    integration: str
    wallet_address: str
    sync_time: str
    results: Dict[str, Any]
    l3_commits: Optional[Dict[str, Any]] = None


@router.post("/{integration}/mcp")
async def sync_via_mcp(
    integration: str,
    request: MCPSyncRequest,
    background_tasks: BackgroundTasks
):
    """
    Sync data using the new MCP encrypted pipeline.

    This is the NEW preferred sync method that:
    1. Fetches data via MCP servers (not direct API calls)
    2. Encrypts ALL data before storage
    3. Routes to RAG (Pinata) or Live API based on data type
    4. Commits to L3 Arbitrum for verification

    Args:
        integration: Integration name (google, slack, quickbooks, microsoft, salesforce, hubspot)
        request: MCP sync request with wallet and optional data types

    Returns:
        Sync results with L3 commit status
    """
    if integration not in MCP_INTEGRATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Integration '{integration}' is not MCP-enabled. "
                   f"Supported: {', '.join(MCP_INTEGRATIONS)}"
        )

    try:
        # Retrieve OAuth credentials (includes access_token, realm_id, instance_url, etc.)
        credentials = await retrieve_oauth_credentials(
            request.wallet_address,
            integration
        )

        oauth_token = credentials.get("access_token")
        if not oauth_token:
            raise HTTPException(
                status_code=401,
                detail=f"No valid OAuth token for {integration}. Please reconnect."
            )

        # Extract integration-specific params from stored credentials
        # These are needed for direct API fallback (when MCP packages don't exist)
        extra_params = {}
        if integration == "quickbooks":
            realm_id = credentials.get("realm_id") or credentials.get("realmId")
            if realm_id:
                extra_params["realm_id"] = realm_id
        elif integration == "salesforce":
            instance_url = credentials.get("instance_url")
            if instance_url:
                extra_params["instance_url"] = instance_url

        # Merge with request extra_params (request takes precedence)
        if request.extra_params:
            extra_params.update(request.extra_params)

        # Get MCP ingestion service
        mcp_service = get_mcp_ingestion_service()

        # Perform sync
        result = await mcp_service.sync_integration_data(
            integration=integration,
            wallet_address=request.wallet_address,
            oauth_token=oauth_token,
            data_types=request.data_types,
            extra_params=extra_params if extra_params else None,
        )

        logger.info(
            f"MCP sync completed for {integration}, "
            f"wallet: {request.wallet_address[:10]}..."
        )

        return {
            "success": True,
            **result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP sync failed for {integration}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{integration}/routing")
async def get_data_routing(integration: str):
    """
    Get data routing configuration for an integration.

    Shows which data types go to RAG storage vs Live API.

    Args:
        integration: Integration name

    Returns:
        Data routing rules for the integration
    """
    if integration not in MCP_INTEGRATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Integration '{integration}' is not MCP-enabled."
        )

    routing = DATA_ROUTING_RULES.get(integration, {})

    return {
        "success": True,
        "integration": integration,
        "is_mcp_enabled": True,
        "routing": {
            data_type: dest.value
            for data_type, dest in routing.items()
        }
    }


# NOTE: /mcp/status endpoint is defined BEFORE wildcard routes (see line ~247)
# to ensure proper FastAPI route matching
