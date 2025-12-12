"""
Stats API - Public statistics endpoints for the Varity dashboard.

This module provides endpoints for:
- Signup progress tracking (beta program spots) via Privy Management API
- Platform statistics

NOTE: All user tracking is handled by Privy.
This module fetches user count from Privy for the progress bar.
"""

from fastapi import APIRouter
from datetime import datetime
import logging
import httpx
import base64

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Beta program configuration
BETA_TOTAL_SPOTS = 100


async def get_privy_user_count() -> int:
    """
    Get the total user count from Privy Management API.

    Privy tracks all authenticated users (email, Google, wallet).
    This is the single source of truth for signup count.

    API Docs: https://docs.privy.io/reference/api/get-users
    """
    try:
        # Privy Management API requires Basic auth with app_id:app_secret
        if not settings.privy_app_id or not settings.privy_app_secret:
            logger.warning("Privy credentials not configured, returning 0")
            return 0

        # Create Basic auth header
        credentials = f"{settings.privy_app_id}:{settings.privy_app_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "privy-app-id": settings.privy_app_id,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            # Get users with limit=1 to get total count from response
            response = await client.get(
                "https://auth.privy.io/api/v1/users",
                headers=headers,
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                # Privy returns { "data": [...], "next_cursor": "..." }
                # The total count can be approximated by fetching all or using pagination
                # For simplicity, we'll count the returned users
                users = data.get("data", [])

                # If there's pagination, we need to count all pages
                # For beta (100 users max), this should be fine
                total_count = len(users)

                # Check if there are more pages
                next_cursor = data.get("next_cursor")
                while next_cursor:
                    response = await client.get(
                        f"https://auth.privy.io/api/v1/users?cursor={next_cursor}",
                        headers=headers,
                        timeout=10.0
                    )
                    if response.status_code == 200:
                        page_data = response.json()
                        total_count += len(page_data.get("data", []))
                        next_cursor = page_data.get("next_cursor")
                    else:
                        break

                logger.info(f"Privy user count: {total_count}")
                return total_count
            else:
                logger.error(f"Privy API error: {response.status_code} - {response.text}")
                return 0

    except Exception as e:
        logger.error(f"Error fetching Privy user count: {e}")
        return 0


@router.get("/stats/signups")
async def get_signup_stats():
    """
    Get current signup statistics for the beta program.
    Data is fetched from Privy Management API.

    Returns:
        - count: Number of users signed up (from Privy)
        - total: Total spots available (100 for beta)
        - lastUpdated: ISO timestamp
        - percentage: Percentage of spots claimed
        - spotsRemaining: Number of spots still available

    This endpoint is PUBLIC and used by the landing page progress bar.
    """
    try:
        count = await get_privy_user_count()
        total = BETA_TOTAL_SPOTS

        return {
            "count": count,
            "total": total,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": min(100, round((count / total) * 100, 1)) if total > 0 else 0,
            "spotsRemaining": max(0, total - count),
            "source": "privy"  # Indicates data source
        }

    except Exception as e:
        logger.error(f"Error fetching signup stats: {e}")
        # Return default values on error (graceful degradation)
        return {
            "count": 0,
            "total": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": 0,
            "spotsRemaining": BETA_TOTAL_SPOTS,
            "source": "privy",
            "error": "Unable to fetch current count"
        }


@router.get("/stats/platform")
async def get_platform_stats():
    """
    Get overall platform statistics.

    Returns aggregated statistics about the platform usage.
    This endpoint is PUBLIC for marketing purposes.
    """
    try:
        signup_count = await get_privy_user_count()

        return {
            "totalUsers": signup_count,
            "totalIntegrations": 0,  # Placeholder - will be implemented
            "totalAIQueries": 0,  # Placeholder - will be implemented
            "betaSpotsRemaining": max(0, BETA_TOTAL_SPOTS - signup_count),
            "lastUpdated": datetime.utcnow().isoformat(),
            "source": "privy"
        }

    except Exception as e:
        logger.error(f"Error fetching platform stats: {e}")
        return {
            "totalUsers": 0,
            "totalIntegrations": 0,
            "totalAIQueries": 0,
            "betaSpotsRemaining": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat(),
            "source": "privy"
        }
