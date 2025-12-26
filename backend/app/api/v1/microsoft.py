"""
Microsoft 365 API Endpoints
Provides full CRUD operations for Outlook, Calendar, OneDrive, Contacts, and To Do
"""
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import httpx
import base64

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.purchase import OAuthToken

router = APIRouter()
logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"


async def get_access_token_from_db(wallet_address: str, db: AsyncSession) -> Optional[str]:
    """Get OAuth access token for Microsoft 365"""
    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == wallet_address.lower(),
                OAuthToken.provider == "microsoft"
            )
        )
    )
    token = result.scalar_one_or_none()
    return token.access_token if token else None


# ============================================================================
# OUTLOOK MAIL ENDPOINTS
# ============================================================================

@router.get("/mail/messages")
async def get_mail_messages(
    wallet_address: str = Query(...),
    folder: str = Query("inbox"),
    top: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get email messages from a folder"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        folder_map = {
            "inbox": "inbox",
            "sent": "sentitems",
            "drafts": "drafts",
            "junk": "junkemail",
            "deleted": "deleteditems",
            "archive": "archive"
        }

        folder_id = folder_map.get(folder, folder)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GRAPH_API_BASE}/me/mailFolders/{folder_id}/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "$top": top,
                    "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,importance,hasAttachments",
                    "$orderby": "receivedDateTime desc"
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "messages": data.get("value", [])}

    except Exception as e:
        logger.error(f"Error fetching mail messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mail/send")
async def send_email(
    wallet_address: str = Body(..., embed=True),
    to: List[str] = Body(...),
    subject: str = Body(...),
    body: str = Body(...),
    cc: Optional[List[str]] = Body(None),
    bcc: Optional[List[str]] = Body(None),
    importance: str = Body("normal"),
    db: AsyncSession = Depends(get_db)
):
    """Send an email"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": body
                },
                "toRecipients": [{"emailAddress": {"address": addr}} for addr in to],
                "importance": importance
            }
        }

        if cc:
            message["message"]["ccRecipients"] = [{"emailAddress": {"address": addr}} for addr in cc]
        if bcc:
            message["message"]["bccRecipients"] = [{"emailAddress": {"address": addr}} for addr in bcc]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/sendMail",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=message
            )
            response.raise_for_status()
            return {"success": True, "message": "Email sent successfully"}

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mail/drafts")
async def save_draft(
    wallet_address: str = Body(..., embed=True),
    to: List[str] = Body(...),
    subject: str = Body(...),
    body: str = Body(...),
    cc: Optional[List[str]] = Body(None),
    importance: str = Body("normal"),
    db: AsyncSession = Depends(get_db)
):
    """Save email as draft"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        message = {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body
            },
            "toRecipients": [{"emailAddress": {"address": addr}} for addr in to],
            "importance": importance
        }

        if cc:
            message["ccRecipients"] = [{"emailAddress": {"address": addr}} for addr in cc]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/messages",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=message
            )
            response.raise_for_status()
            draft = response.json()
            return {"success": True, "draft": draft}

    except Exception as e:
        logger.error(f"Error saving draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/mail/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    wallet_address: str = Body(..., embed=True),
    is_read: bool = Body(True),
    db: AsyncSession = Depends(get_db)
):
    """Mark a message as read or unread"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{GRAPH_API_BASE}/me/messages/{message_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={"isRead": is_read}
            )
            response.raise_for_status()
            return {"success": True, "message": f"Message marked as {'read' if is_read else 'unread'}"}

    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/mail/messages/{message_id}")
async def delete_message(
    message_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a message (moves to Deleted Items)"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/messages/{message_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return {"success": True, "message": "Message deleted"}

    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mail/messages/{message_id}/archive")
async def archive_message(
    message_id: str,
    wallet_address: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """Move a message to the Archive folder"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            # Move message to archive folder
            response = await client.post(
                f"{GRAPH_API_BASE}/me/messages/{message_id}/move",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={"destinationId": "archive"}
            )
            response.raise_for_status()
            return {"success": True, "message": "Message archived"}

    except Exception as e:
        logger.error(f"Error archiving message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CALENDAR ENDPOINTS
# ============================================================================

@router.get("/calendar/events")
async def get_calendar_events(
    wallet_address: str = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get calendar events"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        params = {
            "$select": "id,subject,start,end,location,attendees,organizer,isAllDay,importance,isOnlineMeeting",
            "$top": 100
        }

        if start_date and end_date:
            params["startDateTime"] = start_date
            params["endDateTime"] = end_date

        async with httpx.AsyncClient() as client:
            if start_date and end_date:
                response = await client.get(
                    f"{GRAPH_API_BASE}/me/calendar/calendarView",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params
                )
            else:
                response = await client.get(
                    f"{GRAPH_API_BASE}/me/calendar/events",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params
                )

            response.raise_for_status()
            data = response.json()
            return {"success": True, "events": data.get("value", [])}

    except Exception as e:
        logger.error(f"Error fetching calendar events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calendar/events")
async def create_event(
    wallet_address: str = Body(..., embed=True),
    subject: str = Body(...),
    start: Dict[str, str] = Body(...),
    end: Dict[str, str] = Body(...),
    location: Optional[str] = Body(None),
    attendees: Optional[List[str]] = Body(None),
    is_online_meeting: bool = Body(False),
    body_content: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Create a calendar event"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        event = {
            "subject": subject,
            "start": start,
            "end": end,
            "isOnlineMeeting": is_online_meeting
        }

        if location:
            event["location"] = {"displayName": location}

        if body_content:
            event["body"] = {"contentType": "HTML", "content": body_content}

        if attendees:
            event["attendees"] = [
                {"emailAddress": {"address": addr}, "type": "required"}
                for addr in attendees
            ]

        if is_online_meeting:
            event["onlineMeetingProvider"] = "teamsForBusiness"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/calendar/events",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=event
            )
            response.raise_for_status()
            created_event = response.json()
            return {"success": True, "event": created_event}

    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/calendar/events/{event_id}")
