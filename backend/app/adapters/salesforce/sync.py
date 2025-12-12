"""
Salesforce Sync Adapter
Fetches data from Salesforce API with multi-tenant Filecoin storage
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class SalesforceSync:
    """Sync adapter for Salesforce integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Salesforce sync adapter

        Args:
            credentials: OAuth credentials with access_token and instance_url
        """
        self.access_token = credentials.get("access_token")
        self.instance_url = credentials.get("instance_url")

        if not self.access_token:
            raise ValueError("Missing Salesforce access token")

        # Use default instance URL if not provided
        if not self.instance_url:
            self.instance_url = "https://na1.salesforce.com"

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Salesforce"""
        return ["contacts", "opportunities", "accounts", "leads", "tasks"]

    async def fetch_data(self, data_type: str) -> List[Dict[str, Any]]:
        """
        Fetch data from Salesforce API

        Args:
            data_type: Type of data to fetch

        Returns:
            List of records from Salesforce
        """
        # Map data types to Salesforce objects
        object_map = {
            "contacts": "Contact",
            "opportunities": "Opportunity",
            "accounts": "Account",
            "leads": "Lead",
            "tasks": "Task"
        }

        if data_type not in object_map:
            raise ValueError(f"Unsupported data type: {data_type}")

        sobject = object_map[data_type]

        # Build SOQL query
        queries = {
            "contacts": "SELECT Id, Name, Email, Phone, Account.Name, Title, Department FROM Contact LIMIT 1000",
            "opportunities": "SELECT Id, Name, Amount, StageName, CloseDate, Account.Name, Probability FROM Opportunity LIMIT 1000",
            "accounts": "SELECT Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees, Phone, Website FROM Account LIMIT 1000",
            "leads": "SELECT Id, Name, Company, Email, Phone, Status, LeadSource FROM Lead LIMIT 1000",
            "tasks": "SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name FROM Task LIMIT 1000"
        }

        query = queries.get(data_type)

        url = f"{self.instance_url}/services/data/v58.0/query"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params={"q": query},
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()

                result = response.json()
                records = result.get("records", [])

                logger.info(
                    f"Fetched {len(records)} {data_type} from Salesforce"
                )

                return records

            except httpx.HTTPStatusError as e:
                logger.error(f"Salesforce API error: {e.response.text}")
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
        Transform Salesforce data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Salesforce

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            # Remove Salesforce metadata
            clean_record = {
                k: v for k, v in record.items()
                if k not in ["attributes"]
            }

            if data_type == "contacts":
                transformed.append({
                    "id": clean_record.get("Id"),
                    "type": "contact",
                    "name": clean_record.get("Name"),
                    "email": clean_record.get("Email"),
                    "phone": clean_record.get("Phone"),
                    "title": clean_record.get("Title"),
                    "department": clean_record.get("Department"),
                    "account_name": clean_record.get("Account", {}).get("Name") if isinstance(clean_record.get("Account"), dict) else None
                })

            elif data_type == "opportunities":
                transformed.append({
                    "id": clean_record.get("Id"),
                    "type": "opportunity",
                    "name": clean_record.get("Name"),
                    "amount": clean_record.get("Amount"),
                    "stage": clean_record.get("StageName"),
                    "close_date": clean_record.get("CloseDate"),
                    "probability": clean_record.get("Probability"),
                    "account_name": clean_record.get("Account", {}).get("Name") if isinstance(clean_record.get("Account"), dict) else None
                })

            elif data_type == "accounts":
                transformed.append({
                    "id": clean_record.get("Id"),
                    "type": "account",
                    "name": clean_record.get("Name"),
                    "account_type": clean_record.get("Type"),
                    "industry": clean_record.get("Industry"),
                    "annual_revenue": clean_record.get("AnnualRevenue"),
                    "employees": clean_record.get("NumberOfEmployees"),
                    "phone": clean_record.get("Phone"),
                    "website": clean_record.get("Website")
                })

            elif data_type == "leads":
                transformed.append({
                    "id": clean_record.get("Id"),
                    "type": "lead",
                    "name": clean_record.get("Name"),
                    "company": clean_record.get("Company"),
                    "email": clean_record.get("Email"),
                    "phone": clean_record.get("Phone"),
                    "status": clean_record.get("Status"),
                    "source": clean_record.get("LeadSource")
                })

            elif data_type == "tasks":
                transformed.append({
                    "id": clean_record.get("Id"),
                    "type": "task",
                    "subject": clean_record.get("Subject"),
                    "status": clean_record.get("Status"),
                    "priority": clean_record.get("Priority"),
                    "due_date": clean_record.get("ActivityDate"),
                    "related_to_name": clean_record.get("What", {}).get("Name") if isinstance(clean_record.get("What"), dict) else None,
                    "assigned_to_name": clean_record.get("Who", {}).get("Name") if isinstance(clean_record.get("Who"), dict) else None
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

        if record_type == "contact":
            return (
                f"Contact {record.get('name')} "
                f"title {record.get('title')} "
                f"at {record.get('account_name')} "
                f"email {record.get('email')} "
                f"phone {record.get('phone')}"
            )

        elif record_type == "opportunity":
            return (
                f"Opportunity {record.get('name')} "
                f"amount ${record.get('amount')} "
                f"stage {record.get('stage')} "
                f"close date {record.get('close_date')} "
                f"probability {record.get('probability')}%"
            )

        elif record_type == "account":
            return (
                f"Account {record.get('name')} "
                f"industry {record.get('industry')} "
                f"type {record.get('account_type')} "
                f"revenue ${record.get('annual_revenue')} "
                f"employees {record.get('employees')}"
            )

        elif record_type == "lead":
            return (
                f"Lead {record.get('name')} "
                f"company {record.get('company')} "
                f"status {record.get('status')} "
                f"source {record.get('source')}"
            )

        elif record_type == "task":
            return (
                f"Task {record.get('subject')} "
                f"status {record.get('status')} "
                f"priority {record.get('priority')} "
                f"due {record.get('due_date')}"
            )

        return str(record)

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Salesforce data with multi-tenant Filecoin storage

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
            "integration": "salesforce",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Salesforce
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "salesforce",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "salesforce_api",
                        "version": "v58.0",
                        "instance_url": self.instance_url
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "salesforce",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="salesforce",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "salesforce",
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
