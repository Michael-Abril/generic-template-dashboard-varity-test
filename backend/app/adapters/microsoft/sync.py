"""
Microsoft 365 Sync Adapter
Inherits from BaseDataAdapter for consistent data pipeline handling.

Syncs data from Microsoft Graph API:
- Outlook Mail
- Calendar events
- OneDrive files
- Contacts

Only "onedrive" and "contacts" are indexed in RAG for AI queries.
Mail and Calendar are accessed via live API calls.
"""
import httpx
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.adapters.base_adapter import BaseDataAdapter

logger = logging.getLogger(__name__)


class MicrosoftSync(BaseDataAdapter):
    """
    Sync adapter for Microsoft 365 integration.

    Inherits from BaseDataAdapter which handles:
    - Wallet normalization
    - Encryption
    - Pinata storage
    - Chunking
    """

    # Integration identifier
    INTEGRATION_NAME = "microsoft"

    # Only OneDrive and Contacts go to RAG - Mail/Calendar are excluded
    RAG_ENABLED_TYPES = ["onedrive", "contacts"]

    def __init__(self, credentials: dict):
        """
        Initialize Microsoft 365 adapter.

        Args:
            credentials: OAuth credentials with access_token
        """
        super().__init__(credentials)
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.base_headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    # ==================== REQUIRED IMPLEMENTATIONS ====================

    def get_data_types(self) -> List[str]:
        """Get available data types for Microsoft 365"""
        return ["mail", "calendar", "onedrive", "contacts"]

    async def fetch_data(self, data_type: str, **kwargs) -> Dict[str, Any]:
        """
        Fetch data from Microsoft Graph API.

        Args:
            data_type: Type of data to fetch
            **kwargs: Additional options

        Returns:
            Raw data from Microsoft API
        """
        if data_type == "mail":
            return await self._fetch_mail()
        elif data_type == "calendar":
            return await self._fetch_calendar()
        elif data_type == "onedrive":
            return await self._fetch_onedrive()
        elif data_type == "contacts":
            return await self._fetch_contacts()
        else:
            raise ValueError(f"Unsupported data type: {data_type}")

    def transform_data(
        self,
        data_type: str,
        raw_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Transform Microsoft 365 data to common schema.

        Args:
            data_type: Type of data being transformed
            raw_data: Raw data from fetch_data()

        Returns:
            List of transformed records
        """
        records = raw_data.get("records", [])
        transformed = []

        for record in records:
            if data_type == "mail":
                transformed.append({
                    "id": record.get("id"),
                    "type": "email",
                    "integration": self.INTEGRATION_NAME,
                    "subject": record.get("subject", ""),
                    "from": record.get("from", ""),
                    "fromName": record.get("fromName", ""),
                    "to": record.get("to", []),
                    "receivedDateTime": record.get("receivedDateTime", ""),
                    "created_at": record.get("receivedDateTime", ""),
                    "body": record.get("body", ""),
                    "bodyPreview": record.get("bodyPreview", ""),
                    "isRead": record.get("isRead", False),
                    "importance": record.get("importance", "normal"),
                    "hasAttachments": record.get("hasAttachments", False)
                })

            elif data_type == "calendar":
                transformed.append({
                    "id": record.get("id"),
                    "type": "calendar_event",
                    "integration": self.INTEGRATION_NAME,
                    "subject": record.get("subject", "No title"),
                    "start": record.get("start", ""),
                    "end": record.get("end", ""),
                    "created_at": record.get("start", ""),
                    "location": record.get("location", ""),
                    "attendees": record.get("attendees", []),
                    "organizer": record.get("organizer", ""),
                    "isAllDay": record.get("isAllDay", False),
                    "importance": record.get("importance", "normal")
                })

            elif data_type == "onedrive":
                transformed.append({
                    "id": record.get("id"),
                    "type": "document",
                    "integration": self.INTEGRATION_NAME,
                    "name": record.get("name", ""),
                    "size": record.get("size", 0),
                    "createdDateTime": record.get("createdDateTime", ""),
                    "lastModifiedDateTime": record.get("lastModifiedDateTime", ""),
                    "created_at": record.get("lastModifiedDateTime", ""),
                    "webUrl": record.get("webUrl", ""),
                    "isFolder": record.get("isFolder", False),
                    "mimeType": record.get("mimeType", ""),
                    "createdBy": record.get("createdBy", ""),
                    "parentPath": record.get("parentPath", "")
                })

            elif data_type == "contacts":
                transformed.append({
                    "id": record.get("id"),
                    "type": "contact",
                    "integration": self.INTEGRATION_NAME,
                    "name": record.get("name", ""),
                    "emails": record.get("emails", []),
                    "phones": record.get("phones", []),
                    "company": record.get("company", ""),
                    "jobTitle": record.get("jobTitle", ""),
                    "created_at": datetime.utcnow().isoformat()
                })

        return transformed

    # ==================== OPTIONAL OVERRIDES ====================

    def get_chunk_strategy(self, data_type: str) -> str:
        """Get chunking strategy for each data type"""
        strategies = {
            "mail": "monthly",      # Emails chunked by month
            "calendar": "yearly",   # Calendar events by year
            "onedrive": "quarterly", # Files by quarter
            "contacts": "latest"    # Contacts as single chunk
        }
        return strategies.get(data_type, "latest")

    def get_date_field(self, data_type: str) -> str:
        """Get date field for chunking"""
        fields = {
            "mail": "receivedDateTime",
            "calendar": "start",
            "onedrive": "lastModifiedDateTime",
            "contacts": "created_at"
        }
        return fields.get(data_type, "created_at")

    async def test_connection(self) -> bool:
        """Test if the Microsoft 365 connection is valid"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/me",
                    headers=self.base_headers
                )
                response.raise_for_status()
                user_info = response.json()
                logger.info(
                    f"Microsoft 365 connection valid for user: "
                    f"{user_info.get('userPrincipalName')}"
                )
                return True
        except Exception as e:
            logger.error(f"Microsoft 365 connection test failed: {e}")
            return False

    # ==================== PRIVATE FETCH METHODS ====================

    async def _fetch_mail(self) -> Dict[str, Any]:
        """Fetch Outlook emails"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/me/messages",
                    headers=self.base_headers,
                    params={
                        "$top": 100,
                        "$orderby": "receivedDateTime desc",
                        "$select": "id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,isRead,importance,hasAttachments"
                    }
                )
                response.raise_for_status()
                data = response.json()

                records = []
                for msg in data.get("value", []):
                    body_content = ""
                    body_data = msg.get("body", {})
                    if body_data:
                        body_content = body_data.get("content", "")
                    if not body_content:
                        body_content = msg.get("bodyPreview", "")

                    records.append({
                        "id": msg["id"],
                        "subject": msg.get("subject", ""),
                        "from": msg.get("from", {}).get("emailAddress", {}).get("address", ""),
                        "fromName": msg.get("from", {}).get("emailAddress", {}).get("name", ""),
                        "to": [
                            r.get("emailAddress", {}).get("address", "")
                            for r in msg.get("toRecipients", [])
                        ],
                        "receivedDateTime": msg.get("receivedDateTime", ""),
                        "body": body_content,
                        "bodyPreview": msg.get("bodyPreview", ""),
                        "isRead": msg.get("isRead", False),
                        "importance": msg.get("importance", "normal"),
                        "hasAttachments": msg.get("hasAttachments", False)
                    })

                logger.info(f"Fetched {len(records)} Outlook messages")
                return {"records": records, "total_count": len(records)}

            except Exception as e:
                logger.error(f"Outlook mail fetch failed: {e}")
                return {"records": [], "error": str(e)}

    async def _fetch_calendar(self) -> Dict[str, Any]:
        """Fetch Outlook Calendar events"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
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

                records = []
                for event in data.get("value", []):
                    records.append({
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

                logger.info(f"Fetched {len(records)} Calendar events")
                return {"records": records, "total_count": len(records)}

            except Exception as e:
                logger.error(f"Calendar fetch failed: {e}")
                return {"records": [], "error": str(e)}

    async def _fetch_onedrive(self) -> Dict[str, Any]:
        """Fetch OneDrive files metadata (recursively from all folders)"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                all_files = []
                folders_to_process = [("root", "/me/drive/root/children")]
                processed_folders = set()
                max_files = 100

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
                            }
                        )
                        response.raise_for_status()
                        data = response.json()

                        for item in data.get("value", []):
                            is_folder = "folder" in item
                            all_files.append({
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
                            })

                            if is_folder and len(all_files) < max_files:
                                folders_to_process.append(
                                    (item["id"], f"/me/drive/items/{item['id']}/children")
                                )

                    except Exception as folder_error:
                        logger.warning(f"Failed to process folder {folder_id}: {folder_error}")
                        continue

                logger.info(
                    f"Fetched {len(all_files)} OneDrive files from "
                    f"{len(processed_folders)} folders"
                )
                return {
                    "records": all_files,
                    "total_count": len(all_files),
                    "folders_processed": len(processed_folders)
                }

            except Exception as e:
                logger.error(f"OneDrive fetch failed: {e}")
                return {"records": [], "error": str(e)}

    async def _fetch_contacts(self) -> Dict[str, Any]:
        """Fetch Outlook Contacts"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
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

                records = []
                for contact in data.get("value", []):
                    email_addresses = contact.get("emailAddresses", [])
                    emails = [e.get("address") for e in email_addresses if e.get("address")]

                    business_phones = contact.get("businessPhones", [])
                    mobile = contact.get("mobilePhone", "")
                    phones = business_phones + ([mobile] if mobile else [])

                    records.append({
                        "id": contact["id"],
                        "name": contact.get("displayName", ""),
                        "emails": emails,
                        "phones": phones,
                        "company": contact.get("companyName", ""),
                        "jobTitle": contact.get("jobTitle", "")
                    })

                logger.info(f"Fetched {len(records)} Contacts")
                return {"records": records, "total_count": len(records)}

            except Exception as e:
                logger.error(f"Contacts fetch failed: {e}")
                return {"records": [], "error": str(e)}

    # ==================== ACTION METHODS ====================

    async def send_mail(
        self,
        to: List[str],
        subject: str,
        body: str,
        content_type: str = "Text"
    ) -> Dict[str, Any]:
        """
        Send an email via Outlook.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            body: Email body content
            content_type: "Text" or "HTML"

        Returns:
            Send result from Microsoft API
        """
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": content_type,
                    "content": body
                },
                "toRecipients": [
                    {"emailAddress": {"address": addr}}
                    for addr in to
                ]
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/me/sendMail",
                    headers=self.base_headers,
                    json=payload
                )
                response.raise_for_status()
                logger.info(f"Sent email to {to}")
                return {"success": True, "recipients": to}

            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to send email: {e.response.text}")
                raise Exception(f"Failed to send email: {e.response.text}")

    async def upload_to_onedrive(
        self,
        file_name: str,
        content: bytes,
        folder_path: str = "root"
    ) -> Dict[str, Any]:
        """
        Upload a file to OneDrive.

        Args:
            file_name: Name for the uploaded file
            content: File content as bytes
            folder_path: Folder path (default: root)

        Returns:
            Upload result with file metadata
        """
        upload_url = f"{self.base_url}/me/drive/{folder_path}:/{file_name}:/content"

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.put(
                    upload_url,
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/octet-stream"
                    },
                    content=content
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"Uploaded file {file_name} to OneDrive")
                return {
                    "success": True,
                    "file_id": result.get("id"),
                    "web_url": result.get("webUrl"),
                    "name": result.get("name")
                }

            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to upload to OneDrive: {e.response.text}")
                raise Exception(f"Failed to upload: {e.response.text}")
