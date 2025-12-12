"""
Stats API - Public statistics endpoints for the Varity dashboard.

This module provides endpoints for:
- Signup progress tracking (beta program spots)
- Platform statistics

These endpoints are PUBLIC (no authentication required) to allow
display on marketing pages and landing pages.
"""

from fastapi import APIRouter
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()

# Beta program configuration
BETA_TOTAL_SPOTS = 100

# Counter file path for persistence (works even without Redis/DB)
COUNTER_FILE = os.path.join(os.path.dirname(__file__), ".signup_counter")


def get_signup_count() -> int:
    """
    Get the current signup count.
    Uses a simple file-based counter for persistence.
    This can be upgraded to Redis/DB later for scaling.
    """
    try:
        if os.path.exists(COUNTER_FILE):
            with open(COUNTER_FILE, "r") as f:
                return int(f.read().strip())
    except (ValueError, IOError) as e:
        logger.warning(f"Error reading signup counter: {e}")
    return 0


def increment_signup_count() -> int:
    """
    Increment the signup counter.
    Returns the new count.
    """
    try:
        count = get_signup_count() + 1
        with open(COUNTER_FILE, "w") as f:
            f.write(str(count))
        return count
    except IOError as e:
        logger.error(f"Error incrementing signup counter: {e}")
        return 0


@router.get("/stats/signups")
async def get_signup_stats():
    """
    Get current signup statistics for the beta program.

    Returns:
        - count: Number of users signed up
        - total: Total spots available (100 for beta)
        - lastUpdated: ISO timestamp of when this was calculated
        - percentage: Percentage of spots claimed
        - spotsRemaining: Number of spots still available

    This endpoint is PUBLIC and used by the landing page progress bar.
    """
    try:
        count = get_signup_count()
        total = BETA_TOTAL_SPOTS

        return {
            "count": count,
            "total": total,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": min(100, round((count / total) * 100, 1)) if total > 0 else 0,
            "spotsRemaining": max(0, total - count)
        }

    except Exception as e:
        logger.error(f"Error fetching signup stats: {e}")
        # Return default values on error (graceful degradation)
        return {
            "count": 0,
            "total": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": 0,
            "spotsRemaining": BETA_TOTAL_SPOTS
        }


@router.post("/stats/signups/increment")
async def increment_signup():
    """
    Increment the signup counter.
    Called when a new user completes signup.

    This endpoint should be called from the OAuth callback or user registration flow.
    In production, this should be protected to prevent abuse.
    """
    try:
        new_count = increment_signup_count()
        total = BETA_TOTAL_SPOTS

        logger.info(f"Signup counter incremented to {new_count}")

        return {
            "success": True,
            "count": new_count,
            "total": total,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": min(100, round((new_count / total) * 100, 1)) if total > 0 else 0,
            "spotsRemaining": max(0, total - new_count)
        }

    except Exception as e:
        logger.error(f"Error incrementing signup counter: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/stats/platform")
async def get_platform_stats():
    """
    Get overall platform statistics.

    Returns aggregated statistics about the platform usage.
    This endpoint is PUBLIC for marketing purposes.
    """
    try:
        signup_count = get_signup_count()

        return {
            "totalUsers": signup_count,
            "totalIntegrations": 0,  # Placeholder - will be implemented
            "totalAIQueries": 0,  # Placeholder - will be implemented
            "betaSpotsRemaining": max(0, BETA_TOTAL_SPOTS - signup_count),
            "lastUpdated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching platform stats: {e}")
        return {
            "totalUsers": 0,
            "totalIntegrations": 0,
            "totalAIQueries": 0,
            "betaSpotsRemaining": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat()
        }
