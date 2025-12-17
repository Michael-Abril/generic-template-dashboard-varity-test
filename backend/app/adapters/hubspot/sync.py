"""
HubSpot Sync Adapter
Fetches CRM data from HubSpot API with multi-tenant Filecoin storage
"""
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class HubSpotSync:
    """Sync adapter for HubSpot integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize HubSpot sync adapter

        Args:
            credentials: OAuth credentials with access_token
        """
        self.access_token = credentials.get("access_token")
        self.api_base = "https://api.hubapi.com"

        if not self.access_token:
            raise ValueError("Missing HubSpot access token")

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for HubSpot"""
        return ["contacts", "deals", "companies", "emails", "tickets"]

    async def fetch_data(self, data_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch data from HubSpot API

        Args:
            data_type: Type of data to fetch
            limit: Maximum records to fetch

        Returns:
            List of records from HubSpot
        """
        # Map data types to HubSpot API endpoints
        endpoint_map = {
            "contacts": "/crm/v3/objects/contacts",
            "deals": "/crm/v3/objects/deals",
            "companies": "/crm/v3/objects/companies",
            "emails": "/crm/v3/objects/emails",
            "tickets": "/crm/v3/objects/tickets"
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
        after = None

        async with httpx.AsyncClient() as client:
            while len(all_records) < limit:
                try:
                    params = {
                        "limit": min(100, limit - len(all_records))
                    }

                    if after:
                        params["after"] = after

                    response = await client.get(
                        url,
                        params=params,
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()

                    result = response.json()
                    records = result.get("results", [])

                    if not records:
                        break

                    all_records.extend(records)

                    # Check for pagination
                    paging = result.get("paging", {})
                    if "next" not in paging:
                        break

                    after = paging["next"].get("after")
                    if not after:
                        break

                except httpx.HTTPStatusError as e:
                    logger.error(f"HubSpot API error: {e.response.text}")
                    raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
                except Exception as e:
                    logger.error(f"Failed to fetch {data_type}: {e}")
                    raise

        logger.info(f"Fetched {len(all_records)} {data_type} from HubSpot")
        return all_records

    def transform_data(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform HubSpot data to common schema

        Args:
            data_type: Type of data
            records: Raw records from HubSpot

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            properties = record.get("properties", {})

            if data_type == "contacts":
                transformed.append({
                    "id": record.get("id"),
                    "type": "contact",
                    "email": properties.get("email"),
                    "firstname": properties.get("firstname"),
                    "lastname": properties.get("lastname"),
                    "phone": properties.get("phone"),
                    "company": properties.get("company"),
                    "jobtitle": properties.get("jobtitle"),
                    "lifecyclestage": properties.get("lifecyclestage"),
                    "createdate": properties.get("createdate"),
                    "lastmodifieddate": properties.get("lastmodifieddate")
                })

            elif data_type == "deals":
                transformed.append({
                    "id": record.get("id"),
                    "type": "deal",
                    "dealname": properties.get("dealname"),
                    "amount": properties.get("amount"),
                    "dealstage": properties.get("dealstage"),
                    "pipeline": properties.get("pipeline"),
                    "closedate": properties.get("closedate"),
                    "createdate": properties.get("createdate"),
                    "hubspot_owner_id": properties.get("hubspot_owner_id"),
                    "dealtype": properties.get("dealtype")
                })

            elif data_type == "companies":
                transformed.append({
                    "id": record.get("id"),
                    "type": "company",
                    "name": properties.get("name"),
                    "domain": properties.get("domain"),
                    "industry": properties.get("industry"),
                    "phone": properties.get("phone"),
                    "city": properties.get("city"),
                    "state": properties.get("state"),
                    "country": properties.get("country"),
                    "numberofemployees": properties.get("numberofemployees"),
                    "annualrevenue": properties.get("annualrevenue"),
                    "createdate": properties.get("createdate")
                })

            elif data_type == "emails":
                transformed.append({
                    "id": record.get("id"),
                    "type": "email",
                    "subject": properties.get("hs_email_subject"),
                    "from_email": properties.get("hs_email_from_email"),
                    "to_email": properties.get("hs_email_to_email"),
                    "status": properties.get("hs_email_status"),
                    "direction": properties.get("hs_email_direction"),
                    "createdate": properties.get("createdate"),
                    "hs_timestamp": properties.get("hs_timestamp")
                })

            elif data_type == "tickets":
                transformed.append({
                    "id": record.get("id"),
                    "type": "ticket",
                    "subject": properties.get("subject"),
                    "content": properties.get("content"),
                    "hs_ticket_priority": properties.get("hs_ticket_priority"),
                    "hs_pipeline_stage": properties.get("hs_pipeline_stage"),
                    "createdate": properties.get("createdate"),
                    "closed_date": properties.get("closed_date"),
                    "hubspot_owner_id": properties.get("hubspot_owner_id")
                })

        return transformed

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all HubSpot data with multi-tenant Filecoin storage

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
            "integration": "hubspot",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from HubSpot
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "hubspot",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "hubspot_api",
                        "version": "v3"
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "hubspot",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="hubspot",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "hubspot",
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

    async def create_contact(self, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new contact in HubSpot

        Args:
            contact_data: Contact properties

        Returns:
            Created contact data
        """
        url = f"{self.api_base}/crm/v3/objects/contacts"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": contact_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"Created contact: {result.get('id')}")
                return result

            except httpx.HTTPStatusError as e:
                logger.error(f"HubSpot API error creating contact: {e.response.text}")
                raise Exception(f"Failed to create contact: {e.response.text}")

    async def update_contact(self, contact_id: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing contact in HubSpot

        Args:
            contact_id: HubSpot contact ID
            contact_data: Contact properties to update

        Returns:
            Updated contact data
        """
        url = f"{self.api_base}/crm/v3/objects/contacts/{contact_id}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": contact_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.patch(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"Updated contact: {contact_id}")
                return result

            except httpx.HTTPStatusError as e:
                logger.error(f"HubSpot API error updating contact: {e.response.text}")
                raise Exception(f"Failed to update contact: {e.response.text}")

    async def delete_contact(self, contact_id: str) -> bool:
        """
        Delete a contact from HubSpot

        Args:
            contact_id: HubSpot contact ID

        Returns:
            True if successful
        """
        url = f"{self.api_base}/crm/v3/objects/contacts/{contact_id}"
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(
                    url,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"Deleted contact: {contact_id}")
                return True

            except httpx.HTTPStatusError as e:
                logger.error(f"HubSpot API error deleting contact: {e.response.text}")
                raise Exception(f"Failed to delete contact: {e.response.text}")

    async def create_deal(self, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new deal in HubSpot"""
        url = f"{self.api_base}/crm/v3/objects/deals"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": deal_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Error creating deal: {e.response.text}")
                raise Exception(f"Failed to create deal: {e.response.text}")

    async def update_deal(self, deal_id: str, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing deal in HubSpot"""
        url = f"{self.api_base}/crm/v3/objects/deals/{deal_id}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": deal_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.patch(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Error updating deal: {e.response.text}")
                raise Exception(f"Failed to update deal: {e.response.text}")

    async def create_company(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new company in HubSpot"""
        url = f"{self.api_base}/crm/v3/objects/companies"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": company_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Error creating company: {e.response.text}")
                raise Exception(f"Failed to create company: {e.response.text}")

    async def create_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new ticket in HubSpot"""
        url = f"{self.api_base}/crm/v3/objects/tickets"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {"properties": ticket_data}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Error creating ticket: {e.response.text}")
                raise Exception(f"Failed to create ticket: {e.response.text}")
