"""
Mock OAuth Provider for Testing
Provides mock responses for all 10 OAuth integrations
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta


class MockOAuthProvider:
    """Mock OAuth provider for testing all integrations"""

    @staticmethod
    def mock_token_response(integration: str = "generic") -> Dict[str, Any]:
        """
        Generate mock OAuth token response

        Args:
            integration: Name of the integration (affects token structure)

        Returns:
            Mock token response data
        """
        base_response = {
            "access_token": f"mock_access_token_{integration}",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "read write"
        }

        # Add refresh token for integrations that support it
        if integration in ['quickbooks', 'google_workspace', 'salesforce',
                          'hubspot', 'microsoft', 'xero']:
            base_response["refresh_token"] = f"mock_refresh_token_{integration}"

        # Integration-specific additions
        if integration == 'quickbooks':
            base_response["x_refresh_token_expires_in"] = 8726400
            base_response["realmId"] = "1234567890"

        elif integration == 'salesforce':
            base_response["instance_url"] = "https://na1.salesforce.com"
            base_response["id"] = "https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001SwiUAAS"

        elif integration == 'shopify':
            base_response["scope"] = "read_products,read_orders,read_customers"

        elif integration == 'stripe':
            base_response["stripe_user_id"] = "acct_1234567890"
            base_response["stripe_publishable_key"] = "pk_test_1234567890"

        elif integration == 'slack':
            base_response["team"] = {
                "name": "Test Team",
                "id": "T1234567890"
            }
            base_response["authed_user"] = {
                "id": "U1234567890",
                "access_token": f"mock_user_token_{integration}"
            }

        elif integration == 'microsoft':
            base_response["expires_in"] = 3599
            base_response["ext_expires_in"] = 3599

        elif integration == 'xero':
            base_response["expires_in"] = 1800  # 30 minutes

        return base_response

    @staticmethod
    def mock_user_info(integration: str = "generic") -> Dict[str, Any]:
        """
        Generate mock user info response

        Args:
            integration: Name of the integration

        Returns:
            Mock user info data
        """
        base_info = {
            "id": f"user_{integration}_12345",
            "email": f"test@{integration}.com",
            "name": "Test User"
        }

        # Integration-specific user info
        if integration == 'quickbooks':
            base_info["givenName"] = "Test"
            base_info["familyName"] = "User"

        elif integration == 'google_workspace':
            base_info["picture"] = "https://example.com/picture.jpg"
            base_info["verified_email"] = True

        elif integration == 'salesforce':
            base_info["username"] = "testuser@salesforce.com"
            base_info["display_name"] = "Test User"

        elif integration == 'shopify':
            base_info["shop_owner"] = True
            base_info["shop_name"] = "Test Shop"

        elif integration == 'hubspot':
            base_info["hub_domain"] = "test.hubspot.com"
            base_info["user"] = "testuser@hubspot.com"

        elif integration == 'slack':
            base_info["team_id"] = "T1234567890"
            base_info["user_id"] = "U1234567890"

        elif integration == 'zendesk':
            base_info["role"] = "admin"
            base_info["locale"] = "en-US"

        elif integration == 'monday':
            base_info["account"] = {"id": 12345, "name": "Test Account"}

        elif integration == 'microsoft':
            base_info["userPrincipalName"] = "testuser@microsoft.com"
            base_info["displayName"] = "Test User"
            base_info["givenName"] = "Test"
            base_info["surname"] = "User"
            base_info["jobTitle"] = "Developer"

        elif integration == 'xero':
            # Xero returns tenants list
            return [
                {
                    "id": "tenant_12345",
                    "tenantId": "tenant_12345",
                    "tenantType": "ORGANISATION",
                    "tenantName": "Test Organization",
                    "createdDateUtc": datetime.now().isoformat()
                }
            ]

        return base_info

    @staticmethod
    def mock_error_response(error_type: str = "invalid_grant") -> Dict[str, Any]:
        """
        Generate mock error response

        Args:
            error_type: Type of OAuth error

        Returns:
            Mock error response
        """
        error_responses = {
            "invalid_grant": {
                "error": "invalid_grant",
                "error_description": "The provided authorization grant is invalid, expired, or revoked"
            },
            "invalid_client": {
                "error": "invalid_client",
                "error_description": "Client authentication failed"
            },
            "invalid_request": {
                "error": "invalid_request",
                "error_description": "The request is missing a required parameter"
            },
            "unauthorized_client": {
                "error": "unauthorized_client",
                "error_description": "The client is not authorized to use this authorization grant type"
            },
            "access_denied": {
                "error": "access_denied",
                "error_description": "The resource owner denied the request"
            }
        }

        return error_responses.get(error_type, error_responses["invalid_request"])

    @staticmethod
    def mock_refresh_response(integration: str = "generic") -> Dict[str, Any]:
        """
        Generate mock token refresh response

        Args:
            integration: Name of the integration

        Returns:
            Mock refresh token response
        """
        response = MockOAuthProvider.mock_token_response(integration)
        # Update access token to show it's refreshed
        response["access_token"] = f"mock_refreshed_access_token_{integration}"
        return response

    @staticmethod
    def all_integrations() -> List[str]:
        """
        Get list of all supported integrations

        Returns:
            List of integration names
        """
        return [
            "quickbooks",
            "salesforce",
            "shopify",
            "stripe",
            "google_workspace",
            "hubspot",
            "slack",
            "zendesk",
            "monday",
            "microsoft",
            "xero"
        ]

    @staticmethod
    def integration_requires_refresh(integration: str) -> bool:
        """
        Check if integration supports refresh tokens

        Args:
            integration: Name of the integration

        Returns:
            True if integration supports refresh tokens
        """
        return integration in [
            'quickbooks',
            'google_workspace',
            'salesforce',
            'hubspot',
            'microsoft',
            'xero'
        ]


class MockHTTPClient:
    """Mock HTTP client for testing OAuth flows"""

    def __init__(self, integration: str = "generic"):
        """
        Initialize mock HTTP client

        Args:
            integration: Name of the integration to mock
        """
        self.integration = integration
        self.provider = MockOAuthProvider()

    async def post(self, url: str, **kwargs) -> 'MockResponse':
        """
        Mock POST request

        Args:
            url: Request URL
            **kwargs: Request parameters

        Returns:
            Mock response
        """
        # Token exchange
        if 'token' in url or 'oauth' in url:
            data = kwargs.get('data', {})

            # Check for refresh token flow
            if data.get('grant_type') == 'refresh_token':
                return MockResponse(
                    200,
                    self.provider.mock_refresh_response(self.integration)
                )

            # Check for authorization code flow
            elif data.get('grant_type') == 'authorization_code':
                return MockResponse(
                    200,
                    self.provider.mock_token_response(self.integration)
                )

        # Default error response
        return MockResponse(
            400,
            self.provider.mock_error_response("invalid_request")
        )

    async def get(self, url: str, **kwargs) -> 'MockResponse':
        """
        Mock GET request

        Args:
            url: Request URL
            **kwargs: Request parameters

        Returns:
            Mock response
        """
        # User info endpoints
        if 'me' in url or 'userinfo' in url or 'connections' in url:
            return MockResponse(
                200,
                self.provider.mock_user_info(self.integration)
            )

        # Default success response
        return MockResponse(200, {"success": True})


class MockResponse:
    """Mock HTTP response"""

    def __init__(self, status_code: int, json_data: Dict[str, Any]):
        """
        Initialize mock response

        Args:
            status_code: HTTP status code
            json_data: Response JSON data
        """
        self.status_code = status_code
        self._json_data = json_data
        self.text = str(json_data)

    def json(self) -> Dict[str, Any]:
        """
        Get JSON response data

        Returns:
            Response data as dictionary
        """
        return self._json_data
