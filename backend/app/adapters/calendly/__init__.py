"""
Calendly Adapter - Scheduling

OAuth Configuration:
- Developer Portal: https://developer.calendly.com/
- Redirect URI: http://localhost:3001/oauth/callback/calendly
- Scopes: default (includes user info and scheduling)
"""
import os
import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class CalendlyAdapter:
    """
    Calendly adapter for appointment scheduling.
    Essential for service-based SMBs.
    """

    API_BASE_URL = "https://api.calendly.com"
    OAUTH_BASE_URL = "https://auth.calendly.com/oauth"

    def __init__(self, access_token: str, refresh_token: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token

    @classmethod
    def get_authorization_url(cls, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL"""
        client_id = os.getenv("CALENDLY_CLIENT_ID")

        return (
            f"{cls.OAUTH_BASE_URL}/authorize"
            f"?client_id={client_id}"
            f"&response_type=code"
            f"&state={state}"
            f"&redirect_uri={redirect_uri}"
        )

    @classmethod
    async def exchange_code_for_tokens(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{cls.OAUTH_BASE_URL}/token",
                data={
                    "client_id": os.getenv("CALENDLY_CLIENT_ID"),
                    "client_secret": os.getenv("CALENDLY_CLIENT_SECRET"),
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_current_user(self) -> Dict[str, Any]:
        """Get current authenticated user"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/users/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json().get("resource", {})

    async def get_event_types(self, user_uri: str) -> List[Dict[str, Any]]:
        """Get user's event types (meeting types)"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/event_types",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"user": user_uri}
            )
            response.raise_for_status()
            return response.json().get("collection", [])

    async def get_scheduled_events(self, user_uri: str, count: int = 50) -> List[Dict[str, Any]]:
        """Get scheduled events"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/scheduled_events",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={
                    "user": user_uri,
                    "count": count,
                    "status": "active"
                }
            )
            response.raise_for_status()
            return response.json().get("collection", [])

    async def get_organization(self, org_uri: str) -> Dict[str, Any]:
        """Get organization details"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                org_uri,
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json().get("resource", {})

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get aggregated data for dashboard display"""
        try:
            user = await self.get_current_user()
            user_uri = user.get("uri")

            event_types = await self.get_event_types(user_uri)
            scheduled = await self.get_scheduled_events(user_uri)

            return {
                "user_name": user.get("name"),
                "email": user.get("email"),
                "scheduling_url": user.get("scheduling_url"),
                "event_types_count": len(event_types),
                "upcoming_events": len(scheduled)
            }
        except Exception as e:
            logger.error(f"Error fetching Calendly dashboard data: {e}")
            raise
