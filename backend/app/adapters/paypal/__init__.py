"""
PayPal Adapter - Payments and Transactions

OAuth Configuration:
- Developer Portal: https://developer.paypal.com/dashboard/applications
- Redirect URI: http://localhost:3001/oauth/callback/paypal
- Scopes: openid, email, https://uri.paypal.com/services/reporting/search/read
"""
import os
import httpx
import logging
import base64
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class PayPalAdapter:
    """
    PayPal adapter for payments and transaction history.
    Ubiquitous payment option for SMBs.
    """

    # Use sandbox for testing, live for production
    SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com"
    LIVE_BASE_URL = "https://api-m.paypal.com"

    SCOPES = [
        "openid",
        "email",
        "https://uri.paypal.com/services/reporting/search/read",
        "https://uri.paypal.com/services/payments/payment/authcapture"
    ]

    def __init__(self, access_token: str, refresh_token: str = None, sandbox: bool = True):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.sandbox = sandbox
        self.base_url = self.SANDBOX_BASE_URL if sandbox else self.LIVE_BASE_URL

    @classmethod
    def get_authorization_url(cls, state: str, redirect_uri: str, sandbox: bool = True) -> str:
        """Generate OAuth authorization URL"""
        client_id = os.getenv("PAYPAL_CLIENT_ID")
        base = "https://www.sandbox.paypal.com" if sandbox else "https://www.paypal.com"
        scopes = " ".join(cls.SCOPES)

        return (
            f"{base}/signin/authorize"
            f"?client_id={client_id}"
            f"&response_type=code"
            f"&scope={scopes}"
            f"&state={state}"
            f"&redirect_uri={redirect_uri}"
        )

    @classmethod
    async def exchange_code_for_tokens(cls, code: str, redirect_uri: str, sandbox: bool = True) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        client_id = os.getenv("PAYPAL_CLIENT_ID")
        client_secret = os.getenv("PAYPAL_CLIENT_SECRET")

        # PayPal requires Basic Auth with client credentials
        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

        base_url = cls.SANDBOX_BASE_URL if sandbox else cls.LIVE_BASE_URL

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_user_info(self) -> Dict[str, Any]:
        """Get user profile information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/identity/openidconnect/userinfo?schema=openid",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_transactions(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get transaction history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/transactions",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "fields": "all"
                }
            )
            response.raise_for_status()
            return response.json().get("transaction_details", [])

    async def get_balance(self) -> Dict[str, Any]:
        """Get account balance"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/balances",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get aggregated data for dashboard display"""
        try:
            user_info = await self.get_user_info()

            return {
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "verified": user_info.get("verified_account", False)
            }
        except Exception as e:
            logger.error(f"Error fetching PayPal dashboard data: {e}")
            raise