async def delete_event(
    event_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a calendar event"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/calendar/events/{event_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return {"success": True, "message": "Event deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting calendar event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ONEDRIVE ENDPOINTS
# ============================================================================

@router.get("/onedrive/files")
async def get_onedrive_files(
    wallet_address: str = Query(...),
    folder_id: Optional[str] = Query(None),
    view: str = Query("files"),
    db: AsyncSession = Depends(get_db)
):
    """Get OneDrive files"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        if view == "recent":
            endpoint = f"{GRAPH_API_BASE}/me/drive/recent"
        elif view == "shared":
            endpoint = f"{GRAPH_API_BASE}/me/drive/sharedWithMe"
        elif folder_id:
            endpoint = f"{GRAPH_API_BASE}/me/drive/items/{folder_id}/children"
        else:
            endpoint = f"{GRAPH_API_BASE}/me/drive/root/children"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "$top": 100,
                    "$select": "id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,createdBy"
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "files": data.get("value", [])}

    except Exception as e:
        logger.error(f"Error fetching OneDrive files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onedrive/upload")
async def upload_file(
    wallet_address: str = Body(..., embed=True),
    file_name: str = Body(...),
    file_content: str = Body(...),
    folder_id: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to OneDrive (small files < 4MB)"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        if folder_id:
            endpoint = f"{GRAPH_API_BASE}/me/drive/items/{folder_id}:/{file_name}:/content"
        else:
            endpoint = f"{GRAPH_API_BASE}/me/drive/root:/{file_name}:/content"

        # Decode base64 content to binary
        try:
            binary_content = base64.b64decode(file_content)
        except Exception:
            # Fallback: if not base64, treat as plain text
            binary_content = file_content.encode()

        async with httpx.AsyncClient() as client:
            response = await client.put(
                endpoint,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/octet-stream"
                },
                content=binary_content
            )
            response.raise_for_status()
            file_info = response.json()
            return {"success": True, "file": file_info}

    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/onedrive/files/{file_id}")
async def delete_file(
    file_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a file from OneDrive"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/drive/items/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return {"success": True, "message": "File deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONTACTS ENDPOINTS
# ============================================================================

@router.get("/contacts")
async def get_contacts(
    wallet_address: str = Query(...),
    top: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Get contacts"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GRAPH_API_BASE}/me/contacts",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "$top": top,
                    "$select": "id,displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle"
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "contacts": data.get("value", [])}

    except Exception as e:
        logger.error(f"Error fetching contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contacts")
async def create_contact(
    wallet_address: str = Body(..., embed=True),
    name: str = Body(...),
    email: Optional[str] = Body(None),
    phone: Optional[str] = Body(None),
    company: Optional[str] = Body(None),
    job_title: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Create a new contact"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        contact = {"displayName": name}

        if email:
            contact["emailAddresses"] = [{"address": email, "name": name}]
        if phone:
            contact["businessPhones"] = [phone]
        if company:
            contact["companyName"] = company
        if job_title:
            contact["jobTitle"] = job_title

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/contacts",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=contact
            )
            response.raise_for_status()
            created_contact = response.json()
            return {"success": True, "contact": created_contact}

    except Exception as e:
        logger.error(f"Error creating contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a contact"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/contacts/{contact_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return {"success": True, "message": "Contact deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TO DO (TASKS) ENDPOINTS
# ============================================================================

@router.get("/tasks")
async def get_tasks(
    wallet_address: str = Query(...),
    list_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks from To Do"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        # First get task lists
        async with httpx.AsyncClient() as client:
            lists_response = await client.get(
                f"{GRAPH_API_BASE}/me/todo/lists",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            lists_response.raise_for_status()
            lists = lists_response.json().get("value", [])

            # If no specific list, get tasks from all lists
            all_tasks = []
            target_lists = [list_id] if list_id else [l["id"] for l in lists]

            for lid in target_lists:
                tasks_response = await client.get(
                    f"{GRAPH_API_BASE}/me/todo/lists/{lid}/tasks",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                tasks_response.raise_for_status()
                tasks = tasks_response.json().get("value", [])
                for task in tasks:
                    task["listId"] = lid
                all_tasks.extend(tasks)

            return {"success": True, "tasks": all_tasks, "lists": lists}

    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks")
async def create_task(
    wallet_address: str = Body(..., embed=True),
    title: str = Body(...),
    list_id: str = Body(...),
    due_date: Optional[str] = Body(None),
    importance: str = Body("normal"),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        task = {
            "title": title,
            "importance": importance,
            "status": "notStarted"
        }

        if due_date:
            task["dueDateTime"] = {
                "dateTime": due_date,
                "timeZone": "UTC"
            }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/todo/lists/{list_id}/tasks",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=task
            )
            response.raise_for_status()
            created_task = response.json()
            return {"success": True, "task": created_task}

    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    wallet_address: str = Body(..., embed=True),
    list_id: str = Body(...),
    is_completed: Optional[bool] = Body(None),
    title: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Update a task"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        update_data = {}

        if is_completed is not None:
            update_data["status"] = "completed" if is_completed else "notStarted"
        if title:
            update_data["title"] = title

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{GRAPH_API_BASE}/me/todo/lists/{list_id}/tasks/{task_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=update_data
            )
            response.raise_for_status()
            updated_task = response.json()
            return {"success": True, "task": updated_task}

    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    wallet_address: str = Query(...),
    list_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task"""
    access_token = await get_access_token_from_db(wallet_address, db)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated with Microsoft 365")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/todo/lists/{list_id}/tasks/{task_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return {"success": True, "message": "Task deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
