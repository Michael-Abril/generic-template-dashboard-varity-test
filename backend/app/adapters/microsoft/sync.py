"""
Microsoft 365 Sync Adapter
Syncs data from Outlook, Calendar, OneDrive, Excel, and Contacts with multi-tenant Filecoin storage
"""
import httpx
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class MicrosoftSync:
    """Adapter for syncing data from Microsoft 365 via Microsoft Graph API with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Microsoft 365 sync adapter

        Args:
            credentials: OAuth credentials dict with access_token
        """
        self.access_token = credentials.get("access_token")
        if not self.access_token:
            raise ValueError("Missing Microsoft 365 access token")

        self.base_url = "https://graph.microsoft.com/v1.0"
        self.base_headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    async def sync_all(self) -> Dict[str, Any]:
        """
        Sync all Microsoft 365 data

        Returns:
            Dictionary containing all synced data categorized by service
        """
        logger.info("Starting Microsoft 365 sync")

        try:
            # Sync data from all services
            mail_data = await self.sync_mail()
            calendar_data = await self.sync_calendar()
            onedrive_data = await self.sync_onedrive()
            contacts_data = await self.sync_contacts()

            synced_data = {
                "integration": "microsoft",
                "sync_timestamp": datetime.utcnow().isoformat(),
                "mail": mail_data,
                "calendar": calendar_data,
                "onedrive": onedrive_data,
                "contacts": contacts_data,
                "total_records": (
                    len(mail_data.get("messages", []))
                    + len(calendar_data.get("events", []))
                    + len(onedrive_data.get("files", []))
                    + len(contacts_data.get("contacts", []))
                ),
            }

            logger.info(
                f"Microsoft 365 sync completed: {synced_data['total_records']} total records"
            )
            return synced_data

        except Exception as e:
            logger.error(f"Microsoft 365 sync failed: {str(e)}")
            raise

    async def sync_mail(self) -> Dict[str, Any]:
        """
        Sync Outlook emails

        Returns:
            Dictionary containing Outlook mail data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get user's emails (most recent 100, no filter - get ALL emails)
                response = await client.get(
                    f"{self.base_url}/me/messages",
                    headers=self.base_headers,
                    params={
                        "$top": 100,
                        "$orderby": "receivedDateTime desc",
                        "$select": "id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,isRead,importance,hasAttachments"
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()

                messages = []
                for msg in data.get("value", []):
                    # Get body content (full body if available, fallback to preview)
                    body_content = ""
                    body_data = msg.get("body", {})
                    if body_data:
                        body_content = body_data.get("content", "")
                    if not body_content:
                        body_content = msg.get("bodyPreview", "")

                    messages.append({
                        "id": msg["id"],
                        "subject": msg.get("subject", ""),
                        "from": msg.get("from", {}).get("emailAddress", {}).get("address", ""),
                        "fromName": msg.get("from", {}).get("emailAddress", {}).get("name", ""),
                        "to": [r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])],
                        "receivedDateTime": msg.get("receivedDateTime", ""),
                        "body": body_content,
                        "bodyPreview": msg.get("bodyPreview", ""),
                        "isRead": msg.get("isRead", False),
                        "importance": msg.get("importance", "normal"),
                        "hasAttachments": msg.get("hasAttachments", False)
                    })

                logger.info(f"Synced {len(messages)} Outlook messages")
                return {
                    "messages": messages,
                    "synced_count": len(messages)
                }

            except Exception as e:
                logger.error(f"Outlook mail sync failed: {str(e)}")
                return {"messages": [], "error": str(e)}

    async def sync_calendar(self) -> Dict[str, Any]:
        """
        Sync Outlook Calendar events

        Returns:
            Dictionary containing calendar data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get calendar events (30 days past + 60 days future - matches Google)
                start_time = (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z"
                end_time = (datetime.utcnow() + timedelta(days=60)).isoformat() + "Z"

                response = await client.get(
                    f"{self.base_url}/me/calendar/calendarView",
                    headers=self.base_headers,
                    params={
                        "startDateTime": start_time,
                        "endDateTime": end_time,
                        "$top": 50,
                        "$select": "id,subject,start,end,location,attendees,organizer,isAllDay,importance"
                    }
                )
                response.raise_for_status()
                data = response.json()

                events = []
                for event in data.get("value", []):
                    events.append({
                        "id": event["id"],
                        "subject": event.get("subject", "No title"),
                        "start": event.get("start", {}).get("dateTime", ""),
                        "end": event.get("end", {}).get("dateTime", ""),
                        "location": event.get("location", {}).get("displayName", ""),
                        "attendees": [
                            a.get("emailAddress", {}).get("address", "")
                            for a in event.get("attendees", [])
                        ],
                        "organizer": event.get("organizer", {}).get("emailAddress", {}).get("address", ""),
                        "isAllDay": event.get("isAllDay", False),
                        "importance": event.get("importance", "normal")
                    })

                logger.info(f"Synced {len(events)} Calendar events")
                return {
                    "events": events,
                    "synced_count": len(events)
                }

            except Exception as e:
                logger.error(f"Calendar sync failed: {str(e)}")
                return {"events": [], "error": str(e)}

    async def sync_onedrive(self) -> Dict[str, Any]:
        """
        Sync OneDrive files metadata (recursively from all folders)

        Returns:
            Dictionary containing OneDrive files data
        """
        async with httpx.AsyncClient() as client:
            try:
                all_files = []
                folders_to_process = [("root", "/me/drive/root/children")]
                processed_folders = set()
                max_files = 100  # Limit total files to prevent timeout

                while folders_to_process and len(all_files) < max_files:
                    folder_id, folder_path = folders_to_process.pop(0)

                    if folder_id in processed_folders:
                        continue
                    processed_folders.add(folder_id)

                    try:
                        response = await client.get(
                            f"{self.base_url}{folder_path}",
                            headers=self.base_headers,
                            params={
                                "$top": 50,
                                "$select": "id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,createdBy,parentReference",
                                "$orderby": "lastModifiedDateTime desc"
                            },
                            timeout=30.0
                        )
                        response.raise_for_status()
                        data = response.json()

                        for item in data.get("value", []):
                            is_folder = "folder" in item
                            file_entry = {
                                "id": item["id"],
                                "name": item.get("name", ""),
                                "size": item.get("size", 0),
                                "createdDateTime": item.get("createdDateTime", ""),
                                "lastModifiedDateTime": item.get("lastModifiedDateTime", ""),
                                "webUrl": item.get("webUrl", ""),
                                "isFolder": is_folder,
                                "mimeType": item.get("file", {}).get("mimeType", ""),
                                "createdBy": item.get("createdBy", {}).get("user", {}).get("email", ""),
                                "parentPath": item.get("parentReference", {}).get("path", "")
                            }
                            all_files.append(file_entry)

                            # Queue folders for recursive processing
                            if is_folder and len(all_files) < max_files:
                                folders_to_process.append(
                                    (item["id"], f"/me/drive/items/{item['id']}/children")
                                )

                    except Exception as folder_error:
                        logger.warning(f"Failed to process folder {folder_id}: {folder_error}")
                        continue

                logger.info(f"Synced {len(all_files)} OneDrive files from {len(processed_folders)} folders")
                return {
                    "files": all_files,
                    "synced_count": len(all_files),
                    "folders_processed": len(processed_folders)
                }

            except Exception as e:
                logger.error(f"OneDrive sync failed: {str(e)}")
                return {"files": [], "error": str(e)}

    async def sync_contacts(self) -> Dict[str, Any]:
        """
        Sync Outlook Contacts

        Returns:
            Dictionary containing contacts data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get contacts
                response = await client.get(
                    f"{self.base_url}/me/contacts",
                    headers=self.base_headers,
                    params={
                        "$top": 100,
                        "$select": "id,displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle"
                    }
                )
                response.raise_for_status()
                data = response.json()

                contacts = []
                for contact in data.get("value", []):
                    # Extract email addresses
                    email_addresses = contact.get("emailAddresses", [])
                    emails = [e.get("address") for e in email_addresses if e.get("address")]

                    # Extract phone numbers
                    business_phones = contact.get("businessPhones", [])
                    mobile = contact.get("mobilePhone", "")
                    phones = business_phones + ([mobile] if mobile else [])

                    contacts.append({
                        "id": contact["id"],
                        "name": contact.get("displayName", ""),
                        "emails": emails,
                        "phones": phones,
                        "company": contact.get("companyName", ""),
                        "jobTitle": contact.get("jobTitle", "")
                    })

                logger.info(f"Synced {len(contacts)} Contacts")
                return {
                    "contacts": contacts,
                    "synced_count": len(contacts)
                }

            except Exception as e:
                logger.error(f"Contacts sync failed: {str(e)}")
                return {"contacts": [], "error": str(e)}

    async def test_connection(self) -> bool:
        """
        Test if the OAuth connection is working

        Returns:
            True if connection is valid, False otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/me",
                    headers=self.base_headers
                )
                response.raise_for_status()
                user_info = response.json()
                logger.info(f"Microsoft 365 connection valid for user: {user_info.get('userPrincipalName')}")
                return True
        except Exception as e:
            logger.error(f"Microsoft 365 connection test failed: {str(e)}")
            return False

    def get_data_types(self) -> List[str]:
        """Get available data types for Microsoft 365"""
        return ["mail", "calendar", "onedrive", "contacts"]

    async def fetch_data(self, data_type: str) -> Dict[str, Any]:
        """
        Fetch data from Microsoft 365 APIs

        Args:
            data_type: Type of data to fetch

        Returns:
            Dictionary containing fetched data
        """
        if data_type == "mail":
            return await self.sync_mail()
        elif data_type == "calendar":
            return await self.sync_calendar()
        elif data_type == "onedrive":
            return await self.sync_onedrive()
        elif data_type == "contacts":
            return await self.sync_contacts()
        else:
            raise ValueError(f"Unsupported data type: {data_type}")

    async def generate_embeddings(self, data: List[Dict[str, Any]]) -> List[List[float]]:
        """
        Generate embeddings for RAG indexing

        Args:
            data: List of transformed data records

        Returns:
            List of embedding vectors (empty for now, RAG service handles this)
        """
        # Embeddings are generated by the RAG service when indexing
        # This is a placeholder for the sync interface
        return []

    def transform_data(
        self,
        data_type: str,
        raw_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Transform Microsoft 365 data to common schema

        Args:
            data_type: Type of data
            raw_data: Raw data from Microsoft APIs

        Returns:
            Transformed records with common schema
        """
        if data_type == "mail":
            return [
                {
                    **msg,
                    "type": "email",
                    "integration": "microsoft"
                }
                for msg in raw_data.get("messages", [])
            ]
        elif data_type == "calendar":
            return [
                {
                    **event,
                    "type": "calendar_event",
                    "integration": "microsoft"
                }
                for event in raw_data.get("events", [])
            ]
        elif data_type == "onedrive":
            return [
                {
                    **file,
                    "type": "document",
                    "integration": "microsoft"
                }
                for file in raw_data.get("files", [])
            ]
        elif data_type == "contacts":
            return [
                {
                    **contact,
                    "type": "contact",
                    "integration": "microsoft"
                }
                for contact in raw_data.get("contacts", [])
            ]
        else:
            return []

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Microsoft 365 data with multi-tenant Filecoin storage

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
            "integration": "microsoft",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Microsoft 365
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "microsoft",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "microsoft_graph_api",
                        "version": "v1.0",
                        "services": ["mail", "calendar", "onedrive", "contacts"]
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "microsoft",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="microsoft",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "microsoft",
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
