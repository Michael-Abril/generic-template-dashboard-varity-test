"""
Stats API - Public statistics endpoints for the Varity dashboard.

This module provides endpoints for:
- Signup progress tracking (beta program spots) via Privy Management API
- Platform statistics
- Google test user automation (first 100 users for pre-verification)

NOTE: All user tracking is handled by Privy.
This module fetches user count from Privy for the progress bar.
"""

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from datetime import datetime
from typing import List, Optional
import logging
import httpx
import base64

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Beta program configuration
BETA_TOTAL_SPOTS = 100

# Google test user automation - first 100 users get added as test users
# while waiting for Google app verification (2-6 weeks)
GOOGLE_TEST_USER_LIMIT = 100


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


# =============================================================================
# GOOGLE TEST USER AUTOMATION
# =============================================================================
# Google requires app verification for production OAuth access.
# During the 2-6 week verification period, only "test users" can access the app.
# Google allows up to 100 test users.
#
# This system automatically tracks the first 100 signups and provides their
# emails in a format ready to paste into Google Cloud Console.
# =============================================================================


async def get_privy_users_with_emails(limit: int = GOOGLE_TEST_USER_LIMIT) -> List[dict]:
    """
    Fetch users from Privy Management API with their email addresses.

    Privy stores user emails when they sign up with email/Google.
    This function retrieves the emails needed for Google test user registration.

    Returns:
        List of dicts with user info: [{"email": "...", "created_at": "...", "id": "..."}]
    """
    try:
        if not settings.privy_app_id or not settings.privy_app_secret:
            logger.warning("Privy credentials not configured")
            return []

        # Create Basic auth header
        credentials = f"{settings.privy_app_id}:{settings.privy_app_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "privy-app-id": settings.privy_app_id,
            "Content-Type": "application/json"
        }

        users = []
        next_cursor = None

        async with httpx.AsyncClient() as client:
            # Fetch users with pagination until we have enough
            while len(users) < limit:
                url = "https://auth.privy.io/api/v1/users"
                if next_cursor:
                    url += f"?cursor={next_cursor}"

                response = await client.get(url, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    logger.error(f"Privy API error: {response.status_code}")
                    break

                data = response.json()
                page_users = data.get("data", [])

                # Extract email from each user
                for user in page_users:
                    if len(users) >= limit:
                        break

                    user_info = {
                        "id": user.get("id"),
                        "created_at": user.get("created_at"),
                        "email": None,
                        "wallet_address": None
                    }

                    # Privy stores linked accounts in different formats
                    # Check for email in linked_accounts
                    linked_accounts = user.get("linked_accounts", [])
                    for account in linked_accounts:
                        account_type = account.get("type")

                        # Email accounts
                        if account_type == "email":
                            user_info["email"] = account.get("address")

                        # Google accounts also have email
                        elif account_type == "google_oauth":
                            if not user_info["email"]:  # Don't overwrite if already set
                                user_info["email"] = account.get("email")

                        # Wallet addresses
                        elif account_type in ("wallet", "embedded_wallet"):
                            if not user_info["wallet_address"]:
                                user_info["wallet_address"] = account.get("address")

                    # Only include users with email addresses
                    if user_info["email"]:
                        users.append(user_info)

                # Check for more pages
                next_cursor = data.get("next_cursor")
                if not next_cursor:
                    break

        logger.info(f"Fetched {len(users)} users with emails from Privy")
        return users

    except Exception as e:
        logger.error(f"Error fetching Privy users: {e}")
        return []


@router.get("/admin/google-test-users")
async def get_google_test_users():
    """
    Get the first 100 user emails for Google test user registration.

    Google OAuth apps in "Testing" mode can only authenticate users who are
    added as "test users" in Google Cloud Console. This endpoint provides
    the email list needed for that registration.

    Returns:
        - emails: List of email addresses (first 100 signups)
        - count: Number of emails available
        - remaining_slots: How many more test user slots are available
        - csv: Comma-separated email list (for easy copy/paste)
        - instructions: How to add these in Google Cloud Console
    """
    try:
        users = await get_privy_users_with_emails(limit=GOOGLE_TEST_USER_LIMIT)

        emails = [u["email"] for u in users if u["email"]]
        count = len(emails)

        return {
            "emails": emails,
            "count": count,
            "total_slots": GOOGLE_TEST_USER_LIMIT,
            "remaining_slots": max(0, GOOGLE_TEST_USER_LIMIT - count),
            "csv": ",".join(emails),
            "lastUpdated": datetime.utcnow().isoformat(),
            "source": "privy",
            "instructions": {
                "step1": "Go to https://console.cloud.google.com/apis/credentials/consent",
                "step2": "Scroll down to 'Test users' section",
                "step3": "Click '+ ADD USERS'",
                "step4": "Copy the emails from the 'csv' field above",
                "step5": "Paste into the text box (comma-separated)",
                "step6": "Click 'SAVE' - users can now authenticate"
            }
        }

    except Exception as e:
        logger.error(f"Error fetching Google test users: {e}")
        return {
            "emails": [],
            "count": 0,
            "total_slots": GOOGLE_TEST_USER_LIMIT,
            "remaining_slots": GOOGLE_TEST_USER_LIMIT,
            "csv": "",
            "lastUpdated": datetime.utcnow().isoformat(),
            "source": "privy",
            "error": str(e)
        }


@router.get("/admin/google-test-users/csv", response_class=PlainTextResponse)
async def get_google_test_users_csv():
    """
    Get Google test user emails as plain text CSV.

    This endpoint returns just the comma-separated emails for easy
    copy/paste into Google Cloud Console.

    Usage:
        curl https://api.varity.so/api/v1/admin/google-test-users/csv
        # Returns: email1@example.com,email2@example.com,...
    """
    try:
        users = await get_privy_users_with_emails(limit=GOOGLE_TEST_USER_LIMIT)
        emails = [u["email"] for u in users if u["email"]]
        return ",".join(emails)
    except Exception as e:
        logger.error(f"Error fetching Google test users CSV: {e}")
        return ""


@router.get("/admin/google-test-users/newline", response_class=PlainTextResponse)
async def get_google_test_users_newline():
    """
    Get Google test user emails with one per line.

    Useful for some interfaces that expect newline-separated values.

    Usage:
        curl https://api.varity.so/api/v1/admin/google-test-users/newline
    """
    try:
        users = await get_privy_users_with_emails(limit=GOOGLE_TEST_USER_LIMIT)
        emails = [u["email"] for u in users if u["email"]]
        return "\n".join(emails)
    except Exception as e:
        logger.error(f"Error fetching Google test users: {e}")
        return ""
