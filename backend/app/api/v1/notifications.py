"""
Cross-Tool Notifications API Endpoints
Manages notifications across all productivity tools
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel

from app.services.cross_tool_notifications import (
    CrossToolNotifications,
    NotificationPriority,
    NotificationCategory
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    """Request model for sending notification"""
    user_id: str
    notification: Dict[str, Any]


class UpdatePreferencesRequest(BaseModel):
    """Request model for updating notification preferences"""
    user_id: str
    preferences: Dict[str, Any]


@router.post("/send")
async def send_notification(request: SendNotificationRequest):
    """
    Send cross-tool notification

    Args:
        request: Notification request

    Returns:
        Delivery status
    """
    try:
        service = CrossToolNotifications()

        result = await service.send_notification(
            user_id=request.user_id,
            notification=request.notification
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    """
    Get user notification preferences

    Args:
        user_id: User identifier

    Returns:
        User preferences
    """
    try:
        service = CrossToolNotifications()
        preferences = await service._get_user_preferences(user_id)

        return {
            "user_id": user_id,
            "preferences": preferences
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences")
async def update_preferences(request: UpdatePreferencesRequest):
    """
    Update user notification preferences

    Args:
        request: Preferences update request

    Returns:
        Updated preferences
    """
    try:
        service = CrossToolNotifications()

        updated_preferences = await service.update_user_preferences(
            user_id=request.user_id,
            preferences=request.preferences
        )

        return {
            "user_id": request.user_id,
            "preferences": updated_preferences
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_notification(user_id: str):
    """
    Send test notification

    Args:
        user_id: User identifier

    Returns:
        Test result
    """
    try:
        service = CrossToolNotifications()

        test_notification = {
            "type": "test",
            "title": "Test Notification",
            "description": "This is a test notification from the cross-tool notifications system",
            "category": NotificationCategory.SYSTEM,
            "priority": NotificationPriority.NORMAL,
            "integration": "system",
            "timestamp": "2025-12-05T00:00:00Z"
        }

        result = await service.send_notification(
            user_id=user_id,
            notification=test_notification
        )

        return {
            "status": "success",
            "result": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
