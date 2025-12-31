"""
MCP Ingestion Service - Encrypted data pipeline from integrations to Pinata/L3

Replaces the broken sync adapters with MCP-based data fetching.
All data encrypted BEFORE leaving this service.

Architecture:
1. MCP connectors pull data from each integration
2. All data encrypted BEFORE routing
3. Data routed to either RAG (Pinata) or Live API config
4. No raw data ever stored unencrypted
"""

from typing import Dict, Any, List, Optional
from enum import Enum
import asyncio
from datetime import datetime
import logging

from app.services.encryption_service import EncryptionService
from app.services.filecoin_service import FilecoinService
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class DataDestination(Enum):
    """Data routing destinations"""
    RAG_STORAGE = "rag"      # -> Pinata + Qdrant indexing + L3
    LIVE_API = "live"        # -> Store query pattern, fetch real-time
    HYBRID = "hybrid"        # -> Initial sync to RAG, live updates


# Data routing rules per integration
DATA_ROUTING_RULES: Dict[str, Dict[str, DataDestination]] = {
    "google": {
        "drive_files": DataDestination.RAG_STORAGE,
        "contacts": DataDestination.RAG_STORAGE,
        "gmail": DataDestination.LIVE_API,
        "calendar": DataDestination.LIVE_API,
        "tasks": DataDestination.HYBRID,
    },
    "slack": {
        "channels": DataDestination.LIVE_API,
        "messages": DataDestination.HYBRID,
        "users": DataDestination.RAG_STORAGE,
        "files": DataDestination.RAG_STORAGE,
    },
    "quickbooks": {
        "invoices": DataDestination.HYBRID,
        "customers": DataDestination.RAG_STORAGE,
        "payments": DataDestination.LIVE_API,
        "reports": DataDestination.LIVE_API,
        "accounts": DataDestination.RAG_STORAGE,
    },
    "microsoft": {
        "onedrive": DataDestination.RAG_STORAGE,
        "contacts": DataDestination.RAG_STORAGE,
        "mail": DataDestination.LIVE_API,
        "calendar": DataDestination.LIVE_API,
        "teams_messages": DataDestination.HYBRID,
    },
    "salesforce": {
        "contacts": DataDestination.RAG_STORAGE,
        "leads": DataDestination.HYBRID,
        "opportunities": DataDestination.LIVE_API,
        "accounts": DataDestination.RAG_STORAGE,
        "activities": DataDestination.HYBRID,
    },
    "hubspot": {
        "contacts": DataDestination.RAG_STORAGE,
        "deals": DataDestination.HYBRID,
        "companies": DataDestination.RAG_STORAGE,
        "emails": DataDestination.LIVE_API,
        "tasks": DataDestination.HYBRID,
    },
}


