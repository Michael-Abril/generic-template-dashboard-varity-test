"""
Shared fixtures for service tests
"""
import pytest
from unittest.mock import Mock, AsyncMock, MagicMock, patch
import httpx
from datetime import datetime


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for API calls"""
    client = AsyncMock(spec=httpx.AsyncClient)
    client.post = AsyncMock()
    client.get = AsyncMock()
    client.put = AsyncMock()
    client.delete = AsyncMock()
    return client


@pytest.fixture
def mock_wallet_address():
    """Mock Ethereum wallet address"""
    return "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"


@pytest.fixture
def mock_company_id():
    """Mock company ID hash"""
    return "0x05e4fba79897adcb632eab6c4089e662335b98772d169dbc083f281e66ecf61d"


@pytest.fixture
def mock_timestamp():
    """Mock ISO timestamp"""
    return "2025-11-20T12:00:00"


@pytest.fixture
def mock_ipfs_hash():
    """Mock IPFS CID"""
    return "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"


@pytest.fixture
def mock_oauth_token():
    """Mock OAuth access token"""
    return {
        "access_token": "ya29.a0AfH6SMBx...",
        "refresh_token": "1//0gHY_refresh_token",
        "expires_in": 3600,
        "token_type": "Bearer",
        "scope": "https://www.googleapis.com/auth/gmail.readonly"
    }


@pytest.fixture
def mock_encrypted_data():
    """Mock encrypted data payload"""
    return {
        "ciphertext": "0x1234567890abcdef...",
        "dataToEncryptHash": "0xabcdef1234567890...",
        "accessControlConditions": [
            {
                "contractAddress": "",
                "standardContractType": "",
                "chain": "ethereum",
                "method": "eth_getBalance",
                "parameters": [":userAddress", "latest"],
                "returnValueTest": {
                    "comparator": ">=",
                    "value": "0"
                }
            }
        ]
    }


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    session = MagicMock()
    session.add = Mock()
    session.commit = Mock()
    session.rollback = Mock()
    session.query = Mock()
    session.refresh = Mock()
    return session


@pytest.fixture
def mock_settings():
    """Mock application settings"""
    with patch('app.core.config.settings') as mock:
        mock.pinata_api_url = "https://api.pinata.cloud"
        mock.pinata_gateway_url = "https://gateway.pinata.cloud/ipfs"
        mock.pinata_jwt = "test_jwt_token"
        mock.pinata_api_key = "test_api_key"
        mock.pinata_secret_key = "test_secret_key"
        mock.ollama_api_url = "http://localhost:11434"
        mock.qdrant_url = "http://localhost:6333"
        mock.qdrant_collection_name = "varity_knowledge"
        mock.web3_rpc_url = "https://rpc-varity-testnet.t.conduit.xyz"
        mock.chain_id = 33529
        yield mock


@pytest.fixture
def mock_sentry_service():
    """Mock Sentry service"""
    with patch('app.services.sentry_service.sentry_service') as mock:
        mock.add_breadcrumb = Mock()
        mock.capture_message = Mock()
        mock.capture_exception = Mock()
        yield mock
