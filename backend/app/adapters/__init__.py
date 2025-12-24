"""
Integration Adapters Package

Each adapter syncs data from a third-party service to Pinata and Qdrant.
All adapters should inherit from BaseDataAdapter.

Example:
    from app.adapters.base_adapter import BaseDataAdapter

    class MyAdapter(BaseDataAdapter):
        RAG_ENABLED_TYPES = ["documents", "contacts"]

        async def sync_data(self, wallet_address: str) -> Dict[str, Any]:
            # Fetch, encrypt, upload, return CIDs
            ...
"""

from .base_adapter import BaseDataAdapter

__all__ = ["BaseDataAdapter"]
