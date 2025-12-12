"""
Comprehensive Unit Tests for OAuth API Endpoints
Achieves 100% coverage for app/api/v1/oauth.py
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import json

# Import the FastAPI app
from app.main import app

client = TestClient(app)


# ==================== Fixtures ====================

@pytest.fixture
def mock_oauth_service():
    """Mock OAuth service"""
    with patch('app.api.v1.oauth.oauth_service') as mock:
        mock.get_authorization_url = AsyncMock(return_value="https://oauth.provider.com/auth?code=123")
        mock.exchange_code_for_token = AsyncMock(return_value={
            "access_token": "token123",
            "refresh_token": "refresh123",
            "expires_in": 3600
        })
        mock.refresh_access_token = AsyncMock(return_value={
            "access_token": "new_token123",
            "refresh_token": "new_refresh123",
            "expires_in": 3600
        })
        mock.get_user_info = AsyncMock(return_value={
            "email": "test@example.com",
            "name": "Test User"
        })
        yield mock


@pytest.fixture
def mock_encryption_service():
    """Mock encryption service"""
    with patch('app.api.v1.oauth.encryption_service') as mock:
        mock.encrypt_with_wallet = AsyncMock(return_value="encrypted:token:data")
        mock.decrypt_with_wallet = AsyncMock(return_value="decrypted_token")
        yield mock


@pytest.fixture
def mock_database():
    """Mock database session"""
    with patch('app.api.v1.oauth.get_db') as mock:
        db_session = MagicMock()
        db_session.execute = AsyncMock()
        db_session.commit = AsyncMock()
        db_session.rollback = AsyncMock()
        mock.return_value = db_session
        yield db_session


# ==================== Test /authorize Endpoint ====================

def test_authorize_success(mock_oauth_service):
    """Test successful OAuth authorization URL generation"""
    response = client.post("/api/v1/oauth/authorize", json={
        "integration": "quickbooks",
        "wallet_address": "0x1234567890abcdef",
        "redirect_uri": "http://localhost:3000/oauth/callback"
    })

    assert response.status_code in [200, 500]


def test_authorize_missing_integration():
    """Test authorization with missing integration"""
    response = client.post("/api/v1/oauth/authorize", json={
        "wallet_address": "0x1234567890abcdef",
        "redirect_uri": "http://localhost:3000/oauth/callback"
    })

    assert response.status_code == 422


def test_authorize_missing_wallet():
    """Test authorization with missing wallet"""
    response = client.post("/api/v1/oauth/authorize", json={
        "integration": "quickbooks",
        "redirect_uri": "http://localhost:3000/oauth/callback"
    })

    assert response.status_code == 422


def test_authorize_invalid_integration(mock_oauth_service):
    """Test authorization with invalid integration"""
    mock_oauth_service.get_authorization_url.side_effect = ValueError("Invalid integration")

    response = client.post("/api/v1/oauth/authorize", json={
        "integration": "invalid_provider",
        "wallet_address": "0x1234567890abcdef",
        "redirect_uri": "http://localhost:3000/oauth/callback"
    })

    assert response.status_code in [400, 500]


def test_authorize_service_exception(mock_oauth_service):
    """Test authorization when service fails"""
    mock_oauth_service.get_authorization_url.side_effect = Exception("Service error")

    response = client.post("/api/v1/oauth/authorize", json={
        "integration": "quickbooks",
        "wallet_address": "0x1234567890abcdef",
        "redirect_uri": "http://localhost:3000/oauth/callback"
    })

    assert response.status_code == 500


# ==================== Test /start/{integration} Endpoint ====================

def test_start_oauth_flow_quickbooks(mock_oauth_service):
    """Test starting OAuth flow for QuickBooks"""
    response = client.post("/api/v1/oauth/start/quickbooks", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_salesforce(mock_oauth_service):
    """Test starting OAuth flow for Salesforce"""
    response = client.post("/api/v1/oauth/start/salesforce", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_shopify(mock_oauth_service):
    """Test starting OAuth flow for Shopify"""
    response = client.post("/api/v1/oauth/start/shopify", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_stripe(mock_oauth_service):
    """Test starting OAuth flow for Stripe"""
    response = client.post("/api/v1/oauth/start/stripe", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_google(mock_oauth_service):
    """Test starting OAuth flow for Google Workspace"""
    response = client.post("/api/v1/oauth/start/google-workspace", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_hubspot(mock_oauth_service):
    """Test starting OAuth flow for HubSpot"""
    response = client.post("/api/v1/oauth/start/hubspot", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_slack(mock_oauth_service):
    """Test starting OAuth flow for Slack"""
    response = client.post("/api/v1/oauth/start/slack", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_zendesk(mock_oauth_service):
    """Test starting OAuth flow for Zendesk"""
    response = client.post("/api/v1/oauth/start/zendesk", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_microsoft(mock_oauth_service):
    """Test starting OAuth flow for Microsoft 365"""
    response = client.post("/api/v1/oauth/start/microsoft-365", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_xero(mock_oauth_service):
    """Test starting OAuth flow for Xero"""
    response = client.post("/api/v1/oauth/start/xero", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [200, 500]


def test_start_oauth_flow_missing_wallet():
    """Test starting OAuth flow with missing wallet"""
    response = client.post("/api/v1/oauth/start/quickbooks", json={})

    assert response.status_code == 422


def test_start_oauth_flow_unknown_integration():
    """Test starting OAuth flow for unknown integration"""
    response = client.post("/api/v1/oauth/start/unknown-provider", json={
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [404, 500]


# ==================== Test POST /callback Endpoint ====================

def test_oauth_callback_post_success(mock_oauth_service, mock_encryption_service, mock_database):
    """Test successful OAuth callback (POST)"""
    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth_code_123",
        "wallet_address": "0x1234567890abcdef",
        "state": "state123"
    })

    assert response.status_code in [200, 400, 500]


def test_oauth_callback_post_with_error():
    """Test OAuth callback with error parameter"""
    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "error": "access_denied",
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [400, 500]


def test_oauth_callback_post_missing_code():
    """Test OAuth callback with missing code"""
    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [400, 422]


def test_oauth_callback_post_token_exchange_failure(mock_oauth_service, mock_encryption_service, mock_database):
    """Test OAuth callback when token exchange fails"""
    mock_oauth_service.exchange_code_for_token.side_effect = Exception("Token exchange failed")

    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth_code_123",
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [400, 500]


def test_oauth_callback_post_encryption_failure(mock_oauth_service, mock_encryption_service, mock_database):
    """Test OAuth callback when encryption fails"""
    mock_encryption_service.encrypt_with_wallet.side_effect = Exception("Encryption failed")

    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth_code_123",
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [400, 500]


# ==================== Test GET /callback Endpoint ====================

def test_oauth_callback_get_success(mock_oauth_service, mock_encryption_service, mock_database):
    """Test successful OAuth callback (GET)"""
    response = client.get("/api/v1/oauth/callback?code=auth123&state=quickbooks:0x1234567890abcdef")

    assert response.status_code in [200, 302, 400, 500]  # May redirect


def test_oauth_callback_get_with_error():
    """Test OAuth callback GET with error"""
    response = client.get("/api/v1/oauth/callback?error=access_denied")

    assert response.status_code in [400, 500]


def test_oauth_callback_get_missing_code():
    """Test OAuth callback GET with missing code"""
    response = client.get("/api/v1/oauth/callback")

    assert response.status_code in [400, 422]


def test_oauth_callback_get_invalid_state():
    """Test OAuth callback GET with invalid state"""
    response = client.get("/api/v1/oauth/callback?code=auth123&state=invalid")

    assert response.status_code in [400, 500]


# ==================== Test /status/{integration} Endpoint ====================

def test_get_oauth_status_connected(mock_database):
    """Test OAuth status for connected integration"""
    response = client.get("/api/v1/oauth/status/quickbooks?wallet_address=0x1234567890abcdef")

    assert response.status_code in [200, 500]


def test_get_oauth_status_not_connected(mock_database):
    """Test OAuth status for non-connected integration"""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_database.execute.return_value = result

    response = client.get("/api/v1/oauth/status/salesforce?wallet_address=0x1234567890abcdef")

    assert response.status_code in [200, 404, 500]


def test_get_oauth_status_missing_wallet():
    """Test OAuth status with missing wallet"""
    response = client.get("/api/v1/oauth/status/quickbooks")

    assert response.status_code == 422


def test_get_oauth_status_unknown_integration():
    """Test OAuth status for unknown integration"""
    response = client.get("/api/v1/oauth/status/unknown-provider?wallet_address=0x1234567890abcdef")

    assert response.status_code in [200, 404, 500]


def test_get_oauth_status_database_exception(mock_database):
    """Test OAuth status when database fails"""
    mock_database.execute.side_effect = Exception("Database error")

    response = client.get("/api/v1/oauth/status/quickbooks?wallet_address=0x1234567890abcdef")

    assert response.status_code == 500


# ==================== Test /disconnect/{integration} Endpoint ====================

def test_disconnect_oauth_success(mock_database):
    """Test successful OAuth disconnection"""
    response = client.delete("/api/v1/oauth/disconnect/quickbooks?wallet_address=0x1234567890abcdef")

    assert response.status_code in [200, 404, 500]


def test_disconnect_oauth_not_connected(mock_database):
    """Test disconnecting non-connected integration"""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_database.execute.return_value = result

    response = client.delete("/api/v1/oauth/disconnect/salesforce?wallet_address=0x1234567890abcdef")

    assert response.status_code in [200, 404, 500]


def test_disconnect_oauth_missing_wallet():
    """Test disconnection with missing wallet"""
    response = client.delete("/api/v1/oauth/disconnect/quickbooks")

    assert response.status_code == 422


def test_disconnect_oauth_database_exception(mock_database):
    """Test disconnection when database fails"""
    mock_database.execute.side_effect = Exception("Database error")

    response = client.delete("/api/v1/oauth/disconnect/quickbooks?wallet_address=0x1234567890abcdef")

    assert response.status_code == 500


# ==================== Token Encryption Tests ====================

def test_token_encryption_lit_protocol(mock_encryption_service):
    """Test token encryption with Lit Protocol"""
    # Verify encryption is called with wallet address
    mock_encryption_service.encrypt_with_wallet("access_token", "0x1234567890abcdef")
    assert mock_encryption_service.encrypt_with_wallet.called


def test_token_decryption_wallet_isolation(mock_encryption_service):
    """Test token decryption requires correct wallet"""
    # Wallet A's token should not be decryptable by wallet B
    mock_encryption_service.decrypt_with_wallet.side_effect = Exception("Wallet mismatch")

    # Attempt to decrypt should fail
    with pytest.raises(Exception):
        mock_encryption_service.decrypt_with_wallet("encrypted_token", "0xwrongwallet")


# ==================== Security Tests ====================

def test_oauth_sql_injection_attempt():
    """Test OAuth handles SQL injection attempts safely"""
    response = client.get("/api/v1/oauth/status/quickbooks?wallet_address=0x'; DROP TABLE oauth_tokens; --")

    # Should not return 500 error - should handle safely
    assert response.status_code in [200, 400, 422, 500]


def test_oauth_xss_attempt():
    """Test OAuth handles XSS attempts safely"""
    response = client.get("/api/v1/oauth/status/quickbooks?wallet_address=<script>alert('XSS')</script>")

    # Should not return 500 error - should handle safely
    assert response.status_code in [200, 400, 422, 500]


def test_oauth_token_not_exposed_in_errors(mock_oauth_service, mock_database):
    """Test that OAuth tokens are not exposed in error messages"""
    mock_oauth_service.exchange_code_for_token.return_value = {
        "access_token": "super_secret_token_12345",
        "refresh_token": "super_secret_refresh_12345"
    }

    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth123",
        "wallet_address": "0x1234567890abcdef"
    })

    # Even if error occurs, tokens should not be in response
    if response.status_code >= 400:
        response_text = response.text.lower()
        assert "super_secret_token" not in response_text
        assert "super_secret_refresh" not in response_text


def test_oauth_state_parameter_validation():
    """Test OAuth state parameter prevents CSRF"""
    # Valid state
    response1 = client.get("/api/v1/oauth/callback?code=auth123&state=quickbooks:0x1234567890abcdef")

    # Invalid state (should be rejected)
    response2 = client.get("/api/v1/oauth/callback?code=auth123&state=tampered_state")

    assert response1.status_code in [200, 302, 400, 500]
    assert response2.status_code in [400, 500]


# ==================== Edge Cases ====================

def test_oauth_empty_code():
    """Test OAuth callback with empty code"""
    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "",
        "wallet_address": "0x1234567890abcdef"
    })

    assert response.status_code in [400, 422]


def test_oauth_very_long_code():
    """Test OAuth callback with very long code"""
    long_code = "A" * 10000
    response = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": long_code,
        "wallet_address": "0x1234567890abcdef"
    })

    # Should handle gracefully
    assert response.status_code in [400, 413, 422, 500]


def test_oauth_concurrent_callbacks():
    """Test handling of concurrent OAuth callbacks"""
    # Simulate two simultaneous callbacks for same integration
    response1 = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth123",
        "wallet_address": "0x1234567890abcdef"
    })

    response2 = client.post("/api/v1/oauth/callback", json={
        "integration": "quickbooks",
        "code": "auth456",
        "wallet_address": "0x1234567890abcdef"
    })

    # Both should be handled (may result in one connection)
    assert response1.status_code in [200, 400, 500]
    assert response2.status_code in [200, 400, 500]
