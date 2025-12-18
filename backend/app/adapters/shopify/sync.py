"""
Shopify Sync Adapter
Fetches data from Shopify API with multi-tenant Filecoin storage
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class ShopifySync:
    """Sync adapter for Shopify integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Shopify sync adapter

        Args:
            credentials: OAuth credentials with access_token and shop_domain
        """
        self.access_token = credentials.get("access_token")
        self.shop_domain = credentials.get("shop_domain")

        if not self.access_token or not self.shop_domain:
            raise ValueError("Missing Shopify credentials")

        self.base_url = f"https://{self.shop_domain}/admin/api/2024-01"

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Shopify"""
        return ["orders", "products", "customers", "inventory"]

    async def fetch_data(self, data_type: str) -> List[Dict[str, Any]]:
        """
        Fetch data from Shopify API

        Args:
            data_type: Type of data to fetch

        Returns:
            List of records from Shopify
        """
        endpoint_map = {
            "orders": "orders.json",
            "products": "products.json",
            "customers": "customers.json",
            "inventory": "inventory_levels.json"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        endpoint = endpoint_map[data_type]
        url = f"{self.base_url}/{endpoint}"

        headers = {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }

        params = {"limit": 250}

        async with httpx.AsyncClient() as client:
            try:
                all_records = []
                page_url = url

                # Paginate through results
                while page_url and len(all_records) < 1000:
                    response = await client.get(
                        page_url,
                        params=params if page_url == url else None,
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()

                    result = response.json()

                    # Get records from response
                    key = data_type  # orders, products, customers, inventory_levels
                    if data_type == "inventory":
                        key = "inventory_levels"

                    records = result.get(key, [])
                    all_records.extend(records)

                    # Check for next page
                    link_header = response.headers.get("Link")
                    if link_header and "next" in link_header:
                        # Parse next page URL from Link header
                        next_link = [
                            link.split(";")[0].strip("<>")
                            for link in link_header.split(",")
                            if 'rel="next"' in link
                        ]
                        page_url = next_link[0] if next_link else None
                    else:
                        page_url = None

                logger.info(
                    f"Fetched {len(all_records)} {data_type} from Shopify"
                )

                return all_records

            except httpx.HTTPStatusError as e:
                logger.error(f"Shopify API error: {e.response.text}")
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
        Transform Shopify data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Shopify

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "orders":
                transformed.append({
                    "id": record.get("id"),
                    "type": "order",
                    "order_number": record.get("order_number"),
                    "customer_name": f"{record.get('customer', {}).get('first_name', '')} {record.get('customer', {}).get('last_name', '')}".strip(),
                    "customer_email": record.get("email"),
                    "total_price": float(record.get("total_price", 0)),
                    "currency": record.get("currency"),
                    "financial_status": record.get("financial_status"),
                    "fulfillment_status": record.get("fulfillment_status"),
                    "created_at": record.get("created_at"),
                    "line_items": [
                        {
                            "product_name": item.get("name"),
                            "quantity": item.get("quantity"),
                            "price": float(item.get("price", 0)),
                            "sku": item.get("sku")
                        }
                        for item in record.get("line_items", [])
                    ]
                })

            elif data_type == "products":
                transformed.append({
                    "id": record.get("id"),
                    "type": "product",
                    "title": record.get("title"),
                    "vendor": record.get("vendor"),
                    "product_type": record.get("product_type"),
                    "price": float(record.get("variants", [{}])[0].get("price", 0)) if record.get("variants") else 0,
                    "inventory_quantity": sum([v.get("inventory_quantity", 0) for v in record.get("variants", [])]),
                    "status": record.get("status"),
                    "tags": record.get("tags", "").split(","),
                    "created_at": record.get("created_at"),
                    "variants": [
                        {
                            "title": v.get("title"),
                            "price": float(v.get("price", 0)),
                            "sku": v.get("sku"),
                            "inventory_quantity": v.get("inventory_quantity", 0)
                        }
                        for v in record.get("variants", [])
                    ]
                })

            elif data_type == "customers":
                transformed.append({
                    "id": record.get("id"),
                    "type": "customer",
                    "name": f"{record.get('first_name', '')} {record.get('last_name', '')}".strip(),
                    "email": record.get("email"),
                    "phone": record.get("phone"),
                    "total_spent": float(record.get("total_spent", 0)),
                    "orders_count": record.get("orders_count", 0),
                    "state": record.get("state"),
                    "created_at": record.get("created_at"),
                    "default_address": {
                        "address1": record.get("default_address", {}).get("address1"),
                        "city": record.get("default_address", {}).get("city"),
                        "province": record.get("default_address", {}).get("province"),
                        "country": record.get("default_address", {}).get("country"),
                        "zip": record.get("default_address", {}).get("zip")
                    } if record.get("default_address") else None
                })

            elif data_type == "inventory":
                transformed.append({
                    "id": record.get("inventory_item_id"),
                    "type": "inventory",
                    "location_id": record.get("location_id"),
                    "available": record.get("available"),
                    "updated_at": record.get("updated_at")
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
        embedded_records = []

        for record in records:
            searchable_text = self._create_searchable_text(record)

            embedded_records.append({
                **record,
                "searchable_text": searchable_text,
                "embedding_metadata": {
                    "model": "simple_text",
                    "created_at": datetime.utcnow().isoformat()
                }
            })

        return embedded_records

    def _create_searchable_text(self, record: Dict[str, Any]) -> str:
        """Create searchable text from record for RAG"""
        record_type = record.get("type", "")

        if record_type == "order":
            items_text = ", ".join([
                f"{item['quantity']}x {item['product_name']}"
                for item in record.get("line_items", [])[:3]
            ])
            return (
                f"Order #{record.get('order_number')} "
                f"customer {record.get('customer_name')} "
                f"total ${record.get('total_price')} "
                f"status {record.get('financial_status')} "
                f"items: {items_text}"
            )

        elif record_type == "product":
            return (
                f"Product {record.get('title')} "
                f"vendor {record.get('vendor')} "
                f"type {record.get('product_type')} "
                f"price ${record.get('price')} "
                f"inventory {record.get('inventory_quantity')} units "
                f"tags {', '.join(record.get('tags', []))}"
            )

        elif record_type == "customer":
            return (
                f"Customer {record.get('name')} "
                f"email {record.get('email')} "
                f"total spent ${record.get('total_spent')} "
                f"orders {record.get('orders_count')} "
                f"state {record.get('state')}"
            )

        elif record_type == "inventory":
            return (
                f"Inventory item {record.get('id')} "
                f"location {record.get('location_id')} "
                f"available {record.get('available')}"
            )

        return str(record)

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Shopify data with multi-tenant Filecoin storage

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
            "integration": "shopify",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Shopify
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "shopify",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "shopify_api",
                        "version": "2024-01",
                        "shop_domain": self.shop_domain
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "shopify",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="shopify",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "shopify",
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
