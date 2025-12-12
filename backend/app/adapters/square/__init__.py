"""
Square Adapter - POS and Payments

OAuth Configuration:
- Developer Portal: https://developer.squareup.com/apps
- Redirect URI: http://localhost:3001/oauth/callback/square
- Scopes: MERCHANT_PROFILE_READ, PAYMENTS_READ, ORDERS_READ, ITEMS_READ, INVENTORY_READ
"""
import os
import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class SquareAdapter:
    """
    Square adapter for POS, payments, and inventory data.
    Essential for retail and restaurant SMBs.
    """

    OAUTH_BASE_URL = "https://connect.squareup.com/oauth2"
    API_BASE_URL = "https://connect.squareup.com/v2"

    # OAuth scopes for SMB dashboard
    SCOPES = [
        "MERCHANT_PROFILE_READ",
        "PAYMENTS_READ",
        "ORDERS_READ",
        "ITEMS_READ",
        "INVENTORY_READ",
        "CUSTOMERS_READ",
        "EMPLOYEES_READ"
    ]

    def __init__(self, access_token: str, refresh_token: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.client_id = os.getenv("SQUARE_CLIENT_ID")
        self.client_secret = os.getenv("SQUARE_CLIENT_SECRET")

    @classmethod
    def get_authorization_url(cls, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL"""
        client_id = os.getenv("SQUARE_CLIENT_ID")
        scopes = "+".join(cls.SCOPES)
        return (
            f"{cls.OAUTH_BASE_URL}/authorize"
            f"?client_id={client_id}"
            f"&scope={scopes}"
            f"&session=false"
            f"&state={state}"
            f"&redirect_uri={redirect_uri}"
        )

    @classmethod
    async def exchange_code_for_tokens(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{cls.OAUTH_BASE_URL}/token",
                json={
                    "client_id": os.getenv("SQUARE_CLIENT_ID"),
                    "client_secret": os.getenv("SQUARE_CLIENT_SECRET"),
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_merchant_profile(self) -> Dict[str, Any]:
        """Get merchant profile information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/merchants/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_payments(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent payments"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE_URL}/payments",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json().get("payments", [])

    async def get_orders(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent orders"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE_URL}/orders/search",
                headers={"Authorization": f"Bearer {self.access_token}"},
                json={"limit": limit}
            )
            response.raise_for_status()
            return response.json().get("orders", [])

    async def get_inventory(self) -> List[Dict[str, Any]]:
        """Get inventory counts"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE_URL}/inventory/counts/batch-retrieve",
                headers={"Authorization": f"Bearer {self.access_token}"},
                json={}
            )
            response.raise_for_status()
            return response.json().get("counts", [])

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get aggregated data for dashboard display"""
        try:
            profile = await self.get_merchant_profile()
            payments = await self.get_payments(limit=50)

            # Calculate metrics
            total_sales = sum(
                float(p.get("amount_money", {}).get("amount", 0)) / 100
                for p in payments
            )

            return {
                "merchant_name": profile.get("merchant", {}).get("business_name"),
                "total_payments": len(payments),
                "total_sales": total_sales,
                "currency": profile.get("merchant", {}).get("currency", "USD")
            }
        except Exception as e:
            logger.error(f"Error fetching Square dashboard data: {e}")
            raise
