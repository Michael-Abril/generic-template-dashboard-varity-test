"""
BaseDataAdapter - Universal base class for all integration adapters

This provides a COMPLETE data pipeline:
1. Wallet normalization (consistent storage/retrieval)
2. Data fetching (abstract - each adapter implements)
3. Data transformation (abstract - each adapter implements)
4. Encryption (AES-256-GCM with wallet-derived key)
5. Pinata upload (IPFS/Filecoin storage)
6. RAG indexing configuration

All adapters MUST inherit from this class and implement:
- INTEGRATION_NAME: str - The integration identifier (e.g., "google", "slack")
- RAG_ENABLED_TYPES: List[str] - Data types to index in Qdrant
- get_data_types() -> List[str] - Available data types
- fetch_data(data_type) -> Dict - Fetch from external API
- transform_data(data_type, raw_data) -> List[Dict] - Transform to common schema

Example:
    class SlackAdapter(BaseDataAdapter):
        INTEGRATION_NAME = "slack"
        RAG_ENABLED_TYPES = ["files"]

        def get_data_types(self) -> List[str]:
            return ["channels", "messages", "users", "files"]

        async def fetch_data(self, data_type: str) -> Dict[str, Any]:
            # Call Slack API...

        def transform_data(self, data_type: str, raw_data: Dict) -> List[Dict]:
            # Transform Slack data to common schema...
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable, Tuple
from datetime import datetime
from collections import defaultdict
import asyncio
import logging

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService, normalize_wallet_address

logger = logging.getLogger(__name__)


class BaseDataAdapter(ABC):
    """
    Universal base adapter for all integrations.

    Handles the complete data pipeline:
    - Wallet normalization
    - API pagination
    - Data chunking
    - Encryption
    - Pinata storage
    - RAG configuration
    """

    # ==================== MUST OVERRIDE IN SUBCLASS ====================

    # Integration identifier (e.g., "google", "slack", "quickbooks")
    INTEGRATION_NAME: str = ""

    # Data types to sync to Pinata AND index in Qdrant
    # Data types NOT in this list will still be synced but NOT indexed for AI
    RAG_ENABLED_TYPES: List[str] = []

    # ==================== INITIALIZATION ====================

    def __init__(self, credentials: dict):
        """
        Initialize adapter with OAuth credentials and storage services.

        Args:
            credentials: OAuth credentials dict with access_token (required)
                        and optional refresh_token, provider_data
        """
        self.access_token = credentials.get("access_token")
        self.refresh_token = credentials.get("refresh_token")
        self.provider_data = credentials.get("provider_data", {})

        if not self.access_token:
            raise ValueError(f"Missing access token for {self.INTEGRATION_NAME}")

        # Initialize storage services (shared across all adapters)
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

        logger.info(f"Initialized {self.INTEGRATION_NAME} adapter")

    # ==================== ABSTRACT METHODS (Must Implement) ====================

    @abstractmethod
    def get_data_types(self) -> List[str]:
        """
        Get list of data types this adapter can sync.

        Returns:
            List of data type identifiers (e.g., ["channels", "messages", "files"])
        """
        pass

    @abstractmethod
    async def fetch_data(self, data_type: str, **kwargs) -> Dict[str, Any]:
        """
        Fetch data from the external API.

        Args:
            data_type: Type of data to fetch (e.g., "channels", "invoices")
            **kwargs: Additional fetch options (limit, date_range, etc.)

        Returns:
            Raw data from the API, typically:
            {
                "records": [...],  # or specific key like "messages", "files"
                "total_count": int,
                "chunks": {...}  # Optional pre-chunked data
            }
        """
        pass

    @abstractmethod
    def transform_data(
        self,
        data_type: str,
        raw_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Transform raw API data to common schema.

        Args:
            data_type: Type of data being transformed
            raw_data: Raw data from fetch_data()

        Returns:
            List of transformed records with common schema:
            [
                {
                    "id": str,
                    "type": str,  # e.g., "email", "invoice", "contact"
                    "integration": str,  # e.g., "google", "slack"
                    ...other fields
                }
            ]
        """
        pass

    # ==================== OPTIONAL OVERRIDES ====================

    def get_chunk_strategy(self, data_type: str) -> str:
        """
        Get chunking strategy for a data type.

        Override to customize chunking per data type.

        Args:
            data_type: The data type

        Returns:
            One of: "monthly", "quarterly", "yearly", "latest"
        """
        return "latest"  # Default: no chunking, single file

    def get_date_field(self, data_type: str) -> str:
        """
        Get the date field used for chunking.

        Override to specify which field contains the date for chunking.

        Args:
            data_type: The data type

        Returns:
            Field name (e.g., "created_at", "date", "timestamp")
        """
        return "created_at"

    def get_data_type_name(self, data_type: str) -> str:
        """
        Get human-readable name for a data type.

        Override for custom display names.

        Args:
            data_type: Internal data type key

        Returns:
            Human-readable name (e.g., "invoices" -> "Invoices")
        """
        return data_type.replace("_", " ").title()

    # ==================== SYNC (Main Entry Point) ====================

    async def sync_data(
        self,
        wallet_address: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all data from the integration with multi-tenant Filecoin storage.

        This is the main entry point. It handles:
        1. Wallet normalization (CRITICAL for consistent storage/retrieval)
        2. Fetching data from external API
        3. Transforming to common schema
        4. Chunking by time period
        5. Encrypting with wallet-derived key
        6. Uploading to Pinata (Filecoin/IPFS)

        Args:
            wallet_address: Customer's wallet address (will be normalized)
            data_types: Optional list of specific data types to sync
                       (default: all from get_data_types())

        Returns:
            Sync results with CIDs for each data type:
            {
                "business_wallet": str,
                "integration": str,
                "synced_at": str,
                "data": {
                    "data_type": {
                        "status": "success" | "failed",
                        "cid": str,  # Latest CID
                        "chunks": {"chunk_id": "cid", ...},
                        "record_count": int,
                        "error": str (if failed)
                    }
                }
            }
        """
        # CRITICAL: Normalize wallet address for consistent storage/retrieval
        normalized_wallet = normalize_wallet_address(wallet_address)

        if data_types is None:
            data_types = self.get_data_types()

        logger.info(
            f"Starting {self.INTEGRATION_NAME} sync for wallet={normalized_wallet[:15]}..., "
            f"data_types={data_types}"
        )

        results = {
            "business_wallet": normalized_wallet,
            "integration": self.INTEGRATION_NAME,
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                result = await self._sync_data_type(normalized_wallet, data_type)
                results["data"][data_type] = result
            except Exception as e:
                logger.error(
                    f"Failed to sync {self.INTEGRATION_NAME}/{data_type}: {e}",
                    exc_info=True
                )
                results["data"][data_type] = {
                    "status": "failed",
                    "error": str(e)
                }

        # Log summary
        success_count = sum(
            1 for d in results["data"].values() if d.get("status") == "success"
        )
        total_records = sum(
            d.get("record_count", 0) for d in results["data"].values()
        )

        logger.info(
            f"{self.INTEGRATION_NAME} sync complete: "
            f"{success_count}/{len(data_types)} data types, "
            f"{total_records} total records, "
            f"wallet={normalized_wallet[:15]}..."
        )

        return results

    async def _sync_data_type(
        self,
        wallet_address: str,
        data_type: str
    ) -> Dict[str, Any]:
        """
        Sync a single data type to Pinata.

        Args:
            wallet_address: Normalized wallet address
            data_type: Data type to sync

        Returns:
            Sync result for this data type
        """
        logger.info(f"Syncing {self.INTEGRATION_NAME}/{data_type}")

        # 1. Fetch data from external API
        raw_data = await self.fetch_data(data_type)

        # 2. Check if data comes pre-chunked
        chunks = raw_data.get("chunks", {})

        if chunks:
            # Data is already chunked (e.g., by month/quarter)
            return await self._store_chunked_data(
                wallet_address, data_type, chunks
            )
        else:
            # Transform and chunk the data
            transformed = self.transform_data(data_type, raw_data)

            if not transformed:
                logger.info(f"No records to sync for {data_type}")
                return {
                    "status": "success",
                    "record_count": 0,
                    "cid": None,
                    "chunks": {}
                }

            # Apply chunking strategy
            chunks = self._apply_chunking(data_type, transformed)

            return await self._store_chunked_data(
                wallet_address, data_type, chunks
            )

    async def _store_chunked_data(
        self,
        wallet_address: str,
        data_type: str,
        chunks: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Store chunked data to Pinata.

        Args:
            wallet_address: Normalized wallet address
            data_type: Data type being stored
            chunks: Dict mapping chunk_id to list of records

        Returns:
            Storage result with CIDs
        """
        chunk_cids = {}
        total_records = 0
        latest_cid = None

        # Sort chunks (most recent first for "latest" flag)
        sorted_chunk_ids = sorted(chunks.keys(), reverse=True)

        for i, chunk_id in enumerate(sorted_chunk_ids):
            records = chunks[chunk_id]
            if not records:
                continue

            # Transform records if they're raw (add type/integration fields)
            processed_records = []
            for record in records:
                if "type" not in record or "integration" not in record:
                    record = {
                        **record,
                        "type": data_type,
                        "integration": self.INTEGRATION_NAME
                    }
                processed_records.append(record)

            total_records += len(processed_records)

            # Prepare data package
            data_package = {
                "data_type": data_type,
                "integration": self.INTEGRATION_NAME,
                "chunk_id": chunk_id,
                "records": processed_records,
                "record_count": len(processed_records),
                "synced_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "source": f"{self.INTEGRATION_NAME}_api",
                    "chunk_strategy": self.get_chunk_strategy(data_type)
                }
            }

            # Encrypt with wallet-derived key
            encrypted_data = await self.encryption.encrypt_for_customer(
                data=data_package,
                customer_wallet=wallet_address,
                additional_metadata={
                    "integration": self.INTEGRATION_NAME,
                    "data_type": data_type,
                    "chunk_id": chunk_id
                }
            )

            # Upload to Pinata
            is_latest = (i == 0)  # First chunk (most recent) is marked as latest
            cid = await self.filecoin.upload_encrypted_data(
                customer_wallet=wallet_address,
                integration=self.INTEGRATION_NAME,
                data_type=data_type,
                encrypted_data=encrypted_data,
                chunk_id=chunk_id,
                chunk_type=self.get_chunk_strategy(data_type),
                is_latest=is_latest,
                record_count=len(processed_records)
            )

            chunk_cids[chunk_id] = cid
            if is_latest:
                latest_cid = cid

            logger.info(
                f"Stored {self.INTEGRATION_NAME}/{data_type}/{chunk_id}: "
                f"{len(processed_records)} records, CID={cid}"
            )

        return {
            "status": "success",
            "cid": latest_cid,
            "chunks": chunk_cids,
            "record_count": total_records,
            "chunk_count": len(chunk_cids)
        }

    def _apply_chunking(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Apply chunking strategy to records.

        Args:
            data_type: Data type being chunked
            records: List of transformed records

        Returns:
            Dict mapping chunk_id to list of records
        """
        strategy = self.get_chunk_strategy(data_type)
        date_field = self.get_date_field(data_type)

        if strategy == "monthly":
            return self.chunk_by_month(records, date_field)
        elif strategy == "quarterly":
            return self.chunk_by_quarter(records, date_field)
        elif strategy == "yearly":
            return self.chunk_by_year(records, date_field)
        else:
            # Default: single "latest" chunk
            return self.chunk_single(records)

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

            logger.debug(
                f"Pagination page {page_num}: fetched {len(results)}, "
                f"total: {len(all_results)}"
            )

            if max_results and len(all_results) >= max_results:
                return all_results[:max_results]

            cursor = get_next_cursor(response_data)
            if not cursor:
                break

            await asyncio.sleep(rate_limit_ms / 1000)

        logger.info(
            f"Pagination complete: {len(all_results)} total items "
            f"across {page_num} pages"
        )
        return all_results

    # ==================== CHUNKING ====================

    def chunk_by_month(
        self,
        records: List[Dict],
        date_field: str
    ) -> Dict[str, List[Dict]]:
        """
        Group records by YYYY-MM.

        Args:
            records: List of records with date field
            date_field: Key containing the date string

        Returns:
            Dict mapping chunk_id (e.g., "2025-01") to records
        """
        return self._chunk_by_date(records, date_field, "%Y-%m")

    def chunk_by_quarter(
        self,
        records: List[Dict],
        date_field: str
    ) -> Dict[str, List[Dict]]:
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

    def chunk_by_year(
        self,
        records: List[Dict],
        date_field: str
    ) -> Dict[str, List[Dict]]:
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
        self,
        records: List[Dict],
        date_field: str,
        fmt: str
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
                return datetime.strptime(
                    clean_str,
                    fmt.replace(".%fZ", "").replace("Z", "")
                )
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

    # ==================== CONNECTION TEST ====================

    async def test_connection(self) -> bool:
        """
        Test if the OAuth connection is valid.

        Override in subclass to implement provider-specific test.

        Returns:
            True if connection is valid, False otherwise
        """
        logger.warning(
            f"test_connection() not implemented for {self.INTEGRATION_NAME}"
        )
        return True
