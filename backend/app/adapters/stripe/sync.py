"""
Stripe Sync Adapter
Fetches payment data from Stripe API with multi-tenant Filecoin storage
"""
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class StripeSync:
    """Sync adapter for Stripe integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Stripe sync adapter

        Args:
            credentials: OAuth credentials with access_token (secret key)
        """
        self.access_token = credentials.get("access_token")
        self.api_base = "https://api.stripe.com/v1"

        if not self.access_token:
            raise ValueError("Missing Stripe access token")

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Stripe"""
        return ["customers", "payments", "subscriptions", "invoices", "payouts", "charges"]

    async def fetch_data(self, data_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch data from Stripe API

        Args:
            data_type: Type of data to fetch
            limit: Maximum records to fetch (default 100)

        Returns:
            List of records from Stripe
        """
        # Map data types to Stripe API endpoints
        endpoint_map = {
            "customers": "/customers",
            "payments": "/payment_intents",
            "subscriptions": "/subscriptions",
            "invoices": "/invoices",
            "payouts": "/payouts",
            "charges": "/charges"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        endpoint = endpoint_map[data_type]
        url = f"{self.api_base}{endpoint}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        all_records = []
        starting_after = None

        async with httpx.AsyncClient() as client:
            while len(all_records) < limit:
                try:
                    params = {
                        "limit": min(100, limit - len(all_records))
                    }

                    if starting_after:
                        params["starting_after"] = starting_after

                    response = await client.get(
                        url,
                        params=params,
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()

                    result = response.json()
                    records = result.get("data", [])

                    if not records:
                        break

                    all_records.extend(records)

                    # Check if there are more records
                    if not result.get("has_more", False):
                        break

                    # Get last record ID for pagination
                    starting_after = records[-1]["id"]

                except httpx.HTTPStatusError as e:
                    logger.error(f"Stripe API error: {e.response.text}")
                    raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
                except Exception as e:
                    logger.error(f"Failed to fetch {data_type}: {e}")
                    raise

        logger.info(f"Fetched {len(all_records)} {data_type} from Stripe")
        return all_records

    def transform_data(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform Stripe data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Stripe

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "customers":
                transformed.append({
                    "id": record.get("id"),
                    "type": "customer",
                    "email": record.get("email"),
                    "name": record.get("name"),
                    "description": record.get("description"),
                    "created": record.get("created"),
                    "balance": record.get("balance", 0),
                    "currency": record.get("currency", "usd"),
                    "metadata": record.get("metadata", {})
                })

            elif data_type == "payments":
                transformed.append({
                    "id": record.get("id"),
                    "type": "payment",
                    "amount": record.get("amount", 0) / 100,  # Convert cents to dollars
                    "currency": record.get("currency", "usd"),
                    "status": record.get("status"),
                    "customer_id": record.get("customer"),
                    "created": record.get("created"),
                    "description": record.get("description"),
                    "payment_method": record.get("payment_method"),
                    "metadata": record.get("metadata", {})
                })

            elif data_type == "subscriptions":
                transformed.append({
                    "id": record.get("id"),
                    "type": "subscription",
                    "customer_id": record.get("customer"),
                    "status": record.get("status"),
                    "current_period_start": record.get("current_period_start"),
                    "current_period_end": record.get("current_period_end"),
                    "plan_id": record.get("items", {}).get("data", [{}])[0].get("plan", {}).get("id") if record.get("items") else None,
                    "amount": record.get("items", {}).get("data", [{}])[0].get("plan", {}).get("amount", 0) / 100 if record.get("items") else 0,
                    "currency": record.get("currency", "usd"),
                    "metadata": record.get("metadata", {})
                })

            elif data_type == "invoices":
                transformed.append({
                    "id": record.get("id"),
                    "type": "invoice",
                    "customer_id": record.get("customer"),
                    "amount_due": record.get("amount_due", 0) / 100,
                    "amount_paid": record.get("amount_paid", 0) / 100,
                    "currency": record.get("currency", "usd"),
                    "status": record.get("status"),
                    "created": record.get("created"),
                    "due_date": record.get("due_date"),
                    "subscription_id": record.get("subscription"),
                    "metadata": record.get("metadata", {})
                })

            elif data_type == "payouts":
                transformed.append({
                    "id": record.get("id"),
                    "type": "payout",
                    "amount": record.get("amount", 0) / 100,
                    "currency": record.get("currency", "usd"),
                    "status": record.get("status"),
                    "arrival_date": record.get("arrival_date"),
                    "created": record.get("created"),
                    "description": record.get("description"),
                    "destination": record.get("destination"),
                    "metadata": record.get("metadata", {})
                })

            elif data_type == "charges":
                transformed.append({
                    "id": record.get("id"),
                    "type": "charge",
                    "amount": record.get("amount", 0) / 100,
                    "currency": record.get("currency", "usd"),
                    "status": record.get("status"),
                    "customer_id": record.get("customer"),
                    "created": record.get("created"),
                    "description": record.get("description"),
                    "paid": record.get("paid", False),
                    "refunded": record.get("refunded", False),
                    "metadata": record.get("metadata", {})
                })

        return transformed

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Stripe data with multi-tenant Filecoin storage

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
            "integration": "stripe",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Stripe
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "stripe",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "stripe_api",
                        "version": "v1"
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "stripe",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="stripe",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "stripe",
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

    def _create_searchable_text(self, record: Dict[str, Any]) -> str:
        """Create searchable text from record for RAG"""
        record_type = record.get("type", "")

        if record_type == "customer":
            return (
                f"Stripe customer {record.get('name')} "
                f"email {record.get('email')} "
                f"balance ${record.get('balance', 0) / 100}"
            )

        elif record_type == "payment":
            return (
                f"Stripe payment {record.get('id')} "
                f"amount ${record.get('amount')} {record.get('currency')} "
                f"status {record.get('status')}"
            )

        elif record_type == "subscription":
            return (
                f"Stripe subscription {record.get('id')} "
                f"customer {record.get('customer_id')} "
                f"amount ${record.get('amount')} "
                f"status {record.get('status')}"
            )

        elif record_type == "invoice":
            return (
                f"Stripe invoice {record.get('id')} "
                f"customer {record.get('customer_id')} "
                f"amount due ${record.get('amount_due')} "
                f"status {record.get('status')}"
            )

        elif record_type == "payout":
            return (
                f"Stripe payout {record.get('id')} "
                f"amount ${record.get('amount')} "
                f"status {record.get('status')}"
            )

        elif record_type == "charge":
            return (
                f"Stripe charge {record.get('id')} "
                f"amount ${record.get('amount')} "
                f"paid {record.get('paid')}"
            )

        return str(record)
