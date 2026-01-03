"""
Google Workspace Sync Adapter

Inherits from BaseDataAdapter for consistent data pipeline handling.
Syncs Drive and Contacts to Pinata storage (RAG).
Gmail and Calendar use live API calls (not stored).

Data Routing (from MCP pipeline):
- drive_files: RAG_STORAGE (synced to Pinata + indexed in Qdrant)
- contacts: RAG_STORAGE (synced to Pinata + indexed in Qdrant)
- gmail: LIVE_API (fetched on-demand, not stored)
- calendar: LIVE_API (fetched on-demand, not stored)
"""
import asyncio
import httpx
import logging
import email.utils
from collections import defaultdict
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.adapters.base_adapter import BaseDataAdapter

logger = logging.getLogger(__name__)


class GoogleWorkspaceSync(BaseDataAdapter):
    """
    Sync adapter for Google Workspace integration.

    Inherits from BaseDataAdapter which handles:
    - Wallet normalization
    - Encryption (AES-256-GCM)
    - Pinata storage (IPFS/Filecoin)
    - Chunking strategies
    - L3 blockchain commitment
    - MCP data routing
    """

    # Integration identifier
    INTEGRATION_NAME = "google"

    # Data types synced to Pinata AND indexed in Qdrant
    # Gmail and Calendar are LIVE types - fetched on-demand, not stored
    RAG_ENABLED_TYPES = ["drive", "contacts"]

    def __init__(self, credentials: dict):
        """
        Initialize Google Workspace adapter.

        Args:
            credentials: OAuth credentials with access_token
        """
        super().__init__(credentials)

        # Google-specific headers
        self.base_headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    # ==================== PAGINATION HELPERS ====================

    async def _paginate_api_call(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Dict[str, Any],
        results_key: str = "messages",
        max_results: Optional[int] = None,
        page_size: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Generic pagination handler for Google APIs

        Args:
            client: HTTP client
            url: API endpoint URL
            params: Base query parameters
            results_key: Key in response containing results (e.g., "messages", "items", "files")
            max_results: Optional limit on total results (None = fetch all)
            page_size: Results per page

        Returns:
            List of all results across all pages
        """
        all_results = []
        page_token = None
        page_count = 0

        while True:
            # Update params with pagination
            request_params = {**params, "maxResults": page_size}
            if page_token:
                request_params["pageToken"] = page_token

            response = await client.get(url, headers=self.base_headers, params=request_params)
            response.raise_for_status()
            data = response.json()

            results = data.get(results_key, [])
            all_results.extend(results)
            page_count += 1

            logger.info(f"Pagination page {page_count}: fetched {len(results)} items, total: {len(all_results)}")

            # Check limits
            if max_results and len(all_results) >= max_results:
                all_results = all_results[:max_results]
                break

            # Check for next page
            page_token = data.get("nextPageToken")
            if not page_token:
                break

            # Rate limiting protection
            await asyncio.sleep(0.1)  # 100ms delay between pages

        logger.info(f"Pagination complete: {len(all_results)} total items across {page_count} pages")
        return all_results

    # ==================== CHUNKING HELPERS ====================

    def _group_messages_by_month(self, messages: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group Gmail messages by year-month (e.g., "2025-01", "2024-12")

        Args:
            messages: List of message dicts with 'date' header

        Returns:
            Dictionary mapping chunk_id to list of messages
        """
        chunks = defaultdict(list)

        for msg in messages:
            date_str = msg.get("date", "")
            try:
                # Gmail date format: "Mon, 23 Dec 2024 10:30:00 -0500"
                parsed_date = email.utils.parsedate_to_datetime(date_str)
                chunk_id = parsed_date.strftime("%Y-%m")
            except (ValueError, TypeError):
                chunk_id = "unknown"

            chunks[chunk_id].append(msg)

        return dict(chunks)

    def _group_events_by_year(self, events: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group calendar events by year

        Returns chunks like {"2025": [...], "2024": [...], "2023": [...]}
        """
        chunks = defaultdict(list)

        for event in events:
            start = event.get("start", "")
            try:
                if "T" in str(start):
                    event_date = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
                else:
                    event_date = datetime.strptime(str(start), "%Y-%m-%d")
                chunk_id = str(event_date.year)
            except (ValueError, TypeError):
                chunk_id = "unknown"

            chunks[chunk_id].append(event)

        return dict(chunks)

    def _group_files_by_quarter(self, files: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group Drive files by year-quarter based on modifiedTime

        Returns chunks like {"2025-Q1": [...], "2024-Q4": [...]}
        """
        chunks = defaultdict(list)

        for file in files:
            modified_time = file.get("modifiedTime", "")
            try:
                modified_date = datetime.fromisoformat(str(modified_time).replace("Z", "+00:00"))
                quarter = (modified_date.month - 1) // 3 + 1
                chunk_id = f"{modified_date.year}-Q{quarter}"
            except (ValueError, TypeError):
                chunk_id = "unknown"

            chunks[chunk_id].append(file)

        return dict(chunks)

    def _has_attachment(self, payload: Dict[str, Any]) -> bool:
        """Check if email has attachments"""
        if payload.get("parts"):
            for part in payload.get("parts", []):
                if part.get("filename"):
                    return True
        return False

    # ==================== SYNC METHODS ====================

    async def sync_all(self) -> Dict[str, Any]:
        """
        Sync Google Workspace data to Pinata storage.

        NOTE: Only Drive and Contacts are synced to storage.
        Gmail and Calendar use live API calls instead.

        Returns:
            Dictionary containing all synced data categorized by service
        """
        logger.info("Starting Google Workspace sync (Drive, Contacts only)")

        try:
            # Sync only Drive and Contacts to storage
            # Gmail and Calendar use live API calls instead
            drive_data = await self.sync_drive()
            contacts_data = await self.sync_contacts()

            synced_data = {
                "integration": "google",
                "sync_timestamp": datetime.utcnow().isoformat(),
                "drive": drive_data,
                "contacts": contacts_data,
                "total_records": (
                    len(drive_data.get("files", []))
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

    async def sync_gmail(self, max_messages: Optional[int] = None) -> Dict[str, Any]:
        """
        Sync ALL Gmail emails with full pagination and chronological chunking

        Args:
            max_messages: Optional limit on total messages (None = fetch all)

        Returns:
            Dictionary containing Gmail data with messages and chronological chunks
        """
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                logger.info("Starting full Gmail sync with pagination")

                # Step 1: Get ALL message IDs with pagination
                all_message_ids = await self._paginate_api_call(
                    client=client,
                    url="https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    params={},
                    results_key="messages",
                    max_results=max_messages,
                    page_size=500  # Gmail supports up to 500 per page for list
                )

                logger.info(f"Found {len(all_message_ids)} total messages to sync")

                # Step 2: Fetch full content for each message
                messages = []
                for i, msg_ref in enumerate(all_message_ids):
                    try:
                        msg_response = await client.get(
                            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}",
                            headers=self.base_headers,
                            params={"format": "full"}
                        )
                        msg_response.raise_for_status()
                        msg_data = msg_response.json()

                        # Extract headers
                        payload = msg_data.get("payload", {})
                        headers_dict = {h["name"]: h["value"] for h in payload.get("headers", [])}

                        messages.append({
                            "id": msg_data["id"],
                            "threadId": msg_data.get("threadId"),
                            "from": headers_dict.get("From", ""),
                            "to": headers_dict.get("To", ""),
                            "subject": headers_dict.get("Subject", "(No Subject)"),
                            "date": headers_dict.get("Date", ""),
                            "snippet": msg_data.get("snippet", ""),
                            "labels": msg_data.get("labelIds", []),
                            "starred": "STARRED" in msg_data.get("labelIds", []),
                            "unread": "UNREAD" in msg_data.get("labelIds", []),
                            "hasAttachment": self._has_attachment(payload),
                            "payload": payload
                        })

                        # Progress logging every 100 messages
                        if (i + 1) % 100 == 0:
                            logger.info(f"Fetched {i + 1}/{len(all_message_ids)} messages")

                        # Rate limiting: 20ms between individual message fetches
                        await asyncio.sleep(0.02)

                    except Exception as e:
                        logger.warning(f"Failed to fetch message {msg_ref['id']}: {e}")
                        continue

                # Step 3: Group messages into chronological chunks
                chunks = self._group_messages_by_month(messages)

                logger.info(f"Gmail sync complete: {len(messages)} messages across {len(chunks)} monthly chunks")

                return {
                    "messages": messages,
                    "chunks": chunks,
                    "total_count": len(all_message_ids),
                    "synced_count": len(messages),
                    "chunk_count": len(chunks)
                }

            except Exception as e:
                logger.error(f"Gmail sync failed: {str(e)}")
                return {"messages": [], "chunks": {}, "error": str(e)}

    async def sync_calendar(self, years_back: int = 5, years_forward: int = 2) -> Dict[str, Any]:
        """
        Sync ALL Google Calendar events with full pagination and yearly chunking

        Args:
            years_back: How many years of historical events (default 5)
            years_forward: How many years of future events (default 2)

        Returns:
            Dictionary containing calendar events and yearly chunks
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                logger.info(f"Starting full Calendar sync: {years_back} years back, {years_forward} years forward")

                # Calculate time range
                now = datetime.utcnow()
                time_min = (now - timedelta(days=365 * years_back)).isoformat() + "Z"
                time_max = (now + timedelta(days=365 * years_forward)).isoformat() + "Z"

                # Fetch ALL events with pagination
                all_events_raw = await self._paginate_api_call(
                    client=client,
                    url="https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    params={
                        "timeMin": time_min,
                        "timeMax": time_max,
                        "singleEvents": True,
                        "orderBy": "startTime"
                    },
                    results_key="items",
                    page_size=250  # Calendar API supports up to 2500, but 250 is safer
                )

                logger.info(f"Found {len(all_events_raw)} total calendar events")

                # Transform events
                events = []
                for event in all_events_raw:
                    start_dt = event.get("start", {}).get("dateTime") or event.get("start", {}).get("date")
                    end_dt = event.get("end", {}).get("dateTime") or event.get("end", {}).get("date")

                    events.append({
                        "id": event["id"],
                        "summary": event.get("summary", "No title"),
                        "description": event.get("description", ""),
                        "start": start_dt,
                        "end": end_dt,
                        "attendees": [a.get("email") for a in event.get("attendees", [])],
                        "location": event.get("location", ""),
                        "status": event.get("status", "confirmed"),
                        "colorId": event.get("colorId"),
                        "hangoutLink": event.get("hangoutLink"),
                        "htmlLink": event.get("htmlLink"),
                        "creator": event.get("creator", {}).get("email"),
                        "organizer": event.get("organizer", {}).get("email"),
                        "recurringEventId": event.get("recurringEventId"),
                        "isAllDay": "date" in event.get("start", {})
                    })

                # Group by year
                chunks = self._group_events_by_year(events)

                logger.info(f"Calendar sync complete: {len(events)} events across {len(chunks)} yearly chunks")

                return {
                    "events": events,
                    "chunks": chunks,
                    "synced_count": len(events),
                    "chunk_count": len(chunks)
                }

            except Exception as e:
                logger.error(f"Calendar sync failed: {str(e)}")
                return {"events": [], "chunks": {}, "error": str(e)}

    async def sync_drive(self, max_files: int = 4000) -> Dict[str, Any]:
        """
        Sync Google Drive files with pagination and quarterly chunking.

        IMPORTANT: Default limit is 4000 files to prevent:
        1. Railway OOM crashes (unlimited files exhaust memory)
        2. RAG hallucinations (Qdrant starts hallucinating above ~10K total documents)

        Combined Drive + OneDrive should stay under ~8K files to leave room for
        other integration data (Contacts, Slack users, etc.) in RAG storage.

        Args:
            max_files: Maximum files to sync (default 4000 to prevent OOM/hallucinations)

        Returns:
            Dictionary containing Drive files and quarterly chunks
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                logger.info("Starting full Drive sync with pagination")

                # Fetch ALL files with pagination
                # Note: Drive API uses 'pageToken' not in params, but we need special handling
                all_files_raw = await self._paginate_api_call(
                    client=client,
                    url="https://www.googleapis.com/drive/v3/files",
                    params={
                        "fields": "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,owners,starred,shared,parents,iconLink,thumbnailLink),nextPageToken",
                        "orderBy": "modifiedTime desc"
                    },
                    results_key="files",
                    max_results=max_files,
                    page_size=1000  # Drive API supports up to 1000 per page
                )

                logger.info(f"Found {len(all_files_raw)} total Drive files")

                # Transform files
                files = []
                for file in all_files_raw:
                    parents = file.get("parents", [])
                    files.append({
                        "id": file["id"],
                        "name": file.get("name", ""),
                        "mimeType": file.get("mimeType", ""),
                        "size": file.get("size", "0"),
                        "createdTime": file.get("createdTime", ""),
                        "modifiedTime": file.get("modifiedTime", ""),
                        "webViewLink": file.get("webViewLink", ""),
                        "owners": [o.get("emailAddress") for o in file.get("owners", [])],
                        "starred": file.get("starred", False),
                        "shared": file.get("shared", False),
                        "parents": parents,
                        "parent_folder_id": parents[0] if parents else None,  # First parent is direct parent
                        "iconLink": file.get("iconLink", ""),
                        "thumbnailLink": file.get("thumbnailLink", "")
                    })

                # Group by quarter
                chunks = self._group_files_by_quarter(files)

                logger.info(f"Drive sync complete: {len(files)} files across {len(chunks)} quarterly chunks")

                return {
                    "files": files,
                    "chunks": chunks,
                    "synced_count": len(files),
                    "chunk_count": len(chunks)
                }

            except Exception as e:
                logger.error(f"Drive sync failed: {str(e)}")
                return {"files": [], "chunks": {}, "error": str(e)}

    async def sync_contacts(self, max_contacts: Optional[int] = None) -> Dict[str, Any]:
        """
        Sync ALL Google Contacts with full pagination

        Args:
            max_contacts: Optional limit on total contacts (None = fetch all)

        Returns:
            Dictionary containing contacts and single "all" chunk
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                logger.info("Starting full Contacts sync with pagination")

                # People API uses different pagination - manual loop
                all_contacts_raw = []
                page_token = None

                while True:
                    params = {
                        "pageSize": 1000,  # People API supports up to 1000
                        "personFields": "names,emailAddresses,phoneNumbers,organizations,photos"
                    }
                    if page_token:
                        params["pageToken"] = page_token

                    response = await client.get(
                        "https://people.googleapis.com/v1/people/me/connections",
                        headers=self.base_headers,
                        params=params
                    )
                    response.raise_for_status()
                    data = response.json()

                    connections = data.get("connections", [])
                    all_contacts_raw.extend(connections)

                    logger.info(f"Contacts pagination: fetched {len(connections)} contacts, total: {len(all_contacts_raw)}")

                    # Check limits
                    if max_contacts and len(all_contacts_raw) >= max_contacts:
                        all_contacts_raw = all_contacts_raw[:max_contacts]
                        break

                    # Check for next page
                    page_token = data.get("nextPageToken")
                    if not page_token:
                        break

                    await asyncio.sleep(0.1)

                logger.info(f"Found {len(all_contacts_raw)} total contacts")

                # Transform contacts
                contacts = []
                for person in all_contacts_raw:
                    names = person.get("names", [])
                    display_name = names[0].get("displayName", "") if names else ""

                    email_addresses = person.get("emailAddresses", [])
                    emails = [e.get("value") for e in email_addresses]

                    phone_numbers = person.get("phoneNumbers", [])
                    phones = [p.get("value") for p in phone_numbers]

                    organizations = person.get("organizations", [])
                    company = organizations[0].get("name", "") if organizations else ""

                    contacts.append({
                        "resourceName": person.get("resourceName", ""),
                        "name": display_name,
                        "emails": emails,
                        "phones": phones,
                        "company": company
                    })

                # Contacts use single "latest" chunk (typically smaller dataset)
                chunks = {"latest": contacts}

                logger.info(f"Contacts sync complete: {len(contacts)} contacts")

                return {
                    "contacts": contacts,
                    "chunks": chunks,
                    "synced_count": len(contacts),
                    "chunk_count": 1
                }

            except Exception as e:
                logger.error(f"Contacts sync failed: {str(e)}")
                return {"contacts": [], "chunks": {}, "error": str(e)}

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
        """
        Get data types to sync to Pinata storage.

        NOTE: Only Drive and Contacts are synced to storage.

        EXCLUDED from storage:
        - Gmail: Too large (tens of thousands of emails), uses live API calls
        - Calendar: Low RAG value (just metadata), AI Notetakers will provide
          actual meeting content in the future

        Gmail and Calendar data are accessed via live Google API calls in the UI.
        """
        return ["drive", "contacts"]

    async def fetch_data(self, data_type: str, **kwargs) -> Dict[str, Any]:
        """
        Fetch data from Google Workspace APIs.

        Args:
            data_type: Type of data to fetch (drive, contacts)
            **kwargs: Additional fetch options (limit, etc.)

        Returns:
            Dictionary containing fetched data with 'records' or 'chunks' key
        """
        if data_type == "drive":
            return await self.sync_drive(**kwargs)
        elif data_type == "contacts":
            return await self.sync_contacts(**kwargs)
        else:
            raise ValueError(f"Unsupported data type for sync: {data_type}")

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

    # ==================== OPTIONAL OVERRIDES ====================

    def get_chunk_strategy(self, data_type: str) -> str:
        """Get chunking strategy for each Google data type."""
        strategies = {
            "drive": "quarterly",   # Files chunked by quarter (modifiedTime)
            "contacts": "latest"    # Contacts as single chunk
        }
        return strategies.get(data_type, "latest")

    def get_date_field(self, data_type: str) -> str:
        """Get date field for chunking."""
        fields = {
            "drive": "modifiedTime",
            "contacts": "resourceName"  # No date field for contacts
        }
        return fields.get(data_type, "created_at")

    # ==================== LIVE API DATA (Gmail, Calendar) ====================

    async def get_live_data(
        self,
        data_type: str,
        wallet_address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Fetch live data from Google API (not stored).

        Gmail and Calendar use live API calls instead of synced storage.

        Args:
            data_type: 'gmail' or 'calendar'
            wallet_address: User's wallet address (for auth lookup)
            **kwargs: Additional options (max_results, etc.)

        Returns:
            Live data from Google API
        """
        max_results = kwargs.get("max_results", 50)

        if data_type == "gmail":
            return await self.sync_gmail(max_messages=max_results)
        elif data_type == "calendar":
            return await self.sync_calendar(
                years_back=kwargs.get("years_back", 1),
                years_forward=kwargs.get("years_forward", 1)
            )
        else:
            raise ValueError(f"{data_type} is not a live API type for Google")

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

    # NOTE: sync_data() is inherited from BaseDataAdapter
    # The base class handles:
    # - Wallet normalization
    # - Encryption (AES-256-GCM)
    # - Pinata storage
    # - Chunking
    # - L3 blockchain commitment
