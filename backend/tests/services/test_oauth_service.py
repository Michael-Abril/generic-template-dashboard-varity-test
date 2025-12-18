"""
Unit tests for OAuthService
Tests all 8 OAuth adapters with mock credentials and token encryption
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from app.services.oauth_service import OAuthService


class TestOAuthService:
    """Test suite for OAuth service"""

    @pytest.fixture
    def oauth_service(self):
        """Create OAuthService instance"""
        return OAuthService()

    @pytest.fixture
    def mock_oauth_config(self):
        """Mock OAuth configuration"""
        return {
            "client_id": "test_client_id",
            "client_secret": "test_client_secret",
            "redirect_uri": "http://localhost:3001/callback",
            "scope": "read write"
        }

    # QuickBooks OAuth Tests
    @pytest.mark.asyncio
    async def test_quickbooks_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test QuickBooks OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="quickbooks",
            config=mock_oauth_config
        )

        assert "intuit.com" in auth_url
        assert "client_id" in auth_url
        assert "scope" in auth_url

    @pytest.mark.asyncio
    async def test_quickbooks_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test QuickBooks OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="quickbooks",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert token["access_token"] == mock_oauth_token["access_token"]
            assert "refresh_token" in token

    @pytest.mark.asyncio
    async def test_quickbooks_refresh_token(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test QuickBooks token refresh"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "access_token": "new_access_token",
                "expires_in": 3600
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            new_token = await oauth_service.refresh_access_token(
                provider="quickbooks",
                refresh_token=mock_oauth_token["refresh_token"],
                config=mock_oauth_config
            )

            assert new_token["access_token"] == "new_access_token"

    # Salesforce OAuth Tests
    @pytest.mark.asyncio
    async def test_salesforce_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Salesforce OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="salesforce",
            config=mock_oauth_config
        )

        assert "salesforce.com" in auth_url
        assert "oauth2/authorize" in auth_url

    @pytest.mark.asyncio
    async def test_salesforce_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Salesforce OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="salesforce",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert "access_token" in token

    # Shopify OAuth Tests
    @pytest.mark.asyncio
    async def test_shopify_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Shopify OAuth authorization URL generation"""
        shop_url = "test-shop.myshopify.com"

        auth_url = await oauth_service.get_authorization_url(
            provider="shopify",
            config={**mock_oauth_config, "shop_url": shop_url}
        )

        assert shop_url in auth_url
        assert "oauth/authorize" in auth_url

    @pytest.mark.asyncio
    async def test_shopify_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Shopify OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="shopify",
                code="auth_code_123",
                config={**mock_oauth_config, "shop_url": "test-shop.myshopify.com"}
            )

            assert "access_token" in token

    # Stripe OAuth Tests
    @pytest.mark.asyncio
    async def test_stripe_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Stripe OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="stripe",
            config=mock_oauth_config
        )

        assert "stripe.com" in auth_url
        assert "oauth/authorize" in auth_url

    @pytest.mark.asyncio
    async def test_stripe_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Stripe OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "access_token": mock_oauth_token["access_token"],
                "stripe_user_id": "acct_123456"
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="stripe",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert "stripe_user_id" in token

    # Google Workspace OAuth Tests
    @pytest.mark.asyncio
    async def test_google_workspace_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Google Workspace OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="google-workspace",
            config=mock_oauth_config
        )

        assert "accounts.google.com" in auth_url
        assert "oauth2/auth" in auth_url

    @pytest.mark.asyncio
    async def test_google_workspace_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Google Workspace OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="google-workspace",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert "access_token" in token

    # HubSpot OAuth Tests
    @pytest.mark.asyncio
    async def test_hubspot_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test HubSpot OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="hubspot",
            config=mock_oauth_config
        )

        assert "hubspot.com" in auth_url
        assert "oauth/authorize" in auth_url

    @pytest.mark.asyncio
    async def test_hubspot_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test HubSpot OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="hubspot",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert "access_token" in token

    # Slack OAuth Tests
    @pytest.mark.asyncio
    async def test_slack_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Slack OAuth authorization URL generation"""
        auth_url = await oauth_service.get_authorization_url(
            provider="slack",
            config=mock_oauth_config
        )

        assert "slack.com" in auth_url
        assert "oauth/authorize" in auth_url

    @pytest.mark.asyncio
    async def test_slack_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Slack OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "ok": True,
                "access_token": mock_oauth_token["access_token"],
                "team": {"id": "T12345", "name": "Test Team"}
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="slack",
                code="auth_code_123",
                config=mock_oauth_config
            )

            assert token["ok"] is True
            assert "team" in token

    # Zendesk OAuth Tests
    @pytest.mark.asyncio
    async def test_zendesk_authorization_url(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test Zendesk OAuth authorization URL generation"""
        subdomain = "testcompany"

        auth_url = await oauth_service.get_authorization_url(
            provider="zendesk",
            config={**mock_oauth_config, "subdomain": subdomain}
        )

        assert subdomain in auth_url
        assert "zendesk.com" in auth_url
        assert "oauth/authorizations/new" in auth_url

    @pytest.mark.asyncio
    async def test_zendesk_token_exchange(
        self,
        oauth_service,
        mock_oauth_config,
        mock_oauth_token
    ):
        """Test Zendesk OAuth token exchange"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_oauth_token
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            token = await oauth_service.exchange_code_for_token(
                provider="zendesk",
                code="auth_code_123",
                config={**mock_oauth_config, "subdomain": "testcompany"}
            )

            assert "access_token" in token

    # Token Encryption Tests (Lit Protocol)
    @pytest.mark.asyncio
    async def test_encrypt_oauth_token(
        self,
        oauth_service,
        mock_oauth_token,
        mock_wallet_address
    ):
        """Test OAuth token encryption with Lit Protocol"""
        with patch('app.services.encryption_service.EncryptionService.encrypt_data') as mock_encrypt:
            mock_encrypt.return_value = {
                "ciphertext": "encrypted_token",
                "dataToEncryptHash": "hash123"
            }

            encrypted = await oauth_service.encrypt_token(
                token=mock_oauth_token,
                wallet_address=mock_wallet_address
            )

            assert "ciphertext" in encrypted
            mock_encrypt.assert_called_once()

    @pytest.mark.asyncio
    async def test_decrypt_oauth_token(
        self,
        oauth_service,
        mock_encrypted_data,
        mock_oauth_token,
        mock_wallet_address
    ):
        """Test OAuth token decryption with Lit Protocol"""
        with patch('app.services.encryption_service.EncryptionService.decrypt_data') as mock_decrypt:
            mock_decrypt.return_value = mock_oauth_token

            decrypted = await oauth_service.decrypt_token(
                encrypted_token=mock_encrypted_data,
                wallet_address=mock_wallet_address
            )

            assert decrypted["access_token"] == mock_oauth_token["access_token"]

    # Token Expiry Tests
    @pytest.mark.asyncio
    async def test_check_token_expiry(
        self,
        oauth_service,
        mock_oauth_token
    ):
        """Test checking if OAuth token is expired"""
        # Token expires in 1 hour
        token_with_expiry = {
            **mock_oauth_token,
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).timestamp()
        }

        is_expired = await oauth_service.is_token_expired(token_with_expiry)
        assert is_expired is False

        # Token expired 1 hour ago
        expired_token = {
            **mock_oauth_token,
            "expires_at": (datetime.utcnow() - timedelta(hours=1)).timestamp()
        }

        is_expired = await oauth_service.is_token_expired(expired_token)
        assert is_expired is True

    # Error Handling Tests
    @pytest.mark.asyncio
    async def test_oauth_error_handling(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test OAuth error handling"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 401
            mock_response.json.return_value = {"error": "invalid_client"}
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            with pytest.raises(Exception):
                await oauth_service.exchange_code_for_token(
                    provider="quickbooks",
                    code="invalid_code",
                    config=mock_oauth_config
                )

    @pytest.mark.asyncio
    async def test_unsupported_provider(
        self,
        oauth_service,
        mock_oauth_config
    ):
        """Test handling unsupported OAuth provider"""
        with pytest.raises(ValueError):
            await oauth_service.get_authorization_url(
                provider="unsupported-provider",
                config=mock_oauth_config
            )
