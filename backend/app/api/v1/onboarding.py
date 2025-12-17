"""
Onboarding API Endpoints

Provides endpoints for managing user onboarding flow and trial tier determination.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.services.settings_service import settings_service
from app.api.v1.stats import get_privy_user_count

logger = logging.getLogger(__name__)

router = APIRouter()

# Trial tier configuration
FIRST_TIER_LIMIT = 100  # First 100 users get 30-day trial
FIRST_TIER_DAYS = 30
SECOND_TIER_DAYS = 14

# Industry to integration mapping for recommendations
INDUSTRY_INTEGRATIONS = {
    "Technology / Software": ["google", "slack", "github", "jira"],
    "Finance / Accounting": ["quickbooks", "xero", "stripe", "freshbooks"],
    "Healthcare / Medical": ["google", "slack", "zoom", "dropbox"],
    "Retail / E-commerce": ["shopify", "stripe", "quickbooks", "square"],
    "Professional Services": ["google", "slack", "salesforce", "hubspot"],
    "Manufacturing": ["quickbooks", "slack", "monday", "google"],
    "Construction": ["quickbooks", "google", "slack", "dropbox"],
    "Real Estate": ["salesforce", "google", "docusign", "slack"],
    "Food & Hospitality": ["square", "quickbooks", "slack", "google"],
    "Transportation / Logistics": ["quickbooks", "slack", "google", "zoom"],
    "Non-profit": ["quickbooks", "google", "slack", "mailchimp"],
    "Other": ["quickbooks", "google", "slack", "hubspot"],
}

# Default integrations if industry not specified
DEFAULT_INTEGRATIONS = ["quickbooks", "google", "slack", "hubspot"]


class OnboardingStatusResponse(BaseModel):
    """Response for onboarding status"""
    onboarding_completed: bool
    current_step: Optional[str] = None
    trial_tier: Optional[str] = None
    trial_days: int
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    integrations_connected: int = 0
    recommended_integrations: List[str]
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None


class OnboardingCompleteRequest(BaseModel):
    """Request to complete onboarding"""
    pass  # No additional fields needed, wallet_address comes from query param


class OnboardingCompleteResponse(BaseModel):
    """Response for completing onboarding"""
    success: bool
    trial_tier: str
    trial_start_date: datetime
    trial_end_date: datetime
    trial_days: int
    message: str


class TrialTierResponse(BaseModel):
    """Response for trial tier check"""
    trial_tier: str
    trial_days: int
    current_signup_count: int
    first_tier_limit: int
    is_first_tier: bool


class RecommendedIntegrationsResponse(BaseModel):
    """Response for recommended integrations"""
    recommended: List[str]
    industry: Optional[str] = None


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current onboarding status for a user.

    Returns:
        - Whether onboarding is completed
        - Current step if not completed
        - Trial tier information
        - Recommended integrations based on industry
        - Company profile data
    """
    try:
        # Get user settings
        settings = await settings_service.get_user_settings(db, wallet_address)

        # Determine trial tier if not set
        trial_tier = settings.trial_tier
        trial_days = FIRST_TIER_DAYS

        if not trial_tier:
            signup_count = await get_privy_user_count()
            if signup_count <= FIRST_TIER_LIMIT:
                trial_tier = "30_day"
                trial_days = FIRST_TIER_DAYS
            else:
                trial_tier = "14_day"
                trial_days = SECOND_TIER_DAYS
        else:
            trial_days = FIRST_TIER_DAYS if trial_tier == "30_day" else SECOND_TIER_DAYS

        # Get recommended integrations based on industry
        industry = settings.industry
        recommended = INDUSTRY_INTEGRATIONS.get(industry, DEFAULT_INTEGRATIONS)

        # Count connected integrations (would need to query oauth_tokens)
        # For now, return 0 - this can be enhanced later
        integrations_connected = 0

        return OnboardingStatusResponse(
            onboarding_completed=settings.onboarding_completed or False,
            current_step=settings.onboarding_step,
            trial_tier=trial_tier,
            trial_days=trial_days,
            trial_start_date=settings.trial_start_date,
            trial_end_date=settings.trial_end_date,
            integrations_connected=integrations_connected,
            recommended_integrations=recommended,
            company_name=settings.company_name,
            industry=settings.industry,
            company_size=settings.company_size,
        )

    except Exception as e:
        logger.error(f"Error fetching onboarding status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch onboarding status: {str(e)}"
        )


