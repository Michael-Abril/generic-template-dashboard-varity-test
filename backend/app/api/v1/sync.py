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

# Legacy adapters (deprecated - kept for backwards compatibility)
# Only MVP integrations are active
from app.adapters.quickbooks.sync import QuickBooksSync
from app.adapters.salesforce.sync import SalesforceSync
from app.adapters.slack.sync import SlackSync
from app.adapters.hubspot.sync import HubSpotSync
from app.adapters.google.sync import GoogleWorkspaceSync
from app.adapters.microsoft.sync import MicrosoftSync

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# MCP-enabled integrations (new pipeline)
MCP_INTEGRATIONS = {"google", "slack", "quickbooks", "microsoft", "salesforce", "hubspot"}

# Legacy sync adapters (deprecated) - Only MVP integrations
SYNC_ADAPTERS = {
    "quickbooks": QuickBooksSync,
    "salesforce": SalesforceSync,
    "slack": SlackSync,
    "hubspot": HubSpotSync,
    "google_workspace": GoogleWorkspaceSync,
    "google": GoogleWorkspaceSync,  # Alias for compatibility
    "microsoft": MicrosoftSync,
}

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
    Retrieve and decrypt OAuth credentials from Filecoin

    Args:
        wallet_address: User's wallet address
        integration: Integration name

    Returns:
        Decrypted OAuth credentials

    Raises:
        HTTPException if credentials not found
    """
    try:
        # List OAuth credentials
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="oauth-credentials",
            limit=1
        )

        if not files:
            raise HTTPException(
                status_code=404,
                detail=f"No OAuth credentials found for {integration}. Please connect first."
            )

        # Retrieve and decrypt
        encrypted_data = await filecoin_service.retrieve_data(files[0]["cid"])

        decrypted_credentials = await encryption_service.decrypt_with_wallet(
            encrypted_data=encrypted_data,
            customer_wallet=wallet_address
        )

        return decrypted_credentials

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve OAuth credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def sync_job_worker(
    job_id: str,
    integration: str,
    wallet_address: str,
    credentials: dict,
    data_types: Optional[List[str]] = None
):
    """
    Background worker for syncing data from external integration

    Args:
        job_id: Unique job ID
        integration: Integration name
        wallet_address: User's wallet address
        credentials: OAuth credentials
        data_types: Specific data types to sync
    """
    try:
        # Update job status
        sync_jobs[job_id]["status"] = "running"

        # Get sync adapter
        if integration not in SYNC_ADAPTERS:
            raise Exception(f"No sync adapter for {integration}")

        adapter_class = SYNC_ADAPTERS[integration]
        adapter = adapter_class(credentials)

        # Sync data
        synced_data = {}

        if not data_types:
            # Sync all data types for this integration
            data_types = adapter.get_data_types()

        total_types = len(data_types)

        for idx, data_type in enumerate(data_types):
            try:
                logger.info(f"Syncing {data_type} for {integration}")

                # Fetch data from external API
                data = await adapter.fetch_data(data_type)

                # Transform to common schema
                transformed_data = adapter.transform_data(data_type, data)

                # Generate embeddings for RAG
                embeddings = await adapter.generate_embeddings(transformed_data)

                # Encrypt data
                encrypted_data = await encryption_service.encrypt_for_customer(
                    data={
                        "data": transformed_data,
                        "embeddings": embeddings,
                        "synced_at": datetime.utcnow().isoformat()
                    },
                    customer_wallet=wallet_address,
                    additional_metadata={
                        "integration": integration,
                        "data_type": data_type
                    }
                )

                # Upload to Filecoin
                cid = await filecoin_service.upload_encrypted_data(
                    customer_wallet=wallet_address,
                    integration=integration,
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": integration,
                        "data_type": data_type,
                        "record_count": len(transformed_data) if isinstance(transformed_data, list) else 1
                    }
                )

                synced_data[data_type] = {
                    "cid": cid,
                    "count": len(transformed_data) if isinstance(transformed_data, list) else 1
                }

                # Update progress
                sync_jobs[job_id]["progress"] = idx + 1
                sync_jobs[job_id]["total"] = total_types

                logger.info(
                    f"Synced {data_type} for {integration}, "
                    f"CID: {cid}, count: {synced_data[data_type]['count']}"
                )

            except Exception as e:
                logger.error(f"Failed to sync {data_type}: {e}")
                synced_data[data_type] = {"error": str(e)}

        # Update job as completed
        sync_jobs[job_id]["status"] = "completed"
        sync_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
        sync_jobs[job_id]["synced_data"] = synced_data

        logger.info(f"Sync job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Sync job {job_id} failed: {e}")
        sync_jobs[job_id]["status"] = "failed"
        sync_jobs[job_id]["error"] = str(e)
        sync_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()


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
    Trigger data sync from an integration

    Args:
        integration: Integration name (quickbooks, salesforce, shopify)
        request: Sync trigger request
        background_tasks: FastAPI background tasks

    Returns:
        Job ID for tracking sync status
    """
    try:
        if integration not in SYNC_ADAPTERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported integration: {integration}"
            )

        # Retrieve OAuth credentials
        credentials = await retrieve_oauth_credentials(
            request.wallet_address,
            integration
        )

        # Generate job ID
        job_id = f"{integration}-{request.wallet_address[:8]}-{int(datetime.utcnow().timestamp())}"

        # Initialize job status
        sync_jobs[job_id] = {
            "job_id": job_id,
            "integration": integration,
            "wallet_address": request.wallet_address,
            "status": "queued",
            "progress": 0,
            "total": 0,
            "started_at": datetime.utcnow().isoformat()
        }

        # Start background sync
        background_tasks.add_task(
            sync_job_worker,
            job_id,
            integration,
            request.wallet_address,
            credentials,
            request.data_types
        )

        logger.info(
            f"Started sync job {job_id} for {integration}, "
            f"wallet: {request.wallet_address}"
        )

        return {
            "success": True,
            "job_id": job_id,
            "integration": integration,
            "wallet_address": request.wallet_address,
            "message": "Sync job started in background"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger sync: {e}")
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
        # Retrieve OAuth token
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

        # Perform sync
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
