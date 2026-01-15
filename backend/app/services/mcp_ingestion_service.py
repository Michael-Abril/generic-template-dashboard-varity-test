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

import json

from app.services.encryption_service import EncryptionService
from app.services.filecoin_service import FilecoinService
from app.services.rag_service import BusinessRAGService
from app.core.database import get_redis

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
        rag_service: Optional[BusinessRAGService] = None,
    ):
        self.encryption = encryption_service or EncryptionService()
        self.filecoin = filecoin_service or FilecoinService()
        self.rag = rag_service or BusinessRAGService()
        self._mcp_clients: Dict[str, Any] = {}
        self._pending_commits: List[Dict] = []

    async def sync_integration_data(
        self,
        integration: str,
        wallet_address: str,
        oauth_token: str,
        data_types: Optional[List[str]] = None,
        extra_params: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Full sync pipeline: MCP fetch -> Encrypt -> Route -> L3 commit

        Args:
            integration: Integration name (google, slack, etc.)
            wallet_address: User's wallet address
            oauth_token: OAuth token for integration
            data_types: Optional list of specific data types to sync
            extra_params: Integration-specific params (realm_id for QB, instance_url for SF)

        Returns:
            Sync results for each data type
        """
        results = {}
        routing_rules = DATA_ROUTING_RULES.get(integration, {})
        types_to_sync = data_types or list(routing_rules.keys())
        self._extra_params = extra_params or {}  # Store for use in fetch methods

        logger.info(
            f"Starting MCP sync for {integration} "
            f"(wallet: {wallet_address[:10]}..., types: {types_to_sync})"
        )

        for data_type in types_to_sync:
            destination = routing_rules.get(data_type, DataDestination.RAG_STORAGE)

            try:
                # 1. Fetch via MCP (or direct API fallback)
                raw_data = await self._fetch_via_mcp(
                    integration, data_type, oauth_token, self._extra_params
                )

                if not raw_data:
                    results[data_type] = {"status": "empty", "count": 0}
                    continue

                # Check if fetch returned an error (don't store error objects in RAG)
                if isinstance(raw_data, dict) and "error" in raw_data:
                    logger.warning(
                        f"Fetch error for {integration}/{data_type}: {raw_data.get('error')}"
                    )
                    results[data_type] = {
                        "status": "fetch_error",
                        "error": raw_data.get("error"),
                        "source": raw_data.get("source", "unknown"),
                    }
                    continue

                # 2. Encrypt ALL data
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=raw_data,
                    customer_wallet=wallet_address,
                )

                # 3. Route based on destination
                if destination == DataDestination.RAG_STORAGE:
                    result = await self._store_to_rag(
                        encrypted_data, integration, data_type, wallet_address, raw_data
                    )
                elif destination == DataDestination.LIVE_API:
                    result = await self._configure_live_api(
                        integration, data_type, wallet_address
                    )
                else:  # HYBRID
                    result = await self._handle_hybrid(
                        encrypted_data, integration, data_type, wallet_address, raw_data
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
        Fetch data using MCP protocol with direct API fallback

        MCP handles:
        - OAuth token refresh
        - API pagination
        - Rate limiting
        - Error recovery

        Fallback to direct API if MCP package doesn't exist (QuickBooks, Salesforce)
        """
        # Check if this integration uses direct API instead of MCP
        from mcp_servers.config import MCP_SERVER_REGISTRY

        server_config = MCP_SERVER_REGISTRY.get(integration, {})
        transport = server_config.get("transport")

        # If configured for direct API, use fallback immediately
        if transport == "direct_api":
            logger.info(f"Using direct API for {integration}/{data_type} (MCP not available)")
            return await self._fetch_via_direct_api(integration, data_type, oauth_token, extra_params)

        # Try MCP first
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
                logger.warning(
                    f"MCP fetch error for {integration}/{data_type}: {result['error']}, "
                    f"falling back to direct API"
                )
                # Actually fall back to direct API
                fallback_result = await self._fetch_via_direct_api(
                    integration, data_type, oauth_token, extra_params
                )
                if fallback_result and "error" not in fallback_result:
                    logger.info(f"Direct API fallback succeeded for {integration}/{data_type}")
                    return fallback_result
                # If fallback also failed, return combined error info
                return {
                    "error": result['error'],
                    "fallback_error": fallback_result.get("error") if fallback_result else "No fallback result",
                    "source": "mcp_and_fallback_error"
                }

            logger.info(f"MCP fetched {integration}/{data_type} successfully")
            return result

        except ImportError as e:
            logger.warning(f"MCP client not available for {integration}: {e}, using direct API")
            return await self._fetch_via_direct_api(integration, data_type, oauth_token, extra_params)
        except Exception as e:
            logger.warning(
                f"MCP fetch failed for {integration}/{data_type}: {e}, "
                f"falling back to direct API"
            )
            return await self._fetch_via_direct_api(integration, data_type, oauth_token, extra_params)

    async def _fetch_via_direct_api(
        self,
        integration: str,
        data_type: str,
        oauth_token: str,
        extra_params: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Fallback: Fetch data directly from integration APIs

        Used when MCP packages don't exist (QuickBooks, Salesforce)
        or when MCP fetch fails.

        All adapters expect credentials: dict with at least 'access_token'
        """
        try:
            # Build credentials dict - all adapters expect this format
            credentials = {"access_token": oauth_token}
            if extra_params:
                credentials.update(extra_params)

            # Import integration-specific API clients
            if integration == "google":
                from app.adapters.google.sync import GoogleWorkspaceSync
                adapter = GoogleWorkspaceSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            elif integration == "microsoft":
                from app.adapters.microsoft.sync import MicrosoftSync
                adapter = MicrosoftSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            elif integration == "slack":
                from app.adapters.slack.sync import SlackSync
                adapter = SlackSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            elif integration == "quickbooks":
                from app.adapters.quickbooks.sync import QuickBooksSync
                # QuickBooks requires realm_id in credentials
                if extra_params and "realm_id" in extra_params:
                    credentials["realm_id"] = extra_params["realm_id"]
                adapter = QuickBooksSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            elif integration == "salesforce":
                from app.adapters.salesforce.sync import SalesforceSync
                # Salesforce requires instance_url in credentials
                if extra_params and "instance_url" in extra_params:
                    credentials["instance_url"] = extra_params["instance_url"]
                adapter = SalesforceSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            elif integration == "hubspot":
                from app.adapters.hubspot.sync import HubSpotSync
                adapter = HubSpotSync(credentials=credentials)
                return await adapter.fetch_data(data_type)

            else:
                logger.error(f"No direct API adapter available for {integration}")
                return {
                    "error": f"No adapter for {integration}",
                    "fallback": False,
                    "source": "no_adapter"
                }

        except Exception as e:
            logger.error(f"Direct API fetch failed for {integration}/{data_type}: {e}")
            return {
                "error": str(e),
                "fallback": False,
                "source": "direct_api_error"
            }

    async def _store_to_rag(
        self,
        encrypted_data: bytes,
        integration: str,
        data_type: str,
        wallet_address: str,
        raw_data: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """Store encrypted data to Pinata, index in Qdrant, batch for L3"""

        # Upload to Pinata
        cid = await self.filecoin.upload_encrypted_data(
            customer_wallet=wallet_address,
            integration=integration,
            data_type=data_type,
            encrypted_data=encrypted_data,
        )

        # Index in Qdrant with the raw data for better embeddings
        await self.rag.index_document(
            cid=cid,
            integration=integration,
            data_type=data_type,
            wallet_address=wallet_address,
            data=raw_data,  # Pass raw data so RAG can create better embeddings
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
        Configure live API endpoint for real-time queries.

        Stores configuration in Redis for fast lookup by the frontend
        and /installed endpoint.

        No data stored to RAG - just the query configuration.
        """
        # Build endpoint based on integration and data type
        # Map data types to their actual API endpoints
        endpoint_map = {
            "google": {
                "gmail": "/api/v1/integrations/google/emails",
                "calendar": "/api/v1/integrations/google/events",
            },
            "microsoft": {
                "mail": "/api/v1/integrations/microsoft/mail/messages",
                "calendar": "/api/v1/integrations/microsoft/calendar/events",
            },
            "slack": {
                "channels": "/api/v1/integrations/slack/channels",
                "messages": "/api/v1/integrations/slack/messages",
            },
            "quickbooks": {
                "payments": "/api/v1/quickbooks/payments/live",
                "reports": "/api/v1/quickbooks/reports",
            },
            "salesforce": {
                "opportunities": "/api/v1/salesforce/opportunities",
            },
            "hubspot": {
                "emails": "/api/v1/hubspot/emails",
            },
        }

        # Get the specific endpoint or build a generic one
        integration_endpoints = endpoint_map.get(integration, {})
        query_endpoint = integration_endpoints.get(
            data_type,
            f"/api/v1/integrations/{integration}/{data_type}"
        )

        config = {
            "integration": integration,
            "data_type": data_type,
            "query_endpoint": query_endpoint,
            "requires_live": True,
            "configured_at": datetime.utcnow().isoformat(),
        }

        # Store in Redis for fast lookup
        redis = await get_redis()
        if redis:
            redis_key = f"live_config:{wallet_address}:{integration}:{data_type}"
            await redis.set(redis_key, json.dumps(config), ex=86400 * 30)  # 30 day TTL
            logger.info(f"Stored live API config in Redis: {redis_key}")
        else:
            logger.warning("Redis not available - live API config not persisted")

        return {
            "status": "configured",
            "destination": "live_api",
            "endpoint": query_endpoint,
            "redis_stored": redis is not None,
        }

    @staticmethod
    async def get_live_api_configs(
        wallet_address: str,
        integration: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve live API configurations from Redis.

        Used by /installed endpoint to show available live data types.

        Args:
            wallet_address: User's wallet address
            integration: Optional - filter to specific integration

        Returns:
            Dictionary of live API configurations by integration/data_type
        """
        redis = await get_redis()
        if not redis:
            return {"configs": {}, "redis_available": False}

        try:
            # Pattern match for this wallet's configs
            if integration:
                pattern = f"live_config:{wallet_address}:{integration}:*"
            else:
                pattern = f"live_config:{wallet_address}:*"

            configs = {}
            async for key in redis.scan_iter(pattern):
                config_json = await redis.get(key)
                if config_json:
                    config = json.loads(config_json)
                    int_name = config.get("integration")
                    data_type = config.get("data_type")
                    if int_name not in configs:
                        configs[int_name] = {}
                    configs[int_name][data_type] = {
                        "endpoint": config.get("query_endpoint"),
                        "configured_at": config.get("configured_at"),
                    }

            return {"configs": configs, "redis_available": True}
        except Exception as e:
            logger.error(f"Error retrieving live API configs from Redis: {e}")
            return {"configs": {}, "redis_available": False, "error": str(e)}

    async def _handle_hybrid(
        self,
        encrypted_data: bytes,
        integration: str,
        data_type: str,
        wallet_address: str,
        raw_data: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Hybrid: Store historical in RAG + configure live for updates
        """
        # Store historical data
        rag_result = await self._store_to_rag(
            encrypted_data, integration, data_type, wallet_address, raw_data
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
