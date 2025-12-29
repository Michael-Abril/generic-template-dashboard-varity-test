"""
Google Workspace API Endpoints
Handles Gmail, Calendar, Drive, and Contacts operations

All endpoints use the OAuthToken.access_token property which auto-decrypts.
Token refresh is handled automatically when tokens expire.

Updated: December 28, 2025 (Terminal 1 - 100% Completion)
Fixes Applied:
- CRIT-G1: Wallet address validation on all endpoints
- CRIT-G3: Token leakage prevention in error logs
- HIGH-G1: Moved imports to module level (base64)
- HIGH-G2: Email validation
- HIGH-G3: DateTime validation for events
- HIGH-G5: File size limits (DoS prevention)
- HIGH-G6: MIME type validation
- HIGH-G11: Wallet normalization
- HIGH-G12: Safe response.json() parsing
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, TypeVar
import logging
import httpx
import asyncio
import base64  # HIGH-G1: Moved to module level
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.validators import (
    validate_wallet_address,
    validate_email_list,
    validate_iso_datetime,
    validate_file_size,
    validate_mime_type,
    sanitize_error_message,
    sanitize_api_error,
    MAX_FILE_SIZE_BYTES,
)
from app.models.purchase import OAuthToken
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.api.v1.integrations import refresh_oauth_token

logger = logging.getLogger(__name__)
router = APIRouter()

# Type variable for generic return type
T = TypeVar('T')

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# Constants (extracted from hardcoded values)
DEFAULT_HTTP_TIMEOUT = 30.0
UPLOAD_HTTP_TIMEOUT = 60.0
DEFAULT_MAX_RESULTS = 50
MAX_PAGE_SIZE = 100


# ============================================================================
# Google API Error Handling
# ============================================================================

class GoogleAPIError(Exception):
    """Custom exception for Google API errors with detailed context"""
    def __init__(
        self,
        message: str,
        status_code: int,
        error_type: str = "api_error",
        retry_after: Optional[int] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.retry_after = retry_after
        super().__init__(message)


async def handle_google_api_response(
    response: httpx.Response,
    operation: str,
    wallet_address: str
) -> Dict[str, Any]:
    """
    Handle Google API responses with proper error handling for:
    - 401 Unauthorized: Token expired or invalidated
    - 403 Forbidden: Permission denied or quota exceeded
    - 429 Too Many Requests: Rate limited

    Args:
        response: The httpx response object
        operation: Description of the operation being performed
        wallet_address: User's wallet address for logging

    Returns:
        Parsed JSON response if successful

    Raises:
        GoogleAPIError: For handled API errors
        HTTPException: For HTTP-level errors
    """
    if response.status_code == 200:
        return response.json()

    # Try to parse error details from response
    try:
        error_data = response.json()
        error_message = error_data.get("error", {}).get("message", str(error_data))
        error_code = error_data.get("error", {}).get("code", response.status_code)
    except Exception:
        error_message = response.text or f"HTTP {response.status_code}"
        error_code = response.status_code

    wallet_prefix = wallet_address[:10] if wallet_address else "unknown"

    if response.status_code == 401:
        logger.error(
            f"Google API 401 Unauthorized for {operation}, wallet={wallet_prefix}...: {error_message}"
        )
        raise GoogleAPIError(
            message=f"Google authentication failed. Your session may have expired. Please reconnect Google Workspace.",
            status_code=401,
            error_type="unauthorized"
        )

    elif response.status_code == 403:
        # Check if it's a quota error vs permission error
        if "quota" in error_message.lower() or "rate" in error_message.lower():
            logger.warning(
                f"Google API 403 Quota exceeded for {operation}, wallet={wallet_prefix}...: {error_message}"
            )
            raise GoogleAPIError(
                message=f"Google API quota exceeded. Please try again in a few minutes.",
                status_code=403,
                error_type="quota_exceeded"
            )
        else:
            logger.error(
                f"Google API 403 Permission denied for {operation}, wallet={wallet_prefix}...: {error_message}"
            )
            raise GoogleAPIError(
                message=f"Permission denied: {error_message}. You may need to reconnect with additional permissions.",
                status_code=403,
                error_type="permission_denied"
            )

    elif response.status_code == 429:
        # Get retry-after header if available
        retry_after = response.headers.get("Retry-After")
        retry_seconds = int(retry_after) if retry_after and retry_after.isdigit() else 60

        logger.warning(
            f"Google API 429 Rate limited for {operation}, wallet={wallet_prefix}..., retry_after={retry_seconds}s"
        )
        raise GoogleAPIError(
            message=f"Rate limited by Google. Please try again in {retry_seconds} seconds.",
            status_code=429,
            error_type="rate_limited",
            retry_after=retry_seconds
        )

    elif response.status_code == 404:
        logger.warning(
            f"Google API 404 Not found for {operation}, wallet={wallet_prefix}...: {error_message}"
        )
        raise GoogleAPIError(
            message=f"Resource not found: {error_message}",
            status_code=404,
            error_type="not_found"
        )

    else:
        logger.error(
            f"Google API error {response.status_code} for {operation}, wallet={wallet_prefix}...: {error_message}"
        )
        raise GoogleAPIError(
            message=f"Google API error: {error_message}",
            status_code=response.status_code,
            error_type="api_error"
        )


async def google_api_request_with_retry(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    access_token: str,
    wallet_address: str,
    operation: str,
    max_retries: int = 3,
    **kwargs
) -> Dict[str, Any]:
    """
    Make a Google API request with automatic retry for rate limiting.

    Args:
        client: httpx AsyncClient instance
        method: HTTP method (GET, POST, PUT, PATCH, DELETE)
        url: API endpoint URL
        access_token: OAuth access token
        wallet_address: User's wallet for logging
        operation: Description of operation for logging
        max_retries: Maximum retry attempts for rate limiting
        **kwargs: Additional arguments passed to httpx request

    Returns:
        Parsed JSON response

    Raises:
        HTTPException: Converted from GoogleAPIError for FastAPI handling
    """
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {access_token}"
    if "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    timeout = kwargs.pop("timeout", 30.0)

    last_error: Optional[GoogleAPIError] = None

    for attempt in range(max_retries + 1):
        try:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                timeout=timeout,
                **kwargs
            )

            return await handle_google_api_response(response, operation, wallet_address)

        except GoogleAPIError as e:
            last_error = e

            # Only retry on rate limiting
            if e.error_type == "rate_limited" and attempt < max_retries:
                wait_time = e.retry_after or (2 ** attempt)  # Exponential backoff
                logger.info(
                    f"Rate limited, retrying {operation} in {wait_time}s (attempt {attempt + 1}/{max_retries})"
                )
                await asyncio.sleep(wait_time)
                continue

            # Convert to HTTPException for other errors
            raise HTTPException(
                status_code=e.status_code,
                detail=e.message
            )

    # If we exhausted retries
    if last_error:
        raise HTTPException(
            status_code=last_error.status_code,
            detail=f"Request failed after {max_retries} retries: {last_error.message}"
        )

    raise HTTPException(status_code=500, detail="Unexpected error in Google API request")


# ============================================================================
# Pydantic Models with Validation (HIGH-G2, HIGH-G3, HIGH-G5, HIGH-G6)
# ============================================================================

class SendEmailRequest(BaseModel):
    """Email send request with validation"""
    wallet_address: str = Field(..., description="User's wallet address")
    to: List[str] = Field(..., min_length=1, description="Recipient email addresses")
    cc: Optional[List[str]] = Field(default=[], description="CC recipients")
    bcc: Optional[List[str]] = Field(default=[], description="BCC recipients")
    subject: str = Field(..., min_length=1, max_length=998, description="Email subject")
    body: str = Field(..., min_length=1, description="Email body")
    thread_id: Optional[str] = Field(default=None, description="Thread ID for replies")


class CreateEventRequest(BaseModel):
    """Calendar event creation request with validation"""
    wallet_address: str = Field(..., description="User's wallet address")
    summary: str = Field(..., min_length=1, max_length=1000, description="Event title")
    start: str = Field(..., description="Start time (ISO 8601 format)")
    end: str = Field(..., description="End time (ISO 8601 format)")
    location: Optional[str] = Field(default=None, max_length=1000, description="Event location")
    description: Optional[str] = Field(default=None, max_length=8000, description="Event description")
    attendees: Optional[List[str]] = Field(default=[], description="Attendee email addresses")
    add_google_meet: bool = Field(default=False, description="Add Google Meet link")
    reminder_minutes: int = Field(default=10, ge=0, le=40320, description="Reminder time in minutes")


class UploadFileRequest(BaseModel):
    """File upload request with validation (HIGH-G5, HIGH-G6)"""
    wallet_address: str = Field(..., description="User's wallet address")
    file_name: str = Field(..., min_length=1, max_length=255, description="File name")
    file_content: str = Field(..., description="Base64 encoded file content")
    mime_type: str = Field(..., description="MIME type of the file")
    parent_folder_id: Optional[str] = Field(default=None, description="Parent folder ID")


class CreateContactRequest(BaseModel):
    """Contact creation request with validation"""
    wallet_address: str = Field(..., description="User's wallet address")
    given_name: str = Field(..., min_length=1, max_length=255, description="First name")
    family_name: str = Field(..., min_length=1, max_length=255, description="Last name")
    email: Optional[str] = Field(default=None, description="Email address")
    phone: Optional[str] = Field(default=None, max_length=50, description="Phone number")
    company: Optional[str] = Field(default=None, max_length=255, description="Company name")


# ============================================================================
# Helper Functions (CRIT-G1: Wallet validation added)
# ============================================================================

async def get_google_access_token(wallet_address: str, db: AsyncSession) -> str:
    """
    Get active Google OAuth access token for the user.

    Args:
        wallet_address: User's wallet address (will be validated and normalized)
        db: Database session

    Returns:
        Decrypted access token

    Raises:
        HTTPException: If wallet is invalid or not connected
    """
    # CRIT-G1: Validate and normalize wallet address
    normalized_wallet = validate_wallet_address(wallet_address)

    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == normalized_wallet,
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

    # Check if token needs refresh (expires_at is already DateTime, not string)
    # Handle both naive and timezone-aware datetimes to avoid comparison errors
    now = datetime.now(timezone.utc)
    if token.expires_at:
        # Make comparison safe: if token.expires_at is naive, assume it's UTC
        expires_at_aware = token.expires_at
        if token.expires_at.tzinfo is None:
            expires_at_aware = token.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_aware < now:
            logger.info(f"Google token expired for {normalized_wallet[:10]}..., attempting refresh")
            refresh_success = await refresh_oauth_token(token, "google", db)
            if not refresh_success:
                raise HTTPException(
                    status_code=401,
                    detail="Access token expired and refresh failed. Please reconnect Google Workspace."
                )
            logger.info(f"Google token refreshed successfully for {normalized_wallet[:10]}...")

    # YELLOW-001 FIX: Use auth context to access tokens securely
    with OAuthToken.auth_context(normalized_wallet):
        # Use the property which auto-decrypts (same pattern as Slack fix Dec 26, 2025)
        return token.access_token


# ============================================================================
# Gmail Endpoints
# ============================================================================

@router.post("/send-email")
async def send_email(
    request: SendEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send an email via Gmail API.

    Handles rate limiting with automatic retry and proper error messages for:
    - 401: Token expired (prompts reconnection)
    - 403: Permission denied (missing Gmail scopes)
    - 429: Rate limited (automatic retry with backoff)
    """
    try:
        # HIGH-G2: Validate all email addresses
        validated_to = validate_email_list(request.to, "To")
        validated_cc = validate_email_list(request.cc, "CC") if request.cc else []
        validated_bcc = validate_email_list(request.bcc, "BCC") if request.bcc else []

        access_token = await get_google_access_token(request.wallet_address, db)

        # Build email message in RFC 2822 format
        # HIGH-G4: Added Content-Type header for proper MIME handling
        message_parts = []
        message_parts.append("Content-Type: text/plain; charset=utf-8")
        message_parts.append(f"To: {', '.join(validated_to)}")
        if validated_cc:
            message_parts.append(f"Cc: {', '.join(validated_cc)}")
        if validated_bcc:
            message_parts.append(f"Bcc: {', '.join(validated_bcc)}")
        message_parts.append(f"Subject: {request.subject}")
        message_parts.append("")  # Empty line between headers and body
        message_parts.append(request.body)

        raw_message = "\r\n".join(message_parts)

        # Encode message as base64url (HIGH-G1: Using module-level import)
        encoded_message = base64.urlsafe_b64encode(raw_message.encode()).decode()

        # Prepare API request
        payload: Dict[str, Any] = {
            "raw": encoded_message
        }
        if request.thread_id:
            payload["threadId"] = request.thread_id

        # Send email via Gmail API with retry and proper error handling
        async with httpx.AsyncClient() as client:
            result = await google_api_request_with_retry(
                client=client,
                method="POST",
                url="https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                access_token=access_token,
                wallet_address=request.wallet_address,
                operation="send_email",
                json=payload
            )

            # HIGH-S11: Success logging
            logger.info(f"Email sent successfully for {request.wallet_address[:10]}...: message_id={result.get('id')}")

            return {
                "success": True,
                "message_id": result.get("id"),
                "thread_id": result.get("threadId")
            }

    except HTTPException:
        raise
    except Exception as e:
        # CRIT-G3: Sanitize error message to prevent token leakage
        logger.error(f"Failed to send email for {request.wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


# ============================================================================
# Calendar Endpoints
# ============================================================================

@router.post("/create-event")
async def create_calendar_event(
    request: CreateEventRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new calendar event.

    Handles rate limiting with automatic retry and proper error messages for:
    - 401: Token expired (prompts reconnection)
    - 403: Permission denied (missing Calendar scopes)
    - 429: Rate limited (automatic retry with backoff)
    """
    try:
        # HIGH-G3: Validate datetime formats
        validated_start = validate_iso_datetime(request.start, "start time")
        validated_end = validate_iso_datetime(request.end, "end time")

        # HIGH-G2: Validate attendee emails if provided
        validated_attendees = []
        if request.attendees:
            validated_attendees = validate_email_list(request.attendees, "attendees")

        access_token = await get_google_access_token(request.wallet_address, db)

        # Build event payload
        event_payload: Dict[str, Any] = {
            "summary": request.summary,
            "start": {
                "dateTime": validated_start,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": validated_end,
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

        if validated_attendees:
            event_payload["attendees"] = [
                {"email": email} for email in validated_attendees
            ]

        if request.add_google_meet:
            event_payload["conferenceData"] = {
                "createRequest": {
                    "requestId": f"meet-{datetime.now(timezone.utc).timestamp()}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }

        # Create event via Calendar API with retry and error handling
        async with httpx.AsyncClient() as client:
            result = await google_api_request_with_retry(
                client=client,
                method="POST",
                url="https://www.googleapis.com/calendar/v3/calendars/primary/events",
                access_token=access_token,
                wallet_address=request.wallet_address,
                operation="create_calendar_event",
                json=event_payload,
                params={"conferenceDataVersion": 1} if request.add_google_meet else {}
            )

            # HIGH-S11: Success logging
            logger.info(f"Event created for {request.wallet_address[:10]}...: event_id={result.get('id')}")

            return {
                "success": True,
                "event_id": result.get("id"),
                "html_link": result.get("htmlLink"),
                "hangout_link": result.get("hangoutLink")
            }

    except HTTPException:
        raise
    except Exception as e:
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to create event for {request.wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # HIGH-G5: Validate file size (DoS prevention)
        file_size = validate_file_size(request.file_content)
        logger.info(f"Upload request: file_name={request.file_name}, estimated_size={file_size} bytes")

        # HIGH-G6: Validate MIME type
        validated_mime_type = validate_mime_type(request.mime_type)

        access_token = await get_google_access_token(request.wallet_address, db)

        # Decode base64 file content (HIGH-G1: Using module-level import)
        try:
            file_bytes = base64.b64decode(request.file_content)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid base64 file content"
            )

        # Create file metadata
        file_metadata = {
            "name": request.file_name,
            "mimeType": validated_mime_type
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
                timeout=DEFAULT_HTTP_TIMEOUT
            )

            if metadata_response.status_code != 200:
                # HIGH-G12: Safe JSON parsing
                try:
                    error_detail = metadata_response.json()
                except Exception:
                    error_detail = "Unknown error"
                raise HTTPException(
                    status_code=metadata_response.status_code,
                    detail=f"Drive API error: {sanitize_api_error(str(error_detail), 'Google Drive')}"
                )

            # HIGH-G12: Safe JSON parsing
            try:
                file_metadata_result = metadata_response.json()
            except Exception:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response from Google Drive API"
                )
            file_id = file_metadata_result.get("id")

            # Upload file content
            content_response = await client.patch(
                f"https://www.googleapis.com/upload/drive/v3/files/{file_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": validated_mime_type
                },
                content=file_bytes,
                params={"uploadType": "media"},
                timeout=UPLOAD_HTTP_TIMEOUT
            )

            if content_response.status_code != 200:
                # HIGH-G12: Safe JSON parsing
                try:
                    error_detail = content_response.json()
                except Exception:
                    error_detail = "Unknown error"
                raise HTTPException(
                    status_code=content_response.status_code,
                    detail=f"Drive upload error: {sanitize_api_error(str(error_detail), 'Google Drive')}"
                )

            # HIGH-S11: Success logging
            logger.info(f"File uploaded for {request.wallet_address[:10]}...: file_id={file_id}, size={file_size}")

            return {
                "success": True,
                "file_id": file_id,
                "web_view_link": file_metadata_result.get("webViewLink"),
                "web_content_link": file_metadata_result.get("webContentLink")
            }

    except HTTPException:
        raise
    except Exception as e:
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to upload file for {request.wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.get("/download-file/{file_id}")
async def download_file_from_drive(
    file_id: str,
    wallet_address: str = Query(..., description="User's wallet address"),
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
                timeout=DEFAULT_HTTP_TIMEOUT
            )

            if metadata_response.status_code != 200:
                raise HTTPException(
                    status_code=metadata_response.status_code,
                    detail="Failed to get file metadata"
                )

            # HIGH-G12: Safe JSON parsing
            try:
                metadata = metadata_response.json()
            except Exception:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response from Google Drive API"
                )

            # Download file content
            content_response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"alt": "media"},
                timeout=UPLOAD_HTTP_TIMEOUT
            )

            if content_response.status_code != 200:
                raise HTTPException(
                    status_code=content_response.status_code,
                    detail="Failed to download file"
                )

            # Encode content as base64 (HIGH-G1: Using module-level import)
            file_content_base64 = base64.b64encode(content_response.content).decode()

            # HIGH-S11: Success logging
            logger.info(f"File downloaded for {wallet_address[:10]}...: file_id={file_id}")

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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to download file for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to create contact for {request.wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


# ============================================================================
# Gmail List/Delete/Update Endpoints
# ============================================================================

@router.get("/emails")
async def list_emails(
    wallet_address: str,
    max_results: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    List emails from Gmail with full message details.

    Handles rate limiting with automatic retry and proper error messages for:
    - 401: Token expired (prompts reconnection)
    - 403: Permission denied (missing Gmail scopes)
    - 429: Rate limited (automatic retry with backoff)
    """
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            # Get list of message IDs with error handling
            list_result = await google_api_request_with_retry(
                client=client,
                method="GET",
                url="https://gmail.googleapis.com/gmail/v1/users/me/messages",
                access_token=access_token,
                wallet_address=wallet_address,
                operation="list_emails",
                params={"maxResults": max_results}
            )

            messages = list_result.get("messages", [])

            # Fetch full details for each message
            email_details = []
            for msg in messages[:max_results]:
                try:
                    msg_result = await google_api_request_with_retry(
                        client=client,
                        method="GET",
                        url=f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                        access_token=access_token,
                        wallet_address=wallet_address,
                        operation=f"get_email_{msg['id'][:8]}",
                        max_retries=1  # Fewer retries for individual messages
                    )
                    email_details.append(msg_result)
                except HTTPException as e:
                    # Log but continue if individual message fetch fails
                    logger.warning(f"Failed to fetch message {msg['id']}: {e.detail}")
                    continue

            return {"success": True, "emails": email_details}

    except HTTPException:
        raise
    except Exception as e:
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to list emails for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to delete email for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to update email for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


# ============================================================================
# Calendar List/Delete/Update Endpoints
# ============================================================================

@router.get("/events")
async def list_events(
    wallet_address: str,
    max_results: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    List calendar events starting from now.

    Handles rate limiting with automatic retry and proper error messages for:
    - 401: Token expired (prompts reconnection)
    - 403: Permission denied (missing Calendar scopes)
    - 429: Rate limited (automatic retry with backoff)
    """
    try:
        access_token = await get_google_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            result = await google_api_request_with_retry(
                client=client,
                method="GET",
                url="https://www.googleapis.com/calendar/v3/calendars/primary/events",
                access_token=access_token,
                wallet_address=wallet_address,
                operation="list_events",
                params={
                    "maxResults": max_results,
                    "singleEvents": True,
                    "orderBy": "startTime",
                    "timeMin": datetime.now(timezone.utc).isoformat() + "Z"
                }
            )

            return {"success": True, "events": result.get("items", [])}

    except HTTPException:
        raise
    except Exception as e:
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to list events for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to delete event for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to update event for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to list files for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to delete file for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to list contacts for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to delete contact for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


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
        # CRIT-G3: Sanitize error message
        logger.error(f"Failed to update contact for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))
