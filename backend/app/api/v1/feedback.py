"""
Feedback API Endpoints

Provides endpoints for collecting and managing user feedback during trial milestones.
Feedback is collected at Day 7, Day 25, and Day 30 of the trial period.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.models.feedback import Feedback, FeedbackSummary
from app.models.user_settings import UserSettings
from app.models.purchase import OAuthToken

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class FeedbackSubmitRequest(BaseModel):
    """Request to submit feedback"""
    feedback_type: str = Field(..., description="Feedback type: day7, day25, or day30")
    trial_days_remaining: Optional[int] = None
    responses: Dict[str, Any] = Field(..., description="Feedback responses as key-value pairs")


class FeedbackResponse(BaseModel):
    """Feedback response"""
    id: int
    wallet_address: str
    feedback_type: str
    trial_days_remaining: Optional[int]
    company_name: Optional[str]
    responses: Dict[str, Any]
    submitted_at: datetime

    class Config:
        from_attributes = True


class FeedbackStatsResponse(BaseModel):
    """Feedback statistics for a specific type"""
    feedback_type: str
    total_submissions: int
    avg_nps: Optional[float] = None
    avg_satisfaction: Optional[float] = None
    decision_breakdown: Optional[Dict[str, int]] = None


# Endpoints
@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    wallet_address: str = Query(..., description="User's wallet address"),
    request: FeedbackSubmitRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit user feedback for a trial milestone.

    Feedback types:
    - day7: Week 1 check-in (satisfaction rating, blockers, feature requests)
    - day25: Pre-trial end (most useful feature, likelihood to continue, improvements)
    - day30: Trial ending (NPS score, decision, final thoughts)
    """
    try:
        # Validate feedback type
        valid_types = ["day7", "day25", "day30"]
        if request.feedback_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid feedback type. Must be one of: {valid_types}"
            )

        # Check if feedback already exists for this milestone
        existing = await db.execute(
            select(Feedback).where(
                and_(
                    Feedback.wallet_address == wallet_address,
                    Feedback.feedback_type == request.feedback_type
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Feedback for {request.feedback_type} already submitted"
            )

        # Get user settings for context
        settings_result = await db.execute(
            select(UserSettings).where(UserSettings.wallet_address == wallet_address)
        )
        user_settings = settings_result.scalar_one_or_none()

        # Calculate session duration
        session_duration_days = None
        if user_settings and user_settings.trial_start_date:
            delta = datetime.utcnow() - user_settings.trial_start_date.replace(tzinfo=None)
            session_duration_days = delta.days

        # Count integrations
        integrations_result = await db.execute(
            select(func.count(OAuthToken.id)).where(
                OAuthToken.user_address == wallet_address
            )
        )
        integrations_count = integrations_result.scalar() or 0

        # Create feedback record
        feedback = Feedback(
            wallet_address=wallet_address,
            feedback_type=request.feedback_type,
            trial_days_remaining=request.trial_days_remaining,
            company_name=user_settings.company_name if user_settings else None,
            industry=user_settings.industry if user_settings else None,
            responses=request.responses,
            session_duration_days=session_duration_days,
            integrations_connected=integrations_count
        )

        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)

        logger.info(
            f"Feedback submitted: wallet={wallet_address}, type={request.feedback_type}, "
            f"session_days={session_duration_days}, integrations={integrations_count}"
        )

        return FeedbackResponse(
            id=feedback.id,
            wallet_address=feedback.wallet_address,
            feedback_type=feedback.feedback_type,
            trial_days_remaining=feedback.trial_days_remaining,
            company_name=feedback.company_name,
            responses=feedback.responses,
            submitted_at=feedback.submitted_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/feedback/status")
async def get_feedback_status(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get feedback submission status for a user.

    Returns which milestones have been completed and which are pending.
    """
    try:
        # Get all feedback for this user
        result = await db.execute(
            select(Feedback.feedback_type, Feedback.submitted_at).where(
                Feedback.wallet_address == wallet_address
            )
        )
        submitted = {row.feedback_type: row.submitted_at for row in result}

        return {
            "wallet_address": wallet_address,
            "feedback_status": {
                "day7": {
                    "submitted": "day7" in submitted,
                    "submitted_at": submitted.get("day7")
                },
                "day25": {
                    "submitted": "day25" in submitted,
                    "submitted_at": submitted.get("day25")
                },
                "day30": {
                    "submitted": "day30" in submitted,
                    "submitted_at": submitted.get("day30")
                }
            }
        }

    except Exception as e:
        logger.error(f"Error fetching feedback status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch feedback status: {str(e)}"
        )


@router.get("/feedback/history", response_model=List[FeedbackResponse])
async def get_feedback_history(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all feedback submitted by a user.
    """
    try:
        result = await db.execute(
            select(Feedback).where(
                Feedback.wallet_address == wallet_address
            ).order_by(Feedback.submitted_at.desc())
        )
        feedback_list = result.scalars().all()

        return [
            FeedbackResponse(
                id=f.id,
                wallet_address=f.wallet_address,
                feedback_type=f.feedback_type,
                trial_days_remaining=f.trial_days_remaining,
                company_name=f.company_name,
                responses=f.responses,
                submitted_at=f.submitted_at
            )
            for f in feedback_list
        ]

    except Exception as e:
        logger.error(f"Error fetching feedback history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch feedback history: {str(e)}"
        )


@router.get("/feedback/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(
    feedback_type: str = Query(..., description="Feedback type: day7, day25, or day30"),
    days: int = Query(30, description="Number of days to include in stats"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregated feedback statistics for admin dashboard.

    Requires admin permissions (not implemented in this version).
    """
    try:
        # Validate feedback type
        valid_types = ["day7", "day25", "day30"]
        if feedback_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid feedback type. Must be one of: {valid_types}"
            )

        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get feedback within date range
        result = await db.execute(
            select(Feedback).where(
                and_(
                    Feedback.feedback_type == feedback_type,
                    Feedback.submitted_at >= start_date
                )
            )
        )
        feedback_list = result.scalars().all()

        total = len(feedback_list)

        # Calculate type-specific metrics
        avg_nps = None
        avg_satisfaction = None
        decision_breakdown = None

        if feedback_type == "day7":
            # Calculate average satisfaction
            satisfaction_scores = [
                f.responses.get("satisfaction", 0)
                for f in feedback_list
                if f.responses.get("satisfaction")
            ]
            if satisfaction_scores:
                avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores)

        elif feedback_type == "day30":
            # Calculate NPS
            nps_scores = [
                f.responses.get("nps", 0)
                for f in feedback_list
                if f.responses.get("nps") is not None
            ]
            if nps_scores:
                avg_nps = sum(nps_scores) / len(nps_scores)

            # Calculate decision breakdown
            decisions = [f.responses.get("decision") for f in feedback_list if f.responses.get("decision")]
            decision_breakdown = {
                "upgrade": decisions.count("upgrade"),
                "need_more_time": decisions.count("need_more_time"),
                "not_right_fit": decisions.count("not_right_fit"),
                "too_expensive": decisions.count("too_expensive")
            }

        return FeedbackStatsResponse(
            feedback_type=feedback_type,
            total_submissions=total,
            avg_nps=avg_nps,
            avg_satisfaction=avg_satisfaction,
            decision_breakdown=decision_breakdown
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching feedback stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch feedback stats: {str(e)}"
        )
