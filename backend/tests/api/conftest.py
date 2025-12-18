"""
Shared Pytest Fixtures for API Tests

This module provides common fixtures used across all API test files.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import json

# Import the FastAPI app
from app.main import app


@pytest.fixture
def test_client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def sample_wallet_address():
    """Sample Ethereum wallet address for testing"""
    return "0x1234567890abcdef1234567890abcdef12345678"


@pytest.fixture
def sample_usdc_amount():
    """
    Sample USDC amount (6 decimals!)
    Returns 100 USDC = 100_000_000 (100 * 10^6)
    """
    return 100 * 10**6  # 100 USDC with 6 decimals


@pytest.fixture
def mock_database_session():
    """Mock database session"""
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
def mock_blockchain_service():
    """Mock blockchain service for smart contract interactions"""
    with patch('app.services.blockchain_service') as mock:
        mock.mint_license_nft = AsyncMock(return_value={
            "transaction_hash": "0xabcdef1234567890",
            "token_id": 12345,
            "success": True
        })
        mock.verify_purchase = AsyncMock(return_value=True)
        mock.get_user_licenses = AsyncMock(return_value=[])
        yield mock


@pytest.fixture
def sample_quickbooks_data():
    """Sample QuickBooks invoice data"""
    return {
        "invoices": [
            {
                "id": "INV-001",
                "customer": "Acme Corp",
                "amount": 5000.00,
                "status": "paid",
                "date": "2024-01-15"
            },
            {
                "id": "INV-002",
                "customer": "TechStart",
                "amount": 3000.00,
                "status": "pending",
                "date": "2024-01-20"
            }
        ]
    }


@pytest.fixture
def sample_salesforce_data():
    """Sample Salesforce leads data"""
    return {
        "leads": [
            {
                "id": "LEAD-001",
                "company": "New Company Inc",
                "status": "qualified",
                "value": 10000.00
            }
        ]
    }


@pytest.fixture
def sample_filecoin_file():
    """Sample Filecoin file metadata"""
    return {
        "cid": "QmTest123456789",
        "integration": "quickbooks",
        "data_type": "invoices",
        "uploaded_at": "2024-01-01T10:00:00Z",
        "size": 1024,
        "encrypted": True
    }


@pytest.fixture
def mock_datetime():
    """Mock datetime.now() for consistent timestamps"""
    fixed_datetime = datetime(2024, 1, 1, 12, 0, 0)
    with patch('app.api.v1.ai.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_datetime
        mock_dt.isoformat = fixed_datetime.isoformat
        yield mock_dt


# Common assertion helpers

def assert_success_response(response, expected_status=200):
    """Assert API response is successful"""
    assert response.status_code == expected_status
    data = response.json()
    assert "success" in data or response.status_code == 200
    return data


def assert_error_response(response, expected_status, error_substring=None):
    """Assert API response is an error"""
    assert response.status_code == expected_status
    data = response.json()
    if error_substring:
        assert error_substring.lower() in str(data).lower()
    return data


def assert_validation_error(response):
    """Assert API response is a 422 validation error"""
    return assert_error_response(response, 422)
