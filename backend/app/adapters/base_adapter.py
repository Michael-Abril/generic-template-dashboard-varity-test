"""
BaseDataAdapter - Universal base class for all integration adapters

This provides a consistent interface for:
- Pagination with rate limiting
- Date-based chunking (monthly, quarterly, yearly)
- RAG storage configuration via RAG_ENABLED_TYPES

All adapters should inherit from this class and override RAG_ENABLED_TYPES
to specify which data types should be indexed in Qdrant.

Example:
    class QuickBooksAdapter(BaseDataAdapter):
        RAG_ENABLED_TYPES = ["invoices", "expenses", "customers"]

        async def sync_data(self, wallet_address: str) -> Dict[str, Any]:
            # Implementation...
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable, Tuple
from datetime import datetime
from collections import defaultdict
import asyncio
import logging

logger = logging.getLogger(__name__)


class BaseDataAdapter(ABC):
    """Universal base adapter for all integrations"""

    # Override in subclass - data types to sync to Pinata AND index in Qdrant
    # Data types NOT in this list will be skipped entirely
    RAG_ENABLED_TYPES: List[str] = []

    def __init__(self, access_token: str, **kwargs):
        """
        Initialize adapter with OAuth access token.

        Args:
            access_token: OAuth access token for the integration
            **kwargs: Additional adapter-specific config
        """
        self.access_token = access_token
        self.refresh_token = kwargs.get("refresh_token")

    # ==================== PAGINATION ====================

    async def paginate_api(
        self,
        fetch_page: Callable[[Optional[str]], Tuple[List[Dict[str, Any]], Any]],
        get_next_cursor: Callable[[Any], Optional[str]],
        max_results: Optional[int] = None,
        rate_limit_ms: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Universal pagination with rate limiting.

        Args:
            fetch_page: Async function(cursor) -> (results, response_data)
            get_next_cursor: Function(response_data) -> next_cursor or None
            max_results: Optional max items to fetch
            rate_limit_ms: Delay between pages in milliseconds

        Returns:
            List of all fetched items
        """
        all_results = []
        cursor = None
        page_num = 0

        while True:
            page_num += 1
            results, response_data = await fetch_page(cursor)
            all_results.extend(results)

            logger.info(
                f"Pagination page {page_num}: fetched {len(results)}, "
                f"total: {len(all_results)}"
            )

            if max_results and len(all_results) >= max_results:
                return all_results[:max_results]

            cursor = get_next_cursor(response_data)
            if not cursor:
                break

            await asyncio.sleep(rate_limit_ms / 1000)

        logger.info(f"Pagination complete: {len(all_results)} total items across {page_num} pages")
        return all_results

    # ==================== CHUNKING ====================

    def chunk_by_month(self, records: List[Dict], date_field: str) -> Dict[str, List[Dict]]:
        """
        Group records by YYYY-MM.

        Args:
            records: List of records with date field
            date_field: Key containing the date string

        Returns:
            Dict mapping chunk_id (e.g., "2025-01") to records
        """
        return self._chunk_by_date(records, date_field, "%Y-%m")

    def chunk_by_quarter(self, records: List[Dict], date_field: str) -> Dict[str, List[Dict]]:
        """
        Group records by YYYY-Q#.

        Args:
            records: List of records with date field
            date_field: Key containing the date string

        Returns:
            Dict mapping chunk_id (e.g., "2025-Q1") to records
        """
        chunks = defaultdict(list)
        for record in records:
            date_str = self._get_nested_value(record, date_field)
            try:
                dt = self._parse_date(date_str)
                quarter = (dt.month - 1) // 3 + 1
                chunk_id = f"{dt.year}-Q{quarter}"
            except (ValueError, TypeError, AttributeError):
                chunk_id = "unknown"
            chunks[chunk_id].append(record)
        return dict(chunks)

    def chunk_by_year(self, records: List[Dict], date_field: str) -> Dict[str, List[Dict]]:
        """
        Group records by YYYY.

        Args:
            records: List of records with date field
            date_field: Key containing the date string

        Returns:
            Dict mapping chunk_id (e.g., "2025") to records
        """
        return self._chunk_by_date(records, date_field, "%Y")

    def chunk_single(self, records: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Return all records as a single 'latest' chunk.

        Use for data types that don't need chronological chunking.

        Returns:
            Dict with single "latest" key containing all records
        """
        return {"latest": records} if records else {}

    def _chunk_by_date(
        self, records: List[Dict], date_field: str, fmt: str
    ) -> Dict[str, List[Dict]]:
        """Internal helper for date-based chunking"""
        chunks = defaultdict(list)
        for record in records:
            date_str = self._get_nested_value(record, date_field)
            try:
                dt = self._parse_date(date_str)
                chunk_id = dt.strftime(fmt)
            except (ValueError, TypeError, AttributeError):
                chunk_id = "unknown"
            chunks[chunk_id].append(record)
        return dict(chunks)

    def _get_nested_value(self, record: Dict, key: str) -> Any:
        """Get value from potentially nested key (e.g., 'metadata.date')"""
        keys = key.split(".")
        value = record
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return None
        return value

    def _parse_date(self, date_str: str) -> datetime:
        """Parse various date formats"""
        if not date_str or not isinstance(date_str, str):
            raise ValueError(f"Invalid date: {date_str}")

        # Try common formats
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO with microseconds
            "%Y-%m-%dT%H:%M:%SZ",     # ISO with Z
            "%Y-%m-%dT%H:%M:%S",      # ISO without Z
            "%Y-%m-%d",               # Date only
            "%Y/%m/%d",               # Slash format
            "%m/%d/%Y",               # US format
        ]

        # Clean up the string
        clean_str = date_str.replace("Z", "").split("+")[0].split(".")[0]

        for fmt in formats:
            try:
                return datetime.strptime(clean_str, fmt.replace(".%fZ", "").replace("Z", ""))
            except ValueError:
                continue

        raise ValueError(f"Cannot parse date: {date_str}")

    # ==================== RAG CONFIG ====================

    def should_index_in_rag(self, data_type: str) -> bool:
        """
        Check if data type should be indexed in Qdrant.

        Args:
            data_type: The data type to check (e.g., "invoices", "drive")

        Returns:
            True if this data type should go to RAG, False otherwise
        """
        return data_type.lower() in [t.lower() for t in self.RAG_ENABLED_TYPES]

    def get_enabled_types(self) -> List[str]:
        """Get list of data types that will be synced and indexed"""
        return self.RAG_ENABLED_TYPES.copy()

    # ==================== SYNC (Abstract) ====================

    @abstractmethod
    async def sync_data(self, wallet_address: str) -> Dict[str, Any]:
        """
        Sync data from the integration for a given wallet.

        Must be implemented by each adapter.

        Args:
            wallet_address: Customer's wallet address

        Returns:
            Dict with sync results:
            {
                "business_wallet": str,
                "integration": str,
                "synced_at": str,
                "data": {
                    "data_type": {
                        "status": "success" | "failed",
                        "cid": str,
                        "record_count": int,
                        "chunks": {...},
                        "error": str (if failed)
                    }
                }
            }
        """
        pass

    @abstractmethod
    def get_data_type_name(self, data_type: str) -> str:
        """
        Get human-readable name for a data type.

        Args:
            data_type: Internal data type key

        Returns:
            Human-readable name (e.g., "invoices" -> "Invoice")
        """
        pass
