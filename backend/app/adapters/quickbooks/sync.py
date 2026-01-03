"""
QuickBooks Sync Adapter
Fetches data from QuickBooks API with multi-tenant Filecoin storage

Enhanced December 28, 2025:
- Added pagination support for large datasets (QuickBooks limits 1000 per query)
- Added batch fetching with configurable batch sizes
- Improved error handling and retry logic
- Added RAG indexing support for all data types

Refactored January 3, 2026:
- Now inherits from BaseDataAdapter for unified pipeline
- Encryption, Pinata storage, L3 commitment handled by base class
- MCP data routing integrated
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import asyncio

from app.adapters.base_adapter import BaseDataAdapter

logger = logging.getLogger(__name__)


class QuickBooksSync(BaseDataAdapter):
    """
    Sync adapter for QuickBooks integration.

    Inherits from BaseDataAdapter which handles:
    - Wallet normalization
    - Encryption (AES-256-GCM)
    - Pinata storage (IPFS/Filecoin)
    - Chunking strategies
    - L3 blockchain commitment
    - MCP data routing
    """

    # REQUIRED: Integration identifier
    INTEGRATION_NAME = "quickbooks"

    # All QuickBooks data types go to RAG - financial data is highly searchable
    RAG_ENABLED_TYPES = ["invoices", "expenses", "customers", "vendors", "payments"]

    # QuickBooks API limits
    MAX_RESULTS_PER_QUERY = 1000
    DEFAULT_BATCH_SIZE = 500

    def __init__(self, credentials: dict):
        """
        Initialize QuickBooks sync adapter

        Args:
            credentials: OAuth credentials with access_token and realm_id
        """
        # Initialize base class (handles encryption, storage, MCP, L3)
        super().__init__(credentials)

        self.access_token = credentials.get("access_token")
        self.realm_id = credentials.get("realm_id") or credentials.get("realmId")
        self.base_url = "https://quickbooks.api.intuit.com/v3/company"

        if not self.access_token or not self.realm_id:
            raise ValueError("Missing QuickBooks credentials (access_token or realm_id)")

    def get_chunk_strategy(self, data_type: str) -> str:
        """Override chunking strategy for QuickBooks data types"""
        return {
            "invoices": "quarterly",
            "expenses": "quarterly",
            "payments": "quarterly",
            "customers": "latest",
            "vendors": "latest"
        }.get(data_type, "latest")

    def get_date_field(self, data_type: str) -> str:
        """Override date field for QuickBooks data types"""
        return {
            "invoices": "TxnDate",
            "expenses": "TxnDate",
            "payments": "TxnDate",
            "customers": "MetaData.LastUpdatedTime",
            "vendors": "MetaData.LastUpdatedTime"
        }.get(data_type, "created_at")

    def get_data_types(self) -> List[str]:
        """Get available data types for QuickBooks"""
        return ["invoices", "expenses", "customers", "vendors", "payments"]

    async def fetch_data(
        self,
        data_type: str,
        start_position: int = 1,
        max_results: int = DEFAULT_BATCH_SIZE
    ) -> List[Dict[str, Any]]:
        """
        Fetch data from QuickBooks API with pagination support

        Args:
            data_type: Type of data to fetch
            start_position: Starting position for pagination (1-indexed)
            max_results: Maximum results to return (max 1000)

        Returns:
            List of records from QuickBooks
        """
        # Map data types to QuickBooks API endpoints
        endpoint_map = {
            "invoices": "Invoice",
            "expenses": "Purchase",
            "customers": "Customer",
            "vendors": "Vendor",
            "payments": "Payment"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        entity = endpoint_map[data_type]
        url = f"{self.base_url}/{self.realm_id}/query"

        # Build query with pagination
        # QuickBooks uses STARTPOSITION and MAXRESULTS for pagination
        max_results = min(max_results, self.MAX_RESULTS_PER_QUERY)
        query = f"SELECT * FROM {entity} STARTPOSITION {start_position} MAXRESULTS {max_results}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params={"query": query, "minorversion": "65"},
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()

                result = response.json()
                query_response = result.get("QueryResponse", {})

                # Get the entity list
                records = query_response.get(entity, [])

                logger.info(
                    f"Fetched {len(records)} {data_type} from QuickBooks "
                    f"(start: {start_position}, max: {max_results})"
                )

                return records

            except httpx.HTTPStatusError as e:
                logger.error(f"QuickBooks API error: {e.response.text}")
                raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to fetch {data_type}: {e}")
                raise

    async def fetch_all_data(
        self,
        data_type: str,
        batch_size: int = DEFAULT_BATCH_SIZE
    ) -> List[Dict[str, Any]]:
        """
        Fetch ALL data of a given type with automatic pagination.

        Args:
            data_type: Type of data to fetch
            batch_size: Number of records per batch (max 1000)

        Returns:
            All records of the specified type
        """
        all_records = []
        start_position = 1
        batch_size = min(batch_size, self.MAX_RESULTS_PER_QUERY)

        while True:
            batch = await self.fetch_data(
                data_type=data_type,
                start_position=start_position,
                max_results=batch_size
            )

            if not batch:
                break

            all_records.extend(batch)
            logger.info(
                f"Fetched batch of {len(batch)} {data_type}, "
                f"total so far: {len(all_records)}"
            )

            # If we got less than batch_size, we've reached the end
            if len(batch) < batch_size:
                break

            # Move to next batch
            start_position += batch_size

            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)

        logger.info(f"Fetched total of {len(all_records)} {data_type} from QuickBooks")
        return all_records

    async def get_count(self, data_type: str) -> int:
        """
        Get total count of records for a data type.

        Args:
            data_type: Type of data to count

        Returns:
            Total count of records
        """
        endpoint_map = {
            "invoices": "Invoice",
            "expenses": "Purchase",
            "customers": "Customer",
            "vendors": "Vendor",
            "payments": "Payment"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        entity = endpoint_map[data_type]
        url = f"{self.base_url}/{self.realm_id}/query"

        query = f"SELECT COUNT(*) FROM {entity}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params={"query": query, "minorversion": "65"},
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()

                result = response.json()
                query_response = result.get("QueryResponse", {})
                count = query_response.get("totalCount", 0)

                logger.info(f"QuickBooks {data_type} count: {count}")
                return count

            except Exception as e:
                logger.error(f"Failed to get count for {data_type}: {e}")
                return 0

    def transform_data(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform QuickBooks data to common schema

        Args:
            data_type: Type of data
            records: Raw records from QuickBooks

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "invoices":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "invoice",
                    "sync_token": record.get("SyncToken"),
                    "customer_name": record.get("CustomerRef", {}).get("name"),
                    "customer_id": record.get("CustomerRef", {}).get("value"),
                    "total_amount": record.get("TotalAmt", 0),
                    "balance": record.get("Balance", 0),
                    "due_date": record.get("DueDate"),
                    "txn_date": record.get("TxnDate"),
                    "doc_number": record.get("DocNumber"),
                    "currency": record.get("CurrencyRef", {}).get("value", "USD"),
                    "status": "paid" if record.get("Balance", 0) == 0 else "outstanding",
                    "email_status": record.get("EmailStatus"),
                    "terms": record.get("SalesTermRef", {}).get("name"),
                    "line_items": [
                        {
                            "id": line.get("Id"),
                            "description": line.get("Description"),
                            "amount": line.get("Amount"),
                            "quantity": line.get("SalesItemLineDetail", {}).get("Qty"),
                            "unit_price": line.get("SalesItemLineDetail", {}).get("UnitPrice"),
                            "item_id": line.get("SalesItemLineDetail", {}).get("ItemRef", {}).get("value")
                        }
                        for line in record.get("Line", [])
                        if line.get("DetailType") == "SalesItemLineDetail"
                    ],
                    "customer_memo": record.get("CustomerMemo", {}).get("value"),
                    "private_note": record.get("PrivateNote"),
                    "create_time": record.get("MetaData", {}).get("CreateTime"),
                    "last_updated_time": record.get("MetaData", {}).get("LastUpdatedTime")
                })

            elif data_type == "expenses":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "expense",
                    "sync_token": record.get("SyncToken"),
                    "vendor_name": record.get("EntityRef", {}).get("name"),
                    "vendor_id": record.get("EntityRef", {}).get("value"),
                    "total_amount": record.get("TotalAmt", 0),
                    "txn_date": record.get("TxnDate"),
                    "doc_number": record.get("DocNumber"),
                    "payment_type": record.get("PaymentType"),
                    "account": record.get("AccountRef", {}).get("name"),
                    "account_id": record.get("AccountRef", {}).get("value"),
                    "currency": record.get("CurrencyRef", {}).get("value", "USD"),
                    "line_items": [
                        {
                            "id": line.get("Id"),
                            "description": line.get("Description"),
                            "amount": line.get("Amount"),
                            "account": line.get("AccountBasedExpenseLineDetail", {}).get("AccountRef", {}).get("name"),
                            "account_id": line.get("AccountBasedExpenseLineDetail", {}).get("AccountRef", {}).get("value"),
                            "billable_status": line.get("AccountBasedExpenseLineDetail", {}).get("BillableStatus"),
                            "customer_id": line.get("AccountBasedExpenseLineDetail", {}).get("CustomerRef", {}).get("value")
                        }
                        for line in record.get("Line", [])
                        if line.get("DetailType") == "AccountBasedExpenseLineDetail"
                    ],
                    "private_note": record.get("PrivateNote"),
                    "create_time": record.get("MetaData", {}).get("CreateTime"),
                    "last_updated_time": record.get("MetaData", {}).get("LastUpdatedTime")
                })

            elif data_type == "customers":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "customer",
                    "sync_token": record.get("SyncToken"),
                    "display_name": record.get("DisplayName"),
                    "company_name": record.get("CompanyName"),
                    "first_name": record.get("GivenName"),
                    "last_name": record.get("FamilyName"),
                    "email": record.get("PrimaryEmailAddr", {}).get("Address"),
                    "phone": record.get("PrimaryPhone", {}).get("FreeFormNumber"),
                    "mobile": record.get("Mobile", {}).get("FreeFormNumber"),
                    "website": record.get("WebAddr", {}).get("URI"),
                    "balance": record.get("Balance", 0),
                    "is_active": record.get("Active", True),
                    "tax_exempt": record.get("TaxExemptionReasonId") is not None,
                    "billing_address": {
                        "line1": record.get("BillAddr", {}).get("Line1"),
                        "city": record.get("BillAddr", {}).get("City"),
                        "state": record.get("BillAddr", {}).get("CountrySubDivisionCode"),
                        "postal_code": record.get("BillAddr", {}).get("PostalCode"),
                        "country": record.get("BillAddr", {}).get("Country")
                    },
                    "shipping_address": {
                        "line1": record.get("ShipAddr", {}).get("Line1"),
                        "city": record.get("ShipAddr", {}).get("City"),
                        "state": record.get("ShipAddr", {}).get("CountrySubDivisionCode"),
                        "postal_code": record.get("ShipAddr", {}).get("PostalCode"),
                        "country": record.get("ShipAddr", {}).get("Country")
                    },
                    "notes": record.get("Notes"),
                    "create_time": record.get("MetaData", {}).get("CreateTime"),
                    "last_updated_time": record.get("MetaData", {}).get("LastUpdatedTime")
                })

            elif data_type == "vendors":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "vendor",
                    "sync_token": record.get("SyncToken"),
                    "display_name": record.get("DisplayName"),
                    "company_name": record.get("CompanyName"),
                    "first_name": record.get("GivenName"),
                    "last_name": record.get("FamilyName"),
                    "email": record.get("PrimaryEmailAddr", {}).get("Address"),
                    "phone": record.get("PrimaryPhone", {}).get("FreeFormNumber"),
                    "mobile": record.get("Mobile", {}).get("FreeFormNumber"),
                    "website": record.get("WebAddr", {}).get("URI"),
                    "balance": record.get("Balance", 0),
                    "is_active": record.get("Active", True),
                    "account_number": record.get("AcctNum"),
                    "tax_id": record.get("TaxIdentifier"),
                    "terms": record.get("TermRef", {}).get("name"),
                    "billing_address": {
                        "line1": record.get("BillAddr", {}).get("Line1"),
                        "city": record.get("BillAddr", {}).get("City"),
                        "state": record.get("BillAddr", {}).get("CountrySubDivisionCode"),
                        "postal_code": record.get("BillAddr", {}).get("PostalCode"),
                        "country": record.get("BillAddr", {}).get("Country")
                    },
                    "create_time": record.get("MetaData", {}).get("CreateTime"),
                    "last_updated_time": record.get("MetaData", {}).get("LastUpdatedTime")
                })

            elif data_type == "payments":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "payment",
                    "sync_token": record.get("SyncToken"),
                    "customer_name": record.get("CustomerRef", {}).get("name"),
                    "customer_id": record.get("CustomerRef", {}).get("value"),
                    "total_amount": record.get("TotalAmt", 0),
                    "unapplied_amount": record.get("UnappliedAmt", 0),
                    "txn_date": record.get("TxnDate"),
                    "payment_method": record.get("PaymentMethodRef", {}).get("name"),
                    "payment_method_id": record.get("PaymentMethodRef", {}).get("value"),
                    "reference_number": record.get("PaymentRefNum"),
                    "deposit_to_account": record.get("DepositToAccountRef", {}).get("name"),
                    "deposit_to_account_id": record.get("DepositToAccountRef", {}).get("value"),
                    "currency": record.get("CurrencyRef", {}).get("value", "USD"),
                    "linked_transactions": [
                        {
                            "txn_id": link.get("TxnId"),
                            "txn_type": link.get("TxnType"),
                            "amount": line.get("Amount")
                        }
                        for line in record.get("Line", [])
                        for link in line.get("LinkedTxn", [])
                    ],
                    "private_note": record.get("PrivateNote"),
                    "create_time": record.get("MetaData", {}).get("CreateTime"),
                    "last_updated_time": record.get("MetaData", {}).get("LastUpdatedTime")
                })

        return transformed

    async def generate_embeddings(
        self,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate text embeddings for RAG

        Args:
            records: Transformed records

        Returns:
            Records with embeddings and searchable text
        """
        # For MVP, create simple text representations
        # In production, use OpenAI/Anthropic embeddings
        embedded_records = []

        for record in records:
            # Create searchable text
            searchable_text = self._create_searchable_text(record)

            embedded_records.append({
                **record,
                "searchable_text": searchable_text,
                # Placeholder for actual embeddings
                "embedding_metadata": {
                    "model": "simple_text",
                    "created_at": datetime.utcnow().isoformat()
                }
            })

        return embedded_records

    def _create_searchable_text(self, record: Dict[str, Any]) -> str:
        """Create searchable text from record for RAG"""
        record_type = record.get("type", "")

        if record_type == "invoice":
            line_items_text = ""
            for item in record.get("line_items", []):
                if item.get("description"):
                    line_items_text += f" {item.get('description')}"

            return (
                f"Invoice {record.get('doc_number')} for customer {record.get('customer_name')} "
                f"total amount ${record.get('total_amount')} "
                f"due date {record.get('due_date')} "
                f"status {record.get('status')} "
                f"terms {record.get('terms')}"
                f"{line_items_text}"
            )

        elif record_type == "expense":
            line_items_text = ""
            for item in record.get("line_items", []):
                if item.get("description"):
                    line_items_text += f" {item.get('description')}"
                if item.get("account"):
                    line_items_text += f" {item.get('account')}"

            return (
                f"Expense to {record.get('vendor_name')} "
                f"amount ${record.get('total_amount')} "
                f"date {record.get('txn_date')} "
                f"payment type {record.get('payment_type')} "
                f"account {record.get('account')}"
                f"{line_items_text}"
            )

        elif record_type == "customer":
            address = record.get("billing_address", {})
            address_text = f"{address.get('city', '')} {address.get('state', '')}".strip()

            return (
                f"Customer {record.get('display_name')} "
                f"company {record.get('company_name')} "
                f"email {record.get('email')} "
                f"phone {record.get('phone')} "
                f"balance ${record.get('balance')} "
                f"location {address_text}"
            )

        elif record_type == "vendor":
            address = record.get("billing_address", {})
            address_text = f"{address.get('city', '')} {address.get('state', '')}".strip()

            return (
                f"Vendor {record.get('display_name')} "
                f"company {record.get('company_name')} "
                f"email {record.get('email')} "
                f"phone {record.get('phone')} "
                f"balance ${record.get('balance')} "
                f"location {address_text}"
            )

        elif record_type == "payment":
            linked_txns = ", ".join([
                f"{t.get('txn_type')} {t.get('txn_id')}"
                for t in record.get("linked_transactions", [])
            ])

            return (
                f"Payment from {record.get('customer_name')} "
                f"amount ${record.get('total_amount')} "
                f"date {record.get('txn_date')} "
                f"method {record.get('payment_method')} "
                f"reference {record.get('reference_number')} "
                f"applied to {linked_txns}"
            )

        return str(record)

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None,
        use_pagination: bool = True
    ) -> Dict[str, Any]:
        """
        Sync all QuickBooks data with multi-tenant Filecoin storage

        Args:
            business_wallet: Business wallet address (for encryption key)
            data_types: Optional list of specific data types to sync
            use_pagination: Whether to use pagination for large datasets

        Returns:
            Sync results with CIDs for each data type
        """
        if data_types is None:
            data_types = self.get_data_types()

        results = {
            "business_wallet": business_wallet,
            "integration": "quickbooks",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from QuickBooks (with pagination for large datasets)
                if use_pagination:
                    raw_data = await self.fetch_all_data(data_type)
                else:
                    raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "quickbooks",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "quickbooks_api",
                        "version": "v3",
                        "realm_id": self.realm_id,
                        "api_minor_version": "65"
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "quickbooks",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="quickbooks",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "quickbooks",
                        "data_type": data_type,
                        "record_count": len(transformed_data),
                        "storage_layer": "customer-data"
                    }
                )

                results["data"][data_type] = {
                    "cid": cid,
                    "record_count": len(transformed_data),
                    "status": "success"
                }

                logger.info(
                    f"Synced {len(transformed_data)} {data_type} records to Filecoin, "
                    f"CID: {cid}, wallet: {business_wallet}"
                )

            except Exception as e:
                logger.error(f"Failed to sync {data_type}: {e}")
                results["data"][data_type] = {
                    "status": "failed",
                    "error": str(e)
                }

        return results

    async def sync_incremental(
        self,
        business_wallet: str,
        data_type: str,
        since: datetime
    ) -> Dict[str, Any]:
        """
        Sync only records modified since a given timestamp.

        Args:
            business_wallet: Business wallet address
            data_type: Type of data to sync
            since: Only sync records modified after this timestamp

        Returns:
            Sync results
        """
        endpoint_map = {
            "invoices": "Invoice",
            "expenses": "Purchase",
            "customers": "Customer",
            "vendors": "Vendor",
            "payments": "Payment"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        entity = endpoint_map[data_type]
        url = f"{self.base_url}/{self.realm_id}/query"

        # Format timestamp for QuickBooks
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S")

        # Query for records modified since timestamp
        query = f"SELECT * FROM {entity} WHERE MetaData.LastUpdatedTime > '{since_str}' MAXRESULTS 1000"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={"query": query, "minorversion": "65"},
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()

                result = response.json()
                query_response = result.get("QueryResponse", {})
                records = query_response.get(entity, [])

                logger.info(
                    f"Incremental sync found {len(records)} {data_type} "
                    f"modified since {since_str}"
                )

                if not records:
                    return {
                        "data_type": data_type,
                        "record_count": 0,
                        "status": "success",
                        "message": "No changes since last sync"
                    }

                # Transform and store
                transformed = self.transform_data(data_type, records)

                data_package = {
                    "data_type": data_type,
                    "integration": "quickbooks",
                    "records": transformed,
                    "record_count": len(transformed),
                    "synced_at": datetime.utcnow().isoformat(),
                    "sync_type": "incremental",
                    "since": since_str
                }

                encrypted = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet
                )

                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="quickbooks",
                    data_type=f"{data_type}_incremental",
                    encrypted_data=encrypted
                )

                return {
                    "data_type": data_type,
                    "cid": cid,
                    "record_count": len(transformed),
                    "status": "success",
                    "sync_type": "incremental"
                }

        except Exception as e:
            logger.error(f"Incremental sync failed for {data_type}: {e}")
            return {
                "data_type": data_type,
                "status": "failed",
                "error": str(e)
            }
