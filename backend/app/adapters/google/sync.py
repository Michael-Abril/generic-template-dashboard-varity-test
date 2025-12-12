"""
Google Workspace Sync Adapter
Syncs data from Gmail, Calendar, Drive, Docs, and Contacts with multi-tenant Filecoin storage
"""
import httpx
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class GoogleSyncAdapter:
    """Adapter for syncing data from Google Workspace APIs with multi-tenant encrypted storage"""

    def __init__(self, access_token: str):
        """
        Initialize Google Workspace sync adapter

        Args:
            access_token: OAuth access token for Google APIs
        """
        self.access_token = access_token
        self.base_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    async def sync_all(self) -> Dict[str, Any]:
        """
        Sync all Google Workspace data

        Returns:
            Dictionary containing all synced data categorized by service
        """
        logger.info("Starting Google Workspace sync")

        try:
            # Sync data from all services
            gmail_data = await self.sync_gmail()
            calendar_data = await self.sync_calendar()
            drive_data = await self.sync_drive()
            contacts_data = await self.sync_contacts()

            synced_data = {
                "integration": "google",
                "sync_timestamp": datetime.utcnow().isoformat(),
                "gmail": gmail_data,
                "calendar": calendar_data,
                "drive": drive_data,
                "contacts": contacts_data,
                "total_records": (
                    len(gmail_data.get("messages", []))
                    + len(calendar_data.get("events", []))
                    + len(drive_data.get("files", []))
                    + len(contacts_data.get("contacts", []))
                ),
            }

            logger.info(
                f"Google Workspace sync completed: {synced_data['total_records']} total records"
            )
            return synced_data

        except Exception as e:
            logger.error(f"Google Workspace sync failed: {str(e)}")
            raise

    async def sync_gmail(self) -> Dict[str, Any]:
        """
        Sync Gmail emails and labels

        Returns:
            Dictionary containing Gmail data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get user's Gmail messages (last 100)
                response = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    headers=self.base_headers,
                    params={"maxResults": 100, "q": "is:unread OR is:starred"}
                )
                response.raise_for_status()
                messages_list = response.json().get("messages", [])

                # Fetch details for each message
                messages = []
                for msg in messages_list[:20]:  # Limit to 20 for initial sync
                    msg_response = await client.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                        headers=self.base_headers,
                        params={"format": "metadata", "metadataHeaders": ["From", "To", "Subject", "Date"]}
                    )
                    msg_response.raise_for_status()
                    msg_data = msg_response.json()

                    # Extract headers
                    headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}

                    messages.append({
                        "id": msg_data["id"],
                        "threadId": msg_data.get("threadId"),
                        "from": headers.get("From", ""),
                        "to": headers.get("To", ""),
                        "subject": headers.get("Subject", ""),
                        "date": headers.get("Date", ""),
                        "snippet": msg_data.get("snippet", "")
                    })

                logger.info(f"Synced {len(messages)} Gmail messages")
                return {
                    "messages": messages,
                    "total_count": len(messages_list),
                    "synced_count": len(messages)
                }

            except Exception as e:
                logger.error(f"Gmail sync failed: {str(e)}")
                return {"messages": [], "error": str(e)}

    async def sync_calendar(self) -> Dict[str, Any]:
        """
        Sync Google Calendar events

        Returns:
            Dictionary containing calendar data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get events from primary calendar (next 30 days)
                time_min = datetime.utcnow().isoformat() + "Z"
                time_max = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

                response = await client.get(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers=self.base_headers,
                    params={
                        "timeMin": time_min,
                        "timeMax": time_max,
                        "maxResults": 50,
                        "singleEvents": True,
                        "orderBy": "startTime"
                    }
                )
                response.raise_for_status()
                data = response.json()

                events = []
                for event in data.get("items", []):
                    events.append({
                        "id": event["id"],
                        "summary": event.get("summary", "No title"),
                        "description": event.get("description", ""),
                        "start": event.get("start", {}).get("dateTime") or event.get("start", {}).get("date"),
                        "end": event.get("end", {}).get("dateTime") or event.get("end", {}).get("date"),
                        "attendees": [a.get("email") for a in event.get("attendees", [])],
                        "location": event.get("location", ""),
                        "status": event.get("status", "")
                    })

                logger.info(f"Synced {len(events)} Calendar events")
                return {
                    "events": events,
                    "synced_count": len(events)
                }

            except Exception as e:
                logger.error(f"Calendar sync failed: {str(e)}")
                return {"events": [], "error": str(e)}

    async def sync_drive(self) -> Dict[str, Any]:
        """
        Sync Google Drive files metadata

        Returns:
            Dictionary containing Drive files data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get Drive files (most recent 50)
                response = await client.get(
                    "https://www.googleapis.com/drive/v3/files",
                    headers=self.base_headers,
                    params={
                        "pageSize": 50,
                        "fields": "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,owners)",
                        "orderBy": "modifiedTime desc"
                    }
                )
                response.raise_for_status()
                data = response.json()

                files = []
                for file in data.get("files", []):
                    files.append({
                        "id": file["id"],
                        "name": file.get("name", ""),
                        "mimeType": file.get("mimeType", ""),
                        "size": file.get("size", "0"),
                        "createdTime": file.get("createdTime", ""),
                        "modifiedTime": file.get("modifiedTime", ""),
                        "webViewLink": file.get("webViewLink", ""),
                        "owners": [o.get("emailAddress") for o in file.get("owners", [])]
                    })

                logger.info(f"Synced {len(files)} Drive files")
                return {
                    "files": files,
                    "synced_count": len(files)
                }

            except Exception as e:
                logger.error(f"Drive sync failed: {str(e)}")
                return {"files": [], "error": str(e)}

    async def sync_contacts(self) -> Dict[str, Any]:
        """
        Sync Google Contacts

        Returns:
            Dictionary containing contacts data
        """
        async with httpx.AsyncClient() as client:
            try:
                # Get contacts from People API
                response = await client.get(
                    "https://people.googleapis.com/v1/people/me/connections",
                    headers=self.base_headers,
                    params={
                        "pageSize": 100,
                        "personFields": "names,emailAddresses,phoneNumbers,organizations"
                    }
                )
                response.raise_for_status()
                data = response.json()

                contacts = []
                for person in data.get("connections", []):
                    # Extract primary name
                    names = person.get("names", [])
                    display_name = names[0].get("displayName", "") if names else ""

                    # Extract emails
                    email_addresses = person.get("emailAddresses", [])
                    emails = [e.get("value") for e in email_addresses]

                    # Extract phone numbers
                    phone_numbers = person.get("phoneNumbers", [])
                    phones = [p.get("value") for p in phone_numbers]

                    # Extract organization
                    organizations = person.get("organizations", [])
                    company = organizations[0].get("name", "") if organizations else ""

                    contacts.append({
                        "resourceName": person.get("resourceName", ""),
                        "name": display_name,
                        "emails": emails,
                        "phones": phones,
                        "company": company
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
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers=self.base_headers
                )
                response.raise_for_status()
                user_info = response.json()
                logger.info(f"Google Workspace connection valid for user: {user_info.get('email')}")
                return True
        except Exception as e:
            logger.error(f"Google Workspace connection test failed: {str(e)}")
            return False

    def get_data_types(self) -> List[str]:
        """Get available data types for Google Workspace"""
        return ["gmail", "calendar", "drive", "contacts"]

    async def fetch_data(self, data_type: str) -> Dict[str, Any]:
        """
        Fetch data from Google Workspace APIs

        Args:
            data_type: Type of data to fetch

        Returns:
            Dictionary containing fetched data
        """
        if data_type == "gmail":
            return await self.sync_gmail()
        elif data_type == "calendar":
            return await self.sync_calendar()
        elif data_type == "drive":
            return await self.sync_drive()
        elif data_type == "contacts":
            return await self.sync_contacts()
        else:
            raise ValueError(f"Unsupported data type: {data_type}")

    def transform_data(
        self,
        data_type: str,
        raw_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Transform Google Workspace data to common schema

        Args:
            data_type: Type of data
            raw_data: Raw data from Google APIs

        Returns:
            Transformed records with common schema
        """
        if data_type == "gmail":
            return [
                {
                    **msg,
                    "type": "email",
                    "integration": "google"
                }
                for msg in raw_data.get("messages", [])
            ]
        elif data_type == "calendar":
            return [
                {
                    **event,
                    "type": "calendar_event",
                    "integration": "google"
                }
                for event in raw_data.get("events", [])
            ]
        elif data_type == "drive":
            return [
                {
                    **file,
                    "type": "document",
                    "integration": "google"
                }
                for file in raw_data.get("files", [])
            ]
        elif data_type == "contacts":
            return [
                {
                    **contact,
                    "type": "contact",
                    "integration": "google"
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
        Sync all Google Workspace data with multi-tenant Filecoin storage

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
            "integration": "google",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Google Workspace
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "google",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "google_workspace_api",
                        "services": ["gmail", "calendar", "drive", "contacts"]
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "google",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="google",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "google",
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
