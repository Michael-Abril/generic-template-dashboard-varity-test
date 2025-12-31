"""
Canva Adapter - Design Tools

OAuth Configuration:
- Developer Portal: https://www.canva.com/developers/
- Redirect URI: http://localhost:3001/oauth/callback/canva
- Scopes: design:content:read, asset:read, brandtemplate:content:read
"""
import os
import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class CanvaAdapter:
    """
    Canva adapter for design assets and templates.
    Used by virtually every SMB for marketing materials.
    """

    API_BASE_URL = "https://api.canva.com/rest/v1"
    OAUTH_BASE_URL = "https://www.canva.com/api/oauth"

    SCOPES = [
        "design:content:read",
        "asset:read",
        "brandtemplate:content:read",
        "folder:read"
    ]

    def __init__(self, access_token: str, refresh_token: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token

    @classmethod
    def get_authorization_url(cls, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL"""
        client_id = os.getenv("CANVA_CLIENT_ID")
        scopes = " ".join(cls.SCOPES)

        return (
            f"{cls.OAUTH_BASE_URL}/authorize"
            f"?client_id={client_id}"
            f"&response_type=code"
            f"&scope={scopes}"
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
                    "client_id": os.getenv("CANVA_CLIENT_ID"),
                    "client_secret": os.getenv("CANVA_CLIENT_SECRET"),
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self) -> Dict[str, Any]:
        """Get current user profile"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/users/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_designs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's designs"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/designs",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json().get("items", [])

    async def get_brand_templates(self) -> List[Dict[str, Any]]:
        """Get brand templates"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/brand-templates",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json().get("items", [])

    async def get_folders(self) -> List[Dict[str, Any]]:
        """Get user's folders"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/folders",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json().get("items", [])

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get aggregated data for dashboard display"""
        try:
            profile = await self.get_user_profile()
            designs = await self.get_designs(limit=100)

            return {
                "user_name": profile.get("display_name"),
                "email": profile.get("email"),
                "total_designs": len(designs),
                "recent_designs": designs[:5] if designs else []
            }
        except Exception as e:
            logger.error(f"Error fetching Canva dashboard data: {e}")
            raise