@router.post("/onboarding/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark onboarding as complete and start the trial period.

    This endpoint:
    1. Determines the trial tier based on signup count
    2. Sets trial start and end dates
    3. Marks onboarding as completed

    Returns:
        - Trial tier (30_day or 14_day)
        - Trial start and end dates
        - Success message
    """
    try:
        # Get current signup count to determine trial tier
        signup_count = await get_privy_user_count()

        if signup_count <= FIRST_TIER_LIMIT:
            trial_tier = "30_day"
            trial_days = FIRST_TIER_DAYS
        else:
            trial_tier = "14_day"
            trial_days = SECOND_TIER_DAYS

        # Calculate trial dates
        trial_start = datetime.utcnow()
        trial_end = trial_start + timedelta(days=trial_days)

        # Update user settings
        update_data = {
            "onboarding_completed": True,
            "onboarding_completed_at": trial_start,
            "onboarding_step": "complete",
            "trial_tier": trial_tier,
            "trial_start_date": trial_start,
            "trial_end_date": trial_end,
        }

        await settings_service.update_user_settings(db, wallet_address, update_data)

        logger.info(f"Onboarding completed for {wallet_address} with {trial_tier} trial")

        return OnboardingCompleteResponse(
            success=True,
            trial_tier=trial_tier,
            trial_start_date=trial_start,
            trial_end_date=trial_end,
            trial_days=trial_days,
            message=f"Welcome! Your {trial_days}-day free trial has started."
        )

    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete onboarding: {str(e)}"
        )


@router.get("/onboarding/trial-tier", response_model=TrialTierResponse)
async def get_trial_tier():
    """
    Get the current trial tier for new signups.

    This is a PUBLIC endpoint used to show users what trial they'll get
    before they sign up.

    Returns:
        - Current trial tier for new signups
        - Number of days in trial
        - Current signup count
        - First tier limit
    """
    try:
        signup_count = await get_privy_user_count()

        is_first_tier = signup_count <= FIRST_TIER_LIMIT

        return TrialTierResponse(
            trial_tier="30_day" if is_first_tier else "14_day",
            trial_days=FIRST_TIER_DAYS if is_first_tier else SECOND_TIER_DAYS,
            current_signup_count=signup_count,
            first_tier_limit=FIRST_TIER_LIMIT,
            is_first_tier=is_first_tier,
        )

    except Exception as e:
        logger.error(f"Error fetching trial tier: {str(e)}")
        # Return default values on error
        return TrialTierResponse(
            trial_tier="30_day",
            trial_days=FIRST_TIER_DAYS,
            current_signup_count=0,
            first_tier_limit=FIRST_TIER_LIMIT,
            is_first_tier=True,
        )


@router.get("/onboarding/recommended-integrations", response_model=RecommendedIntegrationsResponse)
async def get_recommended_integrations(
    industry: Optional[str] = Query(None, description="User's industry"),
    wallet_address: Optional[str] = Query(None, description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recommended integrations based on industry.

    If wallet_address is provided, uses the user's saved industry.
    Otherwise, uses the industry query parameter.

    Returns:
        - List of recommended integration slugs
        - Industry used for recommendation
    """
    try:
        effective_industry = industry

        # If wallet address provided, try to get industry from settings
        if wallet_address and not industry:
            settings = await settings_service.get_user_settings(db, wallet_address)
            effective_industry = settings.industry

        # Get recommendations
        recommended = INDUSTRY_INTEGRATIONS.get(effective_industry, DEFAULT_INTEGRATIONS)

        return RecommendedIntegrationsResponse(
            recommended=recommended,
            industry=effective_industry,
        )

    except Exception as e:
        logger.error(f"Error fetching recommended integrations: {str(e)}")
        return RecommendedIntegrationsResponse(
            recommended=DEFAULT_INTEGRATIONS,
            industry=None,
        )


@router.put("/onboarding/step")
async def update_onboarding_step(
    wallet_address: str = Query(..., description="User's wallet address"),
    step: str = Query(..., description="Current onboarding step"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the current onboarding step for a user.

    This allows tracking where a user is in the onboarding flow
    if they leave mid-process and return later.

    Valid steps: welcome, company_profile, integration_select, oauth, syncing, complete
    """
    try:
        valid_steps = ["welcome", "company_profile", "integration_select", "oauth", "syncing", "complete"]

        if step not in valid_steps:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid step. Must be one of: {', '.join(valid_steps)}"
            )

        update_data = {"onboarding_step": step}

        # If step is complete, also mark onboarding as completed
        if step == "complete":
            update_data["onboarding_completed"] = True
            update_data["onboarding_completed_at"] = datetime.utcnow()

        await settings_service.update_user_settings(db, wallet_address, update_data)

        return {
            "success": True,
            "step": step,
            "message": f"Onboarding step updated to '{step}'"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating onboarding step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update onboarding step: {str(e)}"
        )