class MCPIngestionService:
    """
    Encrypted MCP Ingestion Layer

    Pulls data via MCP -> Encrypts -> Routes to Pinata/L3 or Live API config
    """

    BATCH_THRESHOLD = 50  # Commit to L3 when 50 items accumulated

    def __init__(
        self,
        encryption_service: Optional[EncryptionService] = None,
        filecoin_service: Optional[FilecoinService] = None,
        rag_service: Optional[RAGService] = None,
    ):
        self.encryption = encryption_service or EncryptionService()
        self.filecoin = filecoin_service or FilecoinService()
        self.rag = rag_service or RAGService()
        self._mcp_clients: Dict[str, Any] = {}
        self._pending_commits: List[Dict] = []

    async def sync_integration_data(
        self,
        integration: str,
        wallet_address: str,
        oauth_token: str,
        data_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Full sync pipeline: MCP fetch -> Encrypt -> Route -> L3 commit

        Args:
            integration: Integration name (google, slack, etc.)
            wallet_address: User's wallet address
            oauth_token: OAuth token for integration
            data_types: Optional list of specific data types to sync

        Returns:
            Sync results for each data type
        """
        results = {}
        routing_rules = DATA_ROUTING_RULES.get(integration, {})
        types_to_sync = data_types or list(routing_rules.keys())

        logger.info(
            f"Starting MCP sync for {integration} "
            f"(wallet: {wallet_address[:10]}..., types: {types_to_sync})"
        )

        for data_type in types_to_sync:
            destination = routing_rules.get(data_type, DataDestination.RAG_STORAGE)

            try:
                # 1. Fetch via MCP
                raw_data = await self._fetch_via_mcp(
                    integration, data_type, oauth_token
                )

                if not raw_data:
                    results[data_type] = {"status": "empty", "count": 0}
                    continue

                # 2. Encrypt ALL data
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=raw_data,
                    customer_wallet=wallet_address,
                )

                # 3. Route based on destination
                if destination == DataDestination.RAG_STORAGE:
                    result = await self._store_to_rag(
                        encrypted_data, integration, data_type, wallet_address
                    )
                elif destination == DataDestination.LIVE_API:
                    result = await self._configure_live_api(
                        integration, data_type, wallet_address
                    )
                else:  # HYBRID
                    result = await self._handle_hybrid(
                        encrypted_data, integration, data_type, wallet_address
                    )

                results[data_type] = result

            except Exception as e:
                logger.error(
                    f"Error syncing {integration}/{data_type}: {str(e)}",
                    exc_info=True
                )
                results[data_type] = {"status": "error", "error": str(e)}

        # 4. Finalize - commit any remaining items to L3
        l3_result = await self._flush_batch_to_l3(wallet_address)

        return {
            "integration": integration,
            "wallet_address": wallet_address,
            "sync_time": datetime.utcnow().isoformat(),
            "results": results,
            "l3_commits": l3_result,
        }

    async def _fetch_via_mcp(
        self,
        integration: str,
        data_type: str,
        oauth_token: str,
        extra_params: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Fetch data using MCP protocol

        MCP handles:
        - OAuth token refresh
        - API pagination
        - Rate limiting
        - Error recovery
        """
        try:
            # Import MCP client here to avoid circular imports
            from mcp_servers import fetch_integration_data

            result = await fetch_integration_data(
                integration=integration,
                data_type=data_type,
                oauth_token=oauth_token,
                **(extra_params or {})
            )

            if "error" in result:
                logger.error(f"MCP fetch error for {integration}/{data_type}: {result['error']}")
                return None

            logger.info(f"MCP fetched {integration}/{data_type} successfully")
            return result

        except ImportError as e:
            logger.error(f"MCP client not available: {e}")
            return None
        except Exception as e:
            logger.error(f"MCP fetch failed for {integration}/{data_type}: {e}")
            return None

    async def _store_to_rag(
        self,
        encrypted_data: bytes,
        integration: str,
        data_type: str,
        wallet_address: str,
    ) -> Dict[str, Any]:
        """Store encrypted data to Pinata, index in Qdrant, batch for L3"""

        # Upload to Pinata
        cid = await self.filecoin.upload_encrypted_data(
            customer_wallet=wallet_address,
            integration=integration,
            data_type=data_type,
            encrypted_data=encrypted_data,
        )

        # Index in Qdrant
        await self.rag.index_document(
            cid=cid,
            integration=integration,
            data_type=data_type,
            wallet_address=wallet_address,
        )

        # Add to batch for L3 commitment
        self._pending_commits.append({
            "cid": cid,
            "content": encrypted_data,
            "integration": integration,
            "data_type": data_type,
            "wallet": wallet_address,
        })

        # Auto-flush if threshold reached
        l3_result = None
        if len(self._pending_commits) >= self.BATCH_THRESHOLD:
            l3_result = await self._flush_batch_to_l3(wallet_address)

        return {
            "status": "stored",
            "destination": "rag",
            "cid": cid,
            "indexed": True,
            "l3_pending": l3_result is None,
        }

    async def _configure_live_api(
        self,
        integration: str,
        data_type: str,
        wallet_address: str,
    ) -> Dict[str, Any]:
        """
        Configure live API endpoint for real-time queries

        No data stored - just the query configuration
        """
        # Store configuration for live queries
        config = {
            "integration": integration,
            "data_type": data_type,
            "query_endpoint": f"/api/v1/integrations/{integration}/{data_type}",
            "requires_live": True,
        }

        # TODO: Store in Redis for fast lookup
        # await self.redis.set(
        #     f"live_config:{wallet_address}:{integration}:{data_type}",
        #     config
        # )

        return {
            "status": "configured",
            "destination": "live_api",
            "endpoint": config["query_endpoint"],
        }

    async def _handle_hybrid(
        self,
        encrypted_data: bytes,
        integration: str,
        data_type: str,
        wallet_address: str,
    ) -> Dict[str, Any]:
        """
        Hybrid: Store historical in RAG + configure live for updates
        """
        # Store historical data
        rag_result = await self._store_to_rag(
            encrypted_data, integration, data_type, wallet_address
        )

        # Also configure live endpoint for fresh data
        live_result = await self._configure_live_api(
            integration, data_type, wallet_address
        )

        return {
            "status": "hybrid",
            "rag": rag_result,
            "live": live_result,
        }

    async def _flush_batch_to_l3(
        self,
        wallet_address: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Commit pending items to L3 as Merkle batch (200x more efficient)
        """
        if not self._pending_commits:
            return None

        # Import L3 service here to avoid circular imports
        from app.services.l3_commitment_service import get_l3_service

        l3_service = get_l3_service()

        # Group by integration
        by_integration = {}
        for item in self._pending_commits:
            integration = item["integration"]
            if integration not in by_integration:
                by_integration[integration] = []
            by_integration[integration].append(item)

        results = {}
        for integration, items in by_integration.items():
            try:
                result = await l3_service.commit_batch(
                    items=items,
                    integration=integration,
                    wallet_address=wallet_address,
                )
                results[integration] = result
            except Exception as e:
                logger.error(f"L3 commit failed for {integration}: {e}")
                results[integration] = {
                    "item_count": len(items),
                    "l3_committed": False,
                    "error": str(e),
                }

        # Clear buffer
        self._pending_commits = []

        return results


# Singleton instance
_mcp_service: Optional[MCPIngestionService] = None


def get_mcp_ingestion_service() -> MCPIngestionService:
    """Get singleton MCP ingestion service instance."""
    global _mcp_service
    if _mcp_service is None:
        _mcp_service = MCPIngestionService()
    return _mcp_service
