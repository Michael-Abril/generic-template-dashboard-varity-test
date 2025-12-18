"""
QuickBooks Sync Adapter
Fetches data from QuickBooks API with multi-tenant Filecoin storage
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class QuickBooksSync:
    """Sync adapter for QuickBooks integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize QuickBooks sync adapter

        Args:
            credentials: OAuth credentials with access_token and realm_id
        """
        self.access_token = credentials.get("access_token")
        self.realm_id = credentials.get("realm_id")
        self.base_url = "https://quickbooks.api.intuit.com/v3/company"

        if not self.access_token or not self.realm_id:
            raise ValueError("Missing QuickBooks credentials")

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for QuickBooks"""
        return ["invoices", "expenses", "customers", "vendors", "payments"]

    async def fetch_data(self, data_type: str) -> List[Dict[str, Any]]:
        """
        Fetch data from QuickBooks API

        Args:
            data_type: Type of data to fetch

        Returns:
            List of records from QuickBooks
        """
        # Map data types to QuickBooks API endpoints
        endpoint_map = {
            "invoices": "invoice",
            "expenses": "purchase",
            "customers": "customer",
            "vendors": "vendor",
            "payments": "payment"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        endpoint = endpoint_map[data_type]
        url = f"{self.base_url}/{self.realm_id}/query"

        # Build query
        query = f"SELECT * FROM {endpoint} MAXRESULTS 1000"

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
                records = query_response.get(endpoint.capitalize(), [])

                logger.info(
                    f"Fetched {len(records)} {data_type} from QuickBooks"
                )

                return records

            except httpx.HTTPStatusError as e:
                logger.error(f"QuickBooks API error: {e.response.text}")
                raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to fetch {data_type}: {e}")
                raise

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
                    "customer_name": record.get("CustomerRef", {}).get("name"),
                    "customer_id": record.get("CustomerRef", {}).get("value"),
                    "total_amount": record.get("TotalAmt", 0),
                    "balance": record.get("Balance", 0),
                    "due_date": record.get("DueDate"),
                    "txn_date": record.get("TxnDate"),
                    "doc_number": record.get("DocNumber"),
                    "currency": record.get("CurrencyRef", {}).get("value", "USD"),
                    "status": "paid" if record.get("Balance", 0) == 0 else "outstanding",
                    "line_items": [
                        {
                            "description": line.get("Description"),
                            "amount": line.get("Amount"),
                            "quantity": line.get("SalesItemLineDetail", {}).get("Qty")
                        }
                        for line in record.get("Line", [])
                        if line.get("DetailType") == "SalesItemLineDetail"
                    ]
                })

            elif data_type == "expenses":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "expense",
                    "vendor_name": record.get("EntityRef", {}).get("name"),
                    "vendor_id": record.get("EntityRef", {}).get("value"),
                    "total_amount": record.get("TotalAmt", 0),
                    "txn_date": record.get("TxnDate"),
                    "doc_number": record.get("DocNumber"),
                    "payment_type": record.get("PaymentType"),
                    "account": record.get("AccountRef", {}).get("name"),
                    "line_items": [
                        {
                            "description": line.get("Description"),
                            "amount": line.get("Amount"),
                            "account": line.get("AccountBasedExpenseLineDetail", {}).get("AccountRef", {}).get("name")
                        }
                        for line in record.get("Line", [])
                        if line.get("DetailType") == "AccountBasedExpenseLineDetail"
                    ]
                })

            elif data_type == "customers":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "customer",
                    "display_name": record.get("DisplayName"),
                    "company_name": record.get("CompanyName"),
                    "email": record.get("PrimaryEmailAddr", {}).get("Address"),
                    "phone": record.get("PrimaryPhone", {}).get("FreeFormNumber"),
                    "balance": record.get("Balance", 0),
                    "billing_address": {
                        "line1": record.get("BillAddr", {}).get("Line1"),
                        "city": record.get("BillAddr", {}).get("City"),
                        "state": record.get("BillAddr", {}).get("CountrySubDivisionCode"),
                        "postal_code": record.get("BillAddr", {}).get("PostalCode")
                    }
                })

            elif data_type == "vendors":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "vendor",
                    "display_name": record.get("DisplayName"),
                    "company_name": record.get("CompanyName"),
                    "email": record.get("PrimaryEmailAddr", {}).get("Address"),
                    "phone": record.get("PrimaryPhone", {}).get("FreeFormNumber"),
                    "balance": record.get("Balance", 0)
                })

            elif data_type == "payments":
                transformed.append({
                    "id": record.get("Id"),
                    "type": "payment",
                    "customer_name": record.get("CustomerRef", {}).get("name"),
                    "total_amount": record.get("TotalAmt", 0),
                    "txn_date": record.get("TxnDate"),
                    "payment_method": record.get("PaymentMethodRef", {}).get("name")
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
            return (
                f"Invoice {record.get('doc_number')} for customer {record.get('customer_name')} "
                f"total amount ${record.get('total_amount')} "
                f"due date {record.get('due_date')} "
                f"status {record.get('status')}"
            )

        elif record_type == "expense":
            return (
                f"Expense to {record.get('vendor_name')} "
                f"amount ${record.get('total_amount')} "
                f"date {record.get('txn_date')} "
                f"payment type {record.get('payment_type')}"
            )

        elif record_type == "customer":
            return (
                f"Customer {record.get('display_name')} "
                f"company {record.get('company_name')} "
                f"email {record.get('email')} "
                f"balance ${record.get('balance')}"
            )

        elif record_type == "vendor":
            return (
                f"Vendor {record.get('display_name')} "
                f"company {record.get('company_name')} "
                f"email {record.get('email')}"
            )

        elif record_type == "payment":
            return (
                f"Payment from {record.get('customer_name')} "
                f"amount ${record.get('total_amount')} "
                f"date {record.get('txn_date')}"
            )

        return str(record)

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all QuickBooks data with multi-tenant Filecoin storage

        Args:
            business_wallet: Business wallet address (for encryption key)
            data_types: Optional list of specific data types to sync

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
                # 1. Fetch data from QuickBooks
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
                        "realm_id": self.realm_id
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
