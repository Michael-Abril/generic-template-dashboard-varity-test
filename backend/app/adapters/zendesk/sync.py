"""
Zendesk Sync Adapter
Fetches support data from Zendesk API with multi-tenant Filecoin storage
"""
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import base64

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class ZendeskSync:
    """Sync adapter for Zendesk integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Zendesk sync adapter

        Args:
            credentials: OAuth credentials with access_token and subdomain
        """
        self.access_token = credentials.get("access_token")
        self.subdomain = credentials.get("subdomain", "")

        if not self.access_token:
            raise ValueError("Missing Zendesk access token")

        if not self.subdomain:
            raise ValueError("Missing Zendesk subdomain")

        self.api_base = f"https://{self.subdomain}.zendesk.com/api/v2"

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Zendesk"""
        return ["tickets", "users", "organizations", "satisfaction_ratings"]

    async def fetch_data(self, data_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch data from Zendesk API

        Args:
            data_type: Type of data to fetch
            limit: Maximum records to fetch

        Returns:
            List of records from Zendesk
        """
        # Map data types to Zendesk API endpoints
        endpoint_map = {
            "tickets": "/tickets.json",
            "users": "/users.json",
            "organizations": "/organizations.json",
            "satisfaction_ratings": "/satisfaction_ratings.json"
        }

        if data_type not in endpoint_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        endpoint = endpoint_map[data_type]
        url = f"{self.api_base}{endpoint}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        all_records = []
        next_page = None

        async with httpx.AsyncClient() as client:
            while len(all_records) < limit:
                try:
                    params = {
                        "per_page": min(100, limit - len(all_records))
                    }

                    # Use next_page URL if available
                    current_url = next_page if next_page else url

                    response = await client.get(
                        current_url,
                        params=params if not next_page else None,
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()

                    result = response.json()

                    # Get records from the appropriate key
                    if data_type == "tickets":
                        records = result.get("tickets", [])
                    elif data_type == "users":
                        records = result.get("users", [])
                    elif data_type == "organizations":
                        records = result.get("organizations", [])
                    elif data_type == "satisfaction_ratings":
                        records = result.get("satisfaction_ratings", [])
                    else:
                        records = []

                    if not records:
                        break

                    all_records.extend(records)

                    # Check for pagination
                    next_page = result.get("next_page")
                    if not next_page:
                        break

                except httpx.HTTPStatusError as e:
                    logger.error(f"Zendesk API error: {e.response.text}")
                    raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
                except Exception as e:
                    logger.error(f"Failed to fetch {data_type}: {e}")
                    raise

        logger.info(f"Fetched {len(all_records)} {data_type} from Zendesk")
        return all_records

    def transform_data(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform Zendesk data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Zendesk

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "tickets":
                transformed.append({
                    "id": record.get("id"),
                    "type": "ticket",
                    "subject": record.get("subject"),
                    "description": record.get("description"),
                    "status": record.get("status"),
                    "priority": record.get("priority"),
                    "ticket_type": record.get("type"),
                    "requester_id": record.get("requester_id"),
                    "submitter_id": record.get("submitter_id"),
                    "assignee_id": record.get("assignee_id"),
                    "organization_id": record.get("organization_id"),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at"),
                    "tags": record.get("tags", []),
                    "satisfaction_rating": record.get("satisfaction_rating")
                })

            elif data_type == "users":
                transformed.append({
                    "id": record.get("id"),
                    "type": "user",
                    "name": record.get("name"),
                    "email": record.get("email"),
                    "phone": record.get("phone"),
                    "role": record.get("role"),
                    "organization_id": record.get("organization_id"),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at"),
                    "verified": record.get("verified", False),
                    "active": record.get("active", True),
                    "time_zone": record.get("time_zone"),
                    "locale": record.get("locale")
                })

            elif data_type == "organizations":
                transformed.append({
                    "id": record.get("id"),
                    "type": "organization",
                    "name": record.get("name"),
                    "details": record.get("details"),
                    "notes": record.get("notes"),
                    "domain_names": record.get("domain_names", []),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at"),
                    "tags": record.get("tags", [])
                })

            elif data_type == "satisfaction_ratings":
                transformed.append({
                    "id": record.get("id"),
                    "type": "satisfaction_rating",
                    "ticket_id": record.get("ticket_id"),
                    "assignee_id": record.get("assignee_id"),
                    "requester_id": record.get("requester_id"),
                    "score": record.get("score"),
                    "comment": record.get("comment"),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at")
                })

        return transformed

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Zendesk data with multi-tenant Filecoin storage

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
            "integration": "zendesk",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Zendesk
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "zendesk",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "zendesk_api",
                        "version": "v2",
                        "subdomain": self.subdomain
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "zendesk",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="zendesk",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "zendesk",
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
