"""
Activity Feed API Endpoints
Exposes unified activity feed from all productivity integrations
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.unified_activity_feed import UnifiedActivityFeed

router = APIRouter(prefix="/activity-feed", tags=["Activity Feed"])


class ActivityFeedRequest(BaseModel):
    """Request model for fetching activity feed"""
    integrations: List[str]
    limit: int = 100
    since_days: Optional[int] = 7


class ActivityFeedResponse(BaseModel):
    """Response model for activity feed"""
    activities: List[dict]
    count: int
    period: dict


@router.post("/fetch", response_model=ActivityFeedResponse)
async def fetch_unified_feed(
    request: ActivityFeedRequest,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Fetch unified activity feed from multiple productivity integrations

    Args:
        request: Activity feed request parameters
        wallet_address: Business wallet address (required)

    Returns:
        Unified activity feed
    """
    try:
        service = UnifiedActivityFeed()

        since = datetime.utcnow() - timedelta(days=request.since_days)

        activities = await service.fetch_unified_feed(
            business_wallet=wallet_address,
            integrations=request.integrations,
            limit=request.limit,
            since=since
        )

        return ActivityFeedResponse(
            activities=activities,
            count=len(activities),
            period={
                "start": since.isoformat(),
                "end": datetime.utcnow().isoformat(),
                "days": request.since_days
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_activities(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(50, description="Maximum number of activities to return")
):
    """
    Get recent activities from all integrations

    Args:
        wallet_address: Business wallet address (required)
        limit: Maximum number of activities to return

    Returns:
        Recent activities
    """
    try:
        service = UnifiedActivityFeed()

        # Get all available integrations
        all_integrations = [
            "slack", "asana", "monday", "trello", "jira",
            "github", "zoom", "notion", "google", "microsoft"
        ]

        since = datetime.utcnow() - timedelta(days=7)

        activities = await service.fetch_unified_feed(
            business_wallet=wallet_address,
            integrations=all_integrations,
            limit=limit,
            since=since
        )

        return {
            "activities": activities,
            "count": len(activities)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
