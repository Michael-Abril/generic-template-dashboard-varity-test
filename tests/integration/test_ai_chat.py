#!/usr/bin/env python3
"""
AI Chat Endpoint Test Script
Tests AI chat functionality with proper wallet authentication
"""
import json
import time
import httpx
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# Configuration
API_BASE_URL = "http://localhost:8001"
TEST_WALLET_PRIVATE_KEY = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Create test wallet
account = Account.from_key(TEST_WALLET_PRIVATE_KEY)
wallet_address = account.address

print(f"Test Wallet: {wallet_address}")
print(f"API Base URL: {API_BASE_URL}")
print("-" * 80)


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


async def test_ai_health():
    """Test AI service health endpoint"""
    print("\n1. Testing AI Health Check...")
    print("-" * 80)

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE_URL}/api/v1/ai/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200


async def test_ai_chat(query: str):
    """Test AI chat endpoint with authentication"""
    print(f"\n2. Testing AI Chat: '{query}'")
    print("-" * 80)

    # Create auth headers
    headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)

    # Build request payload
    payload = {
        "message": query,
        "wallet_address": wallet_address,
        "use_rag": True
    }

    print(f"Headers: {json.dumps({k: v[:50] + '...' if len(v) > 50 else v for k, v in headers.items()}, indent=2)}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/chat",
            headers=headers,
            json=payload
        )

        print(f"\nStatus: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return result
        else:
            print(f"Error: {response.text}")
            return None


async def test_multitenant_query(query: str):
    """Test multi-tenant AI query endpoint"""
    print(f"\n3. Testing Multi-Tenant Query: '{query}'")
    print("-" * 80)

    # Create auth headers
    headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)

    payload = {
        "query": query,
        "wallet_address": wallet_address,
        "max_results": 5
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/query/multitenant",
            headers=headers,
            json=payload
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return result
        else:
            print(f"Error: {response.text}")
            return None


async def test_rag_stats():
    """Test RAG collection statistics"""
    print(f"\n4. Testing RAG Statistics...")
    print("-" * 80)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/api/v1/ai/rag/stats",
            params={"wallet_address": wallet_address}
        )

        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        return response.json()


async def test_ollama_direct():
    """Test Ollama directly"""
    print(f"\n5. Testing Ollama Directly...")
    print("-" * 80)

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Test list models
        response = await client.get("http://localhost:11435/api/tags")
        print(f"Ollama Models: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        # Test generate
        print("\nTesting Ollama Generate...")
        response = await client.post(
            "http://localhost:11435/api/generate",
            json={
                "model": "mistral",
                "prompt": "What is 2+2?",
                "stream": False
            }
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {result.get('response', '')[:200]}")


async def test_qdrant_direct():
    """Test Qdrant directly"""
    print(f"\n6. Testing Qdrant Directly...")
    print("-" * 80)

    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:6334/collections")
        print(f"Status: {response.status_code}")
        print(f"Collections: {json.dumps(response.json(), indent=2)}")


async def main():
    """Run all tests"""
    print("=" * 80)
    print("AI CHAT ENDPOINT TEST SUITE")
    print("=" * 80)

    try:
        # Test 1: AI Health
        await test_ai_health()

        # Test 2: Direct service tests
        await test_ollama_direct()
        await test_qdrant_direct()

        # Test 3: RAG Stats
        await test_rag_stats()

        # Test 4: AI Chat
        queries = [
            "What is my business about?",
            "Show me recent transactions",
            "What are my top products?"
        ]

        for query in queries:
            await test_ai_chat(query)
            time.sleep(2)  # Rate limiting

        # Test 5: Multi-tenant query
        await test_multitenant_query("Analyze my business performance")

        print("\n" + "=" * 80)
        print("TEST SUITE COMPLETED")
        print("=" * 80)

    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
