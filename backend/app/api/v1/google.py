"""
Google Workspace API Endpoints
Handles Gmail, Calendar, Drive, and Contacts operations
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import httpx
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.purchase import OAuthToken
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# ============================================================================
# Pydantic Models
# ============================================================================

class SendEmailRequest(BaseModel):
    wallet_address: str
    to: List[str]
    cc: Optional[List[str]] = []
    bcc: Optional[List[str]] = []
    subject: str
    body: str
    thread_id: Optional[str] = None


class CreateEventRequest(BaseModel):
    wallet_address: str
    summary: str
    start: str  # ISO format datetime
    end: str  # ISO format datetime
    location: Optional[str] = None
    description: Optional[str] = None
    attendees: Optional[List[str]] = []
    add_google_meet: bool = False
    reminder_minutes: int = 10


class UploadFileRequest(BaseModel):
    wallet_address: str
    file_name: str
    file_content: str  # Base64 encoded
    mime_type: str
    parent_folder_id: Optional[str] = None


class CreateContactRequest(BaseModel):
    wallet_address: str
    given_name: str
    family_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

async def get_google_access_token(wallet_address: str, db: AsyncSession) -> str:
    """Get active Google OAuth access token for the user"""
    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == wallet_address.lower(),
                OAuthToken.provider == "google",
                OAuthToken.is_active == True  # noqa: E712
            )
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=404,
            detail="Google Workspace not connected. Please connect via OAuth first."
        )

    # Check if token needs refresh
    if token.expires_at and datetime.fromisoformat(token.expires_at) < datetime.utcnow():
        # TODO: Implement token refresh logic
        raise HTTPException(
            status_code=401,
            detail="Access token expired. Please reconnect Google Workspace."
        )

    # Decrypt access token
    decrypted_token = await encryption_service.decrypt_oauth_token(
        encrypted_token=token.encrypted_token,
        customer_wallet=wallet_address
    )

    return decrypted_token.get("access_token")


# ============================================================================
# Gmail Endpoints
# ============================================================================

@router.post("/send-email")
async def send_email(
    request: SendEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send an email via Gmail API"""
    try:
        access_token = await get_google_access_token(request.wallet_address, db)

        # Build email message in RFC 2822 format
        message_parts = []
        message_parts.append(f"To: {', '.join(request.to)}")
        if request.cc:
            message_parts.append(f"Cc: {', '.join(request.cc)}")
        if request.bcc:
            message_parts.append(f"Bcc: {', '.join(request.bcc)}")
        message_parts.append(f"Subject: {request.subject}")
        message_parts.append("")  # Empty line between headers and body
        message_parts.append(request.body)

        raw_message = "\r\n".join(message_parts)

        # Encode message as base64url
        import base64
        encoded_message = base64.urlsafe_b64encode(raw_message.encode()).decode()

        # Prepare API request
        payload = {
            "raw": encoded_message
        }
        if request.thread_id:
            payload["threadId"] = request.thread_id

        # Send email via Gmail API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )

            if response.status_code != 200:
                error_detail = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Gmail API error: {error_detail}"
                )

            result = response.json()
            logger.info(f"Email sent successfully: {result.get('id')}")

            return {
                "success": True,
                "message_id": result.get("id"),
                "thread_id": result.get("threadId")
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ============================================================================
# Calendar Endpoints
# ============================================================================

@router.post("/create-event")
async def create_calendar_event(
    request: CreateEventRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new calendar event"""
    try:
        access_token = await get_google_access_token(request.wallet_address, db)

        # Build event payload
        event_payload = {
            "summary": request.summary,
            "start": {
                "dateTime": request.start,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": request.end,
                "timeZone": "UTC"
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": request.reminder_minutes}
                ]
            }
        }

        if request.location:
            event_payload["location"] = request.location

        if request.description:
            event_payload["description"] = request.description

        if request.attendees:
            event_payload["attendees"] = [
                {"email": email} for email in request.attendees
            ]

        if request.add_google_meet:
            event_payload["conferenceData"] = {
                "createRequest": {
                    "requestId": f"meet-{datetime.utcnow().timestamp()}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }

        # Create event via Calendar API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=event_payload,
                params={"conferenceDataVersion": 1} if request.add_google_meet else {},
                timeout=30.0
            )

            if response.status_code != 200:
                error_detail = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Calendar API error: {error_detail}"
                )

            result = response.json()
            logger.info(f"Event created successfully: {result.get('id')}")

            return {
                "success": True,
                "event_id": result.get("id"),
                "html_link": result.get("htmlLink"),
                "hangout_link": result.get("hangoutLink")
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")


# ============================================================================
# Drive Endpoints
# ============================================================================

@router.post("/upload-file")
async def upload_file_to_drive(
    request: UploadFileRequest,
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to Google Drive"""
    try:
        access_token = await get_google_access_token(request.wallet_address, db)

        # Decode base64 file content
        import base64
        file_bytes = base64.b64decode(request.file_content)

        # Create file metadata
        file_metadata = {
            "name": request.file_name,
            "mimeType": request.mime_type
        }

        if request.parent_folder_id:
            file_metadata["parents"] = [request.parent_folder_id]

        # Upload file using multipart upload
        async with httpx.AsyncClient() as client:
            # First, create file metadata
            metadata_response = await client.post(
                "https://www.googleapis.com/drive/v3/files",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=file_metadata,
                timeout=30.0
            )

            if metadata_response.status_code != 200:
                error_detail = metadata_response.json()
                raise HTTPException(
                    status_code=metadata_response.status_code,
                    detail=f"Drive API error: {error_detail}"
                )

            file_metadata_result = metadata_response.json()
            file_id = file_metadata_result.get("id")

            # Upload file content
            content_response = await client.patch(
                f"https://www.googleapis.com/upload/drive/v3/files/{file_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": request.mime_type
                },
                content=file_bytes,
                params={"uploadType": "media"},
                timeout=60.0
            )

            if content_response.status_code != 200:
                error_detail = content_response.json()
                raise HTTPException(
                    status_code=content_response.status_code,
                    detail=f"Drive upload error: {error_detail}"
                )

            logger.info(f"File uploaded successfully: {file_id}")

            return {
                "success": True,
                "file_id": file_id,
                "web_view_link": file_metadata_result.get("webViewLink"),
                "web_content_link": file_metadata_result.get("webContentLink")
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/download-file/{file_id}")
async def download_file_from_drive(
    file_id: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Download a file from Google Drive"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            # Get file metadata first
            metadata_response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "name,mimeType,size"},
                timeout=30.0
            )

            if metadata_response.status_code != 200:
                raise HTTPException(
                    status_code=metadata_response.status_code,
                    detail="Failed to get file metadata"
                )

            metadata = metadata_response.json()

            # Download file content
            content_response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"alt": "media"},
                timeout=60.0
            )

            if content_response.status_code != 200:
                raise HTTPException(
                    status_code=content_response.status_code,
                    detail="Failed to download file"
                )

            # Encode content as base64
            import base64
            file_content_base64 = base64.b64encode(content_response.content).decode()

            return {
                "success": True,
                "file_name": metadata.get("name"),
                "mime_type": metadata.get("mimeType"),
                "size": metadata.get("size"),
                "content": file_content_base64
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


# ============================================================================
# Contacts Endpoints
# ============================================================================

@router.post("/create-contact")
async def create_contact(
    request: CreateContactRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new contact"""
    try:
        access_token = await get_google_access_token(request.wallet_address, db)

        # Build contact payload
        contact_payload = {
            "names": [{
                "givenName": request.given_name,
                "familyName": request.family_name
            }]
        }

        if request.email:
            contact_payload["emailAddresses"] = [
                {"value": request.email, "type": "work"}
            ]

        if request.phone:
            contact_payload["phoneNumbers"] = [
                {"value": request.phone, "type": "work"}
            ]

        if request.company:
            contact_payload["organizations"] = [
                {"name": request.company, "type": "work"}
            ]

        # Create contact via People API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://people.googleapis.com/v1/people:createContact",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=contact_payload,
                timeout=30.0
            )

            if response.status_code != 200:
                error_detail = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Contacts API error: {error_detail}"
                )

            result = response.json()
            logger.info(f"Contact created successfully: {result.get('resourceName')}")

            return {
                "success": True,
                "resource_name": result.get("resourceName"),
                "etag": result.get("etag")
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")


# ============================================================================
# Gmail List/Delete/Update Endpoints
# ============================================================================

@router.get("/emails")
async def list_emails(
    wallet_address: str,
    max_results: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List emails from Gmail"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"maxResults": max_results},
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch emails"
                )

            messages = response.json().get("messages", [])

            # Fetch full details for each message
            email_details = []
            for msg in messages[:max_results]:
                msg_response = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0
                )
                if msg_response.status_code == 200:
                    email_details.append(msg_response.json())

            return {"success": True, "emails": email_details}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list emails: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list emails: {str(e)}")


@router.delete("/emails/{email_id}")
async def delete_email(
    email_id: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an email"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{email_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to delete email"
                )

            return {"success": True, "message": "Email deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete email: {str(e)}")


@router.patch("/emails/{email_id}")
async def update_email(
    email_id: str,
    wallet_address: str,
    mark_as_read: Optional[bool] = None,
    star: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update email metadata (read/unread, star)"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        modify_request = {
            "addLabelIds": [],
            "removeLabelIds": []
        }

        if mark_as_read is not None:
            if mark_as_read:
                modify_request["removeLabelIds"].append("UNREAD")
            else:
                modify_request["addLabelIds"].append("UNREAD")

        if star is not None:
            if star:
                modify_request["addLabelIds"].append("STARRED")
            else:
                modify_request["removeLabelIds"].append("STARRED")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{email_id}/modify",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=modify_request,
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to update email"
                )

            return {"success": True, "message": "Email updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update email: {str(e)}")


# ============================================================================
# Calendar List/Delete/Update Endpoints
# ============================================================================

@router.get("/events")
async def list_events(
    wallet_address: str,
    max_results: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List calendar events"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "maxResults": max_results,
                    "singleEvents": True,
                    "orderBy": "startTime",
                    "timeMin": datetime.utcnow().isoformat() + "Z"
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch events"
                )

            result = response.json()
            return {"success": True, "events": result.get("items", [])}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list events: {str(e)}")


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a calendar event"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to delete event"
                )

            return {"success": True, "message": "Event deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")


@router.patch("/events/{event_id}")
async def update_event(
    event_id: str,
    wallet_address: str,
    summary: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    location: Optional[str] = None,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update a calendar event"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        # First get the current event
        async with httpx.AsyncClient() as client:
            get_response = await client.get(
                f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if get_response.status_code != 200:
                raise HTTPException(
                    status_code=get_response.status_code,
                    detail="Failed to fetch event"
                )

            event = get_response.json()

            # Update fields
            if summary is not None:
                event["summary"] = summary
            if start is not None:
                event["start"] = {"dateTime": start, "timeZone": "UTC"}
            if end is not None:
                event["end"] = {"dateTime": end, "timeZone": "UTC"}
            if location is not None:
                event["location"] = location
            if description is not None:
                event["description"] = description

            # Update event
            update_response = await client.put(
                f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=event,
                timeout=30.0
            )

            if update_response.status_code != 200:
                raise HTTPException(
                    status_code=update_response.status_code,
                    detail="Failed to update event"
                )

            return {"success": True, "event": update_response.json()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update event: {str(e)}")


# ============================================================================
# Drive List/Delete Endpoints
# ============================================================================

@router.get("/files")
async def list_files(
    wallet_address: str,
    max_results: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List files from Google Drive"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "pageSize": max_results,
                    "fields": "files(id,name,mimeType,size,modifiedTime,owners,webViewLink,starred)"
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch files"
                )

            result = response.json()
            return {"success": True, "files": result.get("files", [])}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a file from Google Drive"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to delete file"
                )

            return {"success": True, "message": "File deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


# ============================================================================
# Contacts List/Delete/Update Endpoints
# ============================================================================

@router.get("/contacts")
async def list_contacts(
    wallet_address: str,
    max_results: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List contacts"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://people.googleapis.com/v1/people/me/connections",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "pageSize": max_results,
                    "personFields": "names,emailAddresses,phoneNumbers,organizations"
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch contacts"
                )

            result = response.json()
            return {"success": True, "contacts": result.get("connections", [])}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list contacts: {str(e)}")


@router.delete("/contacts/{resource_name}")
async def delete_contact(
    resource_name: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a contact"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://people.googleapis.com/v1/{resource_name}:deleteContact",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to delete contact"
                )

            return {"success": True, "message": "Contact deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete contact: {str(e)}")


@router.patch("/contacts/{resource_name}")
async def update_contact(
    resource_name: str,
    wallet_address: str,
    given_name: Optional[str] = None,
    family_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update a contact"""
    try:
        access_token = await get_google_access_token(wallet_address, db)

        # First get the current contact
        async with httpx.AsyncClient() as client:
            get_response = await client.get(
                f"https://people.googleapis.com/v1/{resource_name}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"personFields": "names,emailAddresses,phoneNumbers,organizations"},
                timeout=30.0
            )

            if get_response.status_code != 200:
                raise HTTPException(
                    status_code=get_response.status_code,
                    detail="Failed to fetch contact"
                )

            contact = get_response.json()

            # Update fields
            if given_name is not None or family_name is not None:
                if "names" not in contact:
                    contact["names"] = [{}]
                if given_name is not None:
                    contact["names"][0]["givenName"] = given_name
                if family_name is not None:
                    contact["names"][0]["familyName"] = family_name

            if email is not None:
                contact["emailAddresses"] = [{"value": email, "type": "work"}]

            if phone is not None:
                contact["phoneNumbers"] = [{"value": phone, "type": "work"}]

            if company is not None:
                contact["organizations"] = [{"name": company, "type": "work"}]

            # Update contact
            update_response = await client.patch(
                f"https://people.googleapis.com/v1/{resource_name}:updateContact",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                params={"updatePersonFields": "names,emailAddresses,phoneNumbers,organizations"},
                json=contact,
                timeout=30.0
            )

            if update_response.status_code != 200:
                raise HTTPException(
                    status_code=update_response.status_code,
                    detail="Failed to update contact"
                )

            return {"success": True, "contact": update_response.json()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")
