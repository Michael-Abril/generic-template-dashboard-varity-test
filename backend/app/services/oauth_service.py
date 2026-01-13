"""
OAuth Integration Service for Varity Dashboard
Handles OAuth 2.0 flows for all software integrations
Enhanced with per-customer encryption using wallet-derived keys
"""
import os
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.oauth2.rfc6749 import OAuth2Token
import base64
import hashlib

# Import the new wallet-based encryption service
from .encryption_service import (
    encrypt_oauth_for_customer,
    decrypt_oauth_for_customer,
    encrypt_field,
    decrypt_field
)

logger = logging.getLogger(__name__)


class OAuthIntegrationService:
    """
    Centralized OAuth 2.0 service for all integrations
    Handles authentication flows, token management, and secure storage
    """

    def __init__(self):
        """Initialize OAuth service with per-customer encryption and client configurations"""
        # No longer using single Fernet key - each customer has their own key
        # derived from their wallet address

        # OAuth configurations for each integration
        self.oauth_configs = {
            'quickbooks': {
                'client_id': os.getenv('QUICKBOOKS_CLIENT_ID', ''),
                'client_secret': os.getenv('QUICKBOOKS_CLIENT_SECRET', ''),
                'authorize_url': 'https://appcenter.intuit.com/connect/oauth2',
                'token_url': 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
                'revoke_url': 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
                'scope': 'com.intuit.quickbooks.accounting',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'stripe': {
                'client_id': os.getenv('STRIPE_CLIENT_ID', ''),
                'client_secret': os.getenv('STRIPE_CLIENT_SECRET', ''),
                'authorize_url': 'https://connect.stripe.com/oauth/authorize',
                'token_url': 'https://connect.stripe.com/oauth/token',
                'scope': 'read_write',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'google_workspace': {
                'client_id': os.getenv('GOOGLE_CLIENT_ID', ''),
                'client_secret': os.getenv('GOOGLE_CLIENT_SECRET', ''),
                'authorize_url': 'https://accounts.google.com/o/oauth2/v2/auth',
                'token_url': 'https://oauth2.googleapis.com/token',
                'scope': 'https://www.googleapis.com/auth/gmail.readonly '
                        'https://www.googleapis.com/auth/calendar.readonly '
                        'https://www.googleapis.com/auth/drive.readonly',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'salesforce': {
                'client_id': os.getenv('SALESFORCE_CLIENT_ID', ''),
                'client_secret': os.getenv('SALESFORCE_CLIENT_SECRET', ''),
                'authorize_url': 'https://login.salesforce.com/services/oauth2/authorize',
                'token_url': 'https://login.salesforce.com/services/oauth2/token',
                'scope': 'api refresh_token',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'shopify': {
                'client_id': os.getenv('SHOPIFY_CLIENT_ID', ''),
                'client_secret': os.getenv('SHOPIFY_CLIENT_SECRET', ''),
                'authorize_url': 'https://{shop}.myshopify.com/admin/oauth/authorize',
                'token_url': 'https://{shop}.myshopify.com/admin/oauth/access_token',
                'scope': 'read_products,read_orders,read_customers',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'hubspot': {
                'client_id': os.getenv('HUBSPOT_CLIENT_ID', ''),
                'client_secret': os.getenv('HUBSPOT_CLIENT_SECRET', ''),
                'authorize_url': 'https://app.hubspot.com/oauth/authorize',
                'token_url': 'https://api.hubapi.com/oauth/v1/token',
                'scope': 'contacts crm.objects.contacts.read',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'slack': {
                'client_id': os.getenv('SLACK_CLIENT_ID', ''),
                'client_secret': os.getenv('SLACK_CLIENT_SECRET', ''),
                'authorize_url': 'https://slack.com/oauth/v2/authorize',
                'token_url': 'https://slack.com/api/oauth.v2.access',
                'scope': 'channels:read,channels:history,groups:read,groups:history,files:read,chat:write,users:read',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'zendesk': {
                'client_id': os.getenv('ZENDESK_CLIENT_ID', ''),
                'client_secret': os.getenv('ZENDESK_CLIENT_SECRET', ''),
                'authorize_url': 'https://{subdomain}.zendesk.com/oauth/authorizations/new',
                'token_url': 'https://{subdomain}.zendesk.com/oauth/tokens',
                'scope': 'read write',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'monday': {
                'client_id': os.getenv('MONDAY_CLIENT_ID', ''),
                'client_secret': os.getenv('MONDAY_CLIENT_SECRET', ''),
                'authorize_url': 'https://auth.monday.com/oauth2/authorize',
                'token_url': 'https://auth.monday.com/oauth2/token',
                'scope': 'boards:read boards:write',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback')
            },
            'microsoft': {
                'client_id': os.getenv('MICROSOFT_CLIENT_ID', ''),
                'client_secret': os.getenv('MICROSOFT_CLIENT_SECRET', ''),
                'authorize_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                'scope': 'User.Read Mail.Read Calendars.Read Files.Read offline_access',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback'),
                'user_info_url': 'https://graph.microsoft.com/v1.0/me'
            },
            'xero': {
                'client_id': os.getenv('XERO_CLIENT_ID', ''),
                'client_secret': os.getenv('XERO_CLIENT_SECRET', ''),
                'authorize_url': 'https://login.xero.com/identity/connect/authorize',
                'token_url': 'https://identity.xero.com/connect/token',
                'scope': 'accounting.transactions accounting.contacts accounting.settings offline_access',
                'redirect_uri': os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/oauth/callback'),
                'tenants_url': 'https://api.xero.com/connections'
            }
        }

        # Storage for OAuth tokens (in production, use database)
        self.token_storage = {}

        logger.info("OAuth Integration Service initialized")

    # Removed _get_or_create_encryption_key method
    # Each customer now has their own encryption key derived from their wallet address
    # This ensures complete isolation - Business A cannot decrypt Business B's tokens

    def get_authorization_url(
        self,
        integration: str,
        state: str,
        additional_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate OAuth authorization URL for user to grant access

        Args:
            integration: Name of the integration
            state: State parameter for CSRF protection
            additional_params: Additional OAuth parameters

        Returns:
            Authorization URL
        """
        if integration not in self.oauth_configs:
            raise ValueError(f"Integration {integration} not supported")

        config = self.oauth_configs[integration]

        # Handle special cases
        if integration == 'shopify' and additional_params and 'shop' in additional_params:
            config['authorize_url'] = config['authorize_url'].format(shop=additional_params['shop'])
        elif integration == 'zendesk' and additional_params and 'subdomain' in additional_params:
            config['authorize_url'] = config['authorize_url'].format(subdomain=additional_params['subdomain'])

        client = AsyncOAuth2Client(
            client_id=config['client_id'],
            redirect_uri=config['redirect_uri'],
            scope=config['scope']
        )

        auth_url, _ = client.create_authorization_url(
            config['authorize_url'],
            state=state
        )

        # Add additional parameters if provided
        if additional_params:
            separator = '&' if '?' in auth_url else '?'
            params = '&'.join([f"{k}={v}" for k, v in additional_params.items()])
            auth_url = f"{auth_url}{separator}{params}"

        logger.info(f"Generated authorization URL for {integration}")
        return auth_url

    async def exchange_code_for_token(
        self,
        integration: str,
        code: str,
        state: str,
        additional_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token

        Args:
            integration: Name of the integration
            code: Authorization code from OAuth callback
            state: State parameter for validation
            additional_params: Additional parameters (e.g., shop domain)

        Returns:
            Token data including access_token and refresh_token
        """
        if integration not in self.oauth_configs:
            raise ValueError(f"Integration {integration} not supported")

        config = self.oauth_configs[integration]

        # Handle special cases
        token_url = config['token_url']
        if integration == 'shopify' and additional_params and 'shop' in additional_params:
            token_url = token_url.format(shop=additional_params['shop'])
        elif integration == 'zendesk' and additional_params and 'subdomain' in additional_params:
            token_url = token_url.format(subdomain=additional_params['subdomain'])

        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': config['redirect_uri'],
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret']
                }
            )

            if response.status_code != 200:
                logger.error(f"Failed to exchange code for token: {response.text}")
                raise Exception(f"OAuth token exchange failed: {response.text}")

            token_data = response.json()

            # Add metadata
            token_data['integration'] = integration
            token_data['created_at'] = datetime.now().isoformat()
            token_data['expires_at'] = (
                datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            ).isoformat()

            logger.info(f"Successfully exchanged code for token for {integration}")
            return token_data

    async def refresh_token(
        self,
        integration: str,
        refresh_token: str
    ) -> Dict[str, Any]:
        """
        Refresh OAuth access token

        Args:
            integration: Name of the integration
            refresh_token: Refresh token

        Returns:
            New token data
        """
        if integration not in self.oauth_configs:
            raise ValueError(f"Integration {integration} not supported")

        config = self.oauth_configs[integration]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                config['token_url'],
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret']
                }
            )

            if response.status_code != 200:
                logger.error(f"Failed to refresh token: {response.text}")
                raise Exception(f"OAuth token refresh failed: {response.text}")

            token_data = response.json()

            # Add metadata
            token_data['integration'] = integration
            token_data['created_at'] = datetime.now().isoformat()
            token_data['expires_at'] = (
                datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            ).isoformat()

            logger.info(f"Successfully refreshed token for {integration}")
            return token_data

    def encrypt_token(self, wallet_address: str, token_data: Dict[str, Any]) -> str:
        """
        Encrypt OAuth token for secure storage using customer's wallet-derived key

        Args:
            wallet_address: Customer's wallet address for key derivation
            token_data: Token data to encrypt

        Returns:
            Encrypted token string (contains nonce, tag, and ciphertext)
        """
        encrypted = encrypt_oauth_for_customer(wallet_address, token_data)
        # Combine nonce, tag, and encrypted data for storage
        return f"{encrypted['nonce']}:{encrypted['tag']}:{encrypted['encrypted_data']}"

    def decrypt_token(self, wallet_address: str, encrypted_token: str) -> Dict[str, Any]:
        """
        Decrypt OAuth token from storage using customer's wallet-derived key

        Args:
            wallet_address: Customer's wallet address for key derivation
            encrypted_token: Encrypted token string

        Returns:
            Decrypted token data
        """
        if not encrypted_token or encrypted_token.count(":") != 2:
            raise ValueError("Invalid encrypted token format")

        nonce, tag, encrypted_data = encrypted_token.split(":", 2)

        decrypted = decrypt_oauth_for_customer(
            wallet_address,
            {
                "encrypted_data": encrypted_data,
                "nonce": nonce,
                "tag": tag,
                "wallet_address": wallet_address.lower()
            }
        )
        return decrypted

    async def store_token(
        self,
        wallet_address: str,
        integration: str,
        token_data: Dict[str, Any]
    ) -> bool:
        """
        Store OAuth token securely

        Args:
            user_id: User identifier
            integration: Integration name
            token_data: Token data to store

        Returns:
            Success status
        """
        try:
            # Encrypt token
            encrypted_token = self.encrypt_token(token_data)

            # Store in memory (in production, use database)
            storage_key = f"{user_id}:{integration}"
            self.token_storage[storage_key] = {
                'encrypted_token': encrypted_token,
                'created_at': datetime.now().isoformat(),
                'integration': integration
            }

            logger.info(f"Stored token for user {user_id} integration {integration}")
            return True

        except Exception as e:
            logger.error(f"Failed to store token: {str(e)}")
            return False

    async def get_token(
        self,
        user_id: str,
        integration: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve OAuth token for user

        Args:
            user_id: User identifier
            integration: Integration name

        Returns:
            Token data if exists
        """
        storage_key = f"{user_id}:{integration}"

        if storage_key not in self.token_storage:
            return None

        try:
            encrypted_token = self.token_storage[storage_key]['encrypted_token']
            token_data = self.decrypt_token(encrypted_token)

            # Check if token is expired
            expires_at = datetime.fromisoformat(token_data.get('expires_at'))
            if expires_at < datetime.now():
                # Try to refresh if refresh token exists
                if 'refresh_token' in token_data:
                    new_token = await self.refresh_token(
                        integration,
                        token_data['refresh_token']
                    )
                    await self.store_token(user_id, integration, new_token)
                    return new_token
                else:
                    logger.warning(f"Token expired for {user_id}:{integration}")
                    return None

            return token_data

        except Exception as e:
            logger.error(f"Failed to retrieve token: {str(e)}")
            return None

    async def revoke_token(
        self,
        user_id: str,
        integration: str
    ) -> bool:
        """
        Revoke OAuth token and remove from storage

        Args:
            user_id: User identifier
            integration: Integration name

        Returns:
            Success status
        """
        storage_key = f"{user_id}:{integration}"

        if storage_key not in self.token_storage:
            return True

        try:
            # Get token data
            encrypted_token = self.token_storage[storage_key]['encrypted_token']
            token_data = self.decrypt_token(encrypted_token)

            # Revoke token with provider if they support it
            if integration == 'quickbooks' and self.oauth_configs[integration]['revoke_url']:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        self.oauth_configs[integration]['revoke_url'],
                        data={'token': token_data['access_token']},
                        auth=(
                            self.oauth_configs[integration]['client_id'],
                            self.oauth_configs[integration]['client_secret']
                        )
                    )

            # Remove from storage
            del self.token_storage[storage_key]

            logger.info(f"Revoked token for {user_id}:{integration}")
            return True

        except Exception as e:
            logger.error(f"Failed to revoke token: {str(e)}")
            return False

    async def get_user_integrations(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get list of active integrations for user

        Args:
            user_id: User identifier

        Returns:
            List of integration details
        """
        integrations = []

        for key in self.token_storage:
            if key.startswith(f"{user_id}:"):
                integration_name = key.split(':')[1]
                try:
                    encrypted_token = self.token_storage[key]['encrypted_token']
                    token_data = self.decrypt_token(encrypted_token)

                    # Check if token is valid
                    expires_at = datetime.fromisoformat(token_data.get('expires_at'))
                    is_valid = expires_at > datetime.now()

                    integrations.append({
                        'name': integration_name,
                        'connected': True,
                        'valid': is_valid,
                        'expires_at': token_data.get('expires_at'),
                        'scopes': self.oauth_configs[integration_name].get('scope', '').split()
                    })

                except Exception as e:
                    logger.error(f"Error checking integration {key}: {str(e)}")

        return integrations

    async def test_connection(
        self,
        user_id: str,
        integration: str
    ) -> Dict[str, Any]:
        """
        Test OAuth connection by making a simple API call

        Args:
            user_id: User identifier
            integration: Integration name

        Returns:
            Test result with status and details
        """
        token_data = await self.get_token(user_id, integration)

        if not token_data:
            return {
                'success': False,
                'error': 'No valid token found'
            }

        # Integration-specific test endpoints
        test_endpoints = {
            'quickbooks': 'https://api.intuit.com/v3/company/{company_id}/info/{company_id}',
            'stripe': 'https://api.stripe.com/v1/charges?limit=1',
            'google_workspace': 'https://www.googleapis.com/oauth2/v1/userinfo',
            'salesforce': '{instance_url}/services/data/v50.0/',
            'shopify': 'https://{shop}.myshopify.com/admin/api/2023-01/shop.json',
            'hubspot': 'https://api.hubapi.com/oauth/v1/access-tokens/{token}',
            'slack': 'https://slack.com/api/auth.test',
            'zendesk': 'https://{subdomain}.zendesk.com/api/v2/users/me.json',
            'monday': 'https://api.monday.com/v2',
            'microsoft': 'https://graph.microsoft.com/v1.0/me',
            'xero': 'https://api.xero.com/connections'
        }

        if integration not in test_endpoints:
            return {
                'success': False,
                'error': 'Integration test not implemented'
            }

        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    'Authorization': f"Bearer {token_data['access_token']}"
                }

                # Handle special cases
                endpoint = test_endpoints[integration]
                if integration == 'monday':
                    # Monday.com uses GraphQL
                    response = await client.post(
                        endpoint,
                        headers=headers,
                        json={'query': '{ me { id name } }'}
                    )
                else:
                    response = await client.get(endpoint, headers=headers)

                return {
                    'success': response.status_code == 200,
                    'status_code': response.status_code,
                    'integration': integration
                }

        except Exception as e:
            logger.error(f"Connection test failed for {integration}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_microsoft_user_info(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """
        Get Microsoft 365 user profile information

        Args:
            access_token: Microsoft access token

        Returns:
            User profile data including id, email, displayName
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Content-Type': 'application/json'
                }

                response = await client.get(
                    'https://graph.microsoft.com/v1.0/me',
                    headers=headers
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get Microsoft user info: {response.text}")
                    raise Exception(f"Microsoft user info failed: {response.text}")

                user_data = response.json()
                logger.info(f"Retrieved Microsoft user info for {user_data.get('userPrincipalName')}")
                return user_data

        except Exception as e:
            logger.error(f"Failed to get Microsoft user info: {str(e)}")
            raise

    async def refresh_microsoft_token(
        self,
        refresh_token: str
    ) -> Dict[str, Any]:
        """
        Refresh Microsoft 365 OAuth token

        Args:
            refresh_token: Microsoft refresh token

        Returns:
            New token data including access_token and refresh_token
        """
        config = self.oauth_configs['microsoft']

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    config['token_url'],
                    data={
                        'grant_type': 'refresh_token',
                        'refresh_token': refresh_token,
                        'client_id': config['client_id'],
                        'client_secret': config['client_secret'],
                        'scope': config['scope']
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )

                if response.status_code != 200:
                    logger.error(f"Failed to refresh Microsoft token: {response.text}")
                    raise Exception(f"Microsoft token refresh failed: {response.text}")

                token_data = response.json()

                # Add metadata
                token_data['integration'] = 'microsoft'
                token_data['created_at'] = datetime.now().isoformat()
                token_data['expires_at'] = (
                    datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))
                ).isoformat()

                logger.info("Successfully refreshed Microsoft token")
                return token_data

        except Exception as e:
            logger.error(f"Failed to refresh Microsoft token: {str(e)}")
            raise

    async def get_xero_tenants(
        self,
        access_token: str
    ) -> List[Dict[str, Any]]:
        """
        Get Xero organizations/tenants for the authenticated user

        Args:
            access_token: Xero access token

        Returns:
            List of Xero organizations with tenantId and tenantName
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Content-Type': 'application/json'
                }

                response = await client.get(
                    'https://api.xero.com/connections',
                    headers=headers
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get Xero tenants: {response.text}")
                    raise Exception(f"Xero tenants retrieval failed: {response.text}")

                tenants = response.json()
                logger.info(f"Retrieved {len(tenants)} Xero tenant(s)")
                return tenants

        except Exception as e:
            logger.error(f"Failed to get Xero tenants: {str(e)}")
            raise

    async def refresh_xero_token(
        self,
        refresh_token: str
    ) -> Dict[str, Any]:
        """
        Refresh Xero OAuth token

        Args:
            refresh_token: Xero refresh token

        Returns:
            New token data including access_token and refresh_token
        """
        config = self.oauth_configs['xero']

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    config['token_url'],
                    data={
                        'grant_type': 'refresh_token',
                        'refresh_token': refresh_token,
                        'client_id': config['client_id'],
                        'client_secret': config['client_secret']
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )

                if response.status_code != 200:
                    logger.error(f"Failed to refresh Xero token: {response.text}")
                    raise Exception(f"Xero token refresh failed: {response.text}")

                token_data = response.json()

                # Add metadata
                token_data['integration'] = 'xero'
                token_data['created_at'] = datetime.now().isoformat()
                token_data['expires_at'] = (
                    datetime.now() + timedelta(seconds=token_data.get('expires_in', 1800))
                ).isoformat()

                logger.info("Successfully refreshed Xero token")
                return token_data

        except Exception as e:
            logger.error(f"Failed to refresh Xero token: {str(e)}")
            raise


# Singleton instance
oauth_service = OAuthIntegrationService()