#!/usr/bin/env python3
"""
AI Integration Tests - Quick validation suite
"""
import pytest
import httpx
import time
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# Configuration
API_BASE_URL = "http://localhost:8001"
TEST_WALLET_PRIVATE_KEY = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
account = Account.from_key(TEST_WALLET_PRIVATE_KEY)
wallet_address = account.address


def sign_message(message: str, private_key: str) -> str:
    """Sign a message with the private key"""
    w3 = Web3()
    message_hash = encode_defunct(text=message)
    signed_message = w3.eth.account.sign_message(message_hash, private_key=private_key)
    return signed_message.signature.hex()


def create_auth_headers(wallet_address: str, private_key: str) -> dict:
    """Create authentication headers for API requests"""
    timestamp = int(time.time())
    message = f"Authenticate wallet {wallet_address} at {timestamp}"
    signature = sign_message(message, private_key)

    return {
        "X-Wallet-Address": wallet_address,
        "X-Signature": signature,
        "X-Message": message,
        "X-Timestamp": str(timestamp),
        "Content-Type": "application/json"
    }


@pytest.mark.asyncio
async def test_ollama_connectivity():
    """Test Ollama service is accessible"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:11435/api/tags")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0


@pytest.mark.asyncio
async def test_qdrant_connectivity():
    """Test Qdrant service is accessible"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:6334/collections")
        assert response.status_code == 200
        data = response.json()
        assert "result" in data


@pytest.mark.asyncio
async def test_ai_health():
    """Test AI health endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE_URL}/api/v1/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["health"]["ollama"] is True
        assert data["health"]["qdrant"] is True


@pytest.mark.asyncio
async def test_ai_chat_authentication():
    """Test AI chat requires authentication"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Without auth headers - should fail
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/chat",
            json={
                "message": "test",
                "wallet_address": wallet_address
            }
        )
        assert response.status_code == 401

        # With auth headers - should succeed
        headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/chat",
            headers=headers,
            json={
                "message": "Hello",
                "wallet_address": wallet_address
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data


@pytest.mark.asyncio
async def test_rag_indexing():
    """Test RAG data indexing"""
    test_data = {
        "cid": "QmTestIndex",
        "integration": "quickbooks",
        "data_type": "test_data",
        "data": {
            "test_id": "TEST-001",
            "value": "test value"
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/rag/index",
            params={
                "wallet_address": wallet_address,
                "cid": test_data["cid"],
                "integration": test_data["integration"],
                "data_type": test_data["data_type"]
            },
            json=test_data["data"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "point_id" in data


@pytest.mark.asyncio
async def test_multitenant_query():
    """Test multi-tenant AI query"""
    headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/query/multitenant",
            headers=headers,
            json={
                "query": "What data do I have?",
                "wallet_address": wallet_address,
                "max_results": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "answer" in data
        assert "sources" in data


@pytest.mark.asyncio
async def test_ai_suggestions():
    """Test AI query suggestions"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/api/v1/ai/suggestions",
            params={"wallet_address": wallet_address}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
