"""
Gusto Adapter - Payroll and HR

OAuth Configuration:
- Developer Portal: https://dev.gusto.com/
- Redirect URI: http://localhost:3001/oauth/callback/gusto
- Scopes: public, payrolls:read, employees:read, companies:read
"""
import os
import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class GustoAdapter:
    """
    Gusto adapter for payroll and HR data.
    #1 payroll solution for SMBs.
    """

    # Use demo for testing, api for production
    DEMO_BASE_URL = "https://api.gusto-demo.com"
    PROD_BASE_URL = "https://api.gusto.com"
    OAUTH_BASE_URL = "https://api.gusto.com/oauth"

    SCOPES = [
        "public",
        "payrolls:read",
        "employees:read",
        "companies:read",
        "benefits:read",
        "time_off:read"
    ]

    def __init__(self, access_token: str, refresh_token: str = None, demo: bool = True):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.demo = demo
        self.base_url = self.DEMO_BASE_URL if demo else self.PROD_BASE_URL

    @classmethod
    def get_authorization_url(cls, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL"""
        client_id = os.getenv("GUSTO_CLIENT_ID")
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
                    "client_id": os.getenv("GUSTO_CLIENT_ID"),
                    "client_secret": os.getenv("GUSTO_CLIENT_SECRET"),
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
                f"{self.base_url}/v1/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_companies(self) -> List[Dict[str, Any]]:
        """Get companies the user has access to"""
        user = await self.get_current_user()
        return user.get("roles", {}).get("payroll_admin", {}).get("companies", [])

    async def get_company(self, company_id: str) -> Dict[str, Any]:
        """Get company details"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/companies/{company_id}",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_employees(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all employees for a company"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/companies/{company_id}/employees",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_payrolls(self, company_id: str) -> List[Dict[str, Any]]:
        """Get payroll history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/companies/{company_id}/payrolls",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            return response.json()

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get aggregated data for dashboard display"""
        try:
            companies = await self.get_companies()

            if not companies:
                return {"error": "No companies found"}

            # Get first company's data
            company_id = companies[0].get("uuid")
            company = await self.get_company(company_id)
            employees = await self.get_employees(company_id)

            return {
                "company_name": company.get("name"),
                "employee_count": len(employees),
                "active_employees": len([e for e in employees if e.get("terminated") is False])
            }
        except Exception as e:
            logger.error(f"Error fetching Gusto dashboard data: {e}")
            raise
