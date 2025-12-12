#!/usr/bin/env python3
"""
RAG Indexing Test Script
Tests RAG functionality by indexing sample business data and querying it
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


# Sample business data for indexing
SAMPLE_DATA = [
    {
        "cid": "QmTest001",
        "integration": "quickbooks",
        "data_type": "invoices",
        "data": {
            "invoice_id": "INV-001",
            "customer": "Acme Corp",
            "amount": 5000.00,
            "status": "paid",
            "date": "2025-11-01",
            "items": [
                {"description": "Payment Gateway Service", "amount": 3000},
                {"description": "Monthly Support", "amount": 2000}
            ]
        }
    },
    {
        "cid": "QmTest002",
        "integration": "quickbooks",
        "data_type": "invoices",
        "data": {
            "invoice_id": "INV-002",
            "customer": "TechStart Inc",
            "amount": 8500.00,
            "status": "pending",
            "date": "2025-11-15",
            "items": [
                {"description": "POS Terminal Integration", "amount": 5000},
                {"description": "Setup Fee", "amount": 3500}
            ]
        }
    },
    {
        "cid": "QmTest003",
        "integration": "quickbooks",
        "data_type": "products",
        "data": {
            "product_id": "PROD-001",
            "name": "Payment Gateway Service",
            "category": "Services",
            "revenue": 45000.00,
            "units_sold": 15,
            "description": "Full-service payment processing gateway with fraud detection"
        }
    },
    {
        "cid": "QmTest004",
        "integration": "quickbooks",
        "data_type": "products",
        "data": {
            "product_id": "PROD-002",
            "name": "POS Terminal",
            "category": "Hardware",
            "revenue": 32000.00,
            "units_sold": 8,
            "description": "Modern point-of-sale terminal with contactless payment support"
        }
    },
    {
        "cid": "QmTest005",
        "integration": "quickbooks",
        "data_type": "customers",
        "data": {
            "customer_id": "CUST-001",
            "name": "Acme Corp",
            "total_revenue": 45000.00,
            "invoices_count": 12,
            "status": "active",
            "industry": "Retail"
        }
    }
]


async def index_sample_data():
    """Index sample business data into RAG"""
    print("\n1. Indexing Sample Business Data...")
    print("-" * 80)

    success_count = 0
    fail_count = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for item in SAMPLE_DATA:
            try:
                print(f"\nIndexing: {item['data_type']} - CID: {item['cid']}")

                response = await client.post(
                    f"{API_BASE_URL}/api/v1/ai/rag/index",
                    params={
                        "wallet_address": wallet_address,
                        "cid": item["cid"],
                        "integration": item["integration"],
                        "data_type": item["data_type"]
                    },
                    json=item["data"]
                )

                if response.status_code == 200:
                    result = response.json()
                    print(f"✓ Indexed: {result.get('point_id', 'unknown')}")
                    success_count += 1
                else:
                    print(f"✗ Failed: {response.status_code} - {response.text}")
                    fail_count += 1

                time.sleep(0.5)  # Rate limiting

            except Exception as e:
                print(f"✗ Error: {e}")
                fail_count += 1

    print(f"\nIndexing Results: {success_count} success, {fail_count} failed")
    return success_count > 0


async def check_rag_stats():
    """Check RAG collection statistics"""
    print("\n2. Checking RAG Collection Statistics...")
    print("-" * 80)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/api/v1/ai/rag/stats",
            params={"wallet_address": wallet_address}
        )

        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")

        return result


async def test_rag_queries():
    """Test AI queries with RAG context"""
    print("\n3. Testing RAG-Powered AI Queries...")
    print("-" * 80)

    queries = [
        "What are my top products?",
        "Show me pending invoices",
        "Who is my best customer?",
        "What's my total revenue from Payment Gateway Service?",
        "List all my customers"
    ]

    results = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for query in queries:
            print(f"\nQuery: {query}")
            print("-" * 40)

            headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)

            payload = {
                "query": query,
                "wallet_address": wallet_address,
                "max_results": 5
            }

            response = await client.post(
                f"{API_BASE_URL}/api/v1/ai/query/multitenant",
                headers=headers,
                json=payload
            )

            if response.status_code == 200:
                result = response.json()
                print(f"Answer: {result['answer'][:300]}...")
                print(f"Sources: {len(result['sources'])} sources")
                print(f"Context Used: {result['context_used']}")
                results.append(result)
            else:
                print(f"Error: {response.status_code} - {response.text}")

            time.sleep(2)  # Rate limiting

    return results


async def test_multitenant_isolation():
    """Test multi-tenant isolation by creating second business"""
    print("\n4. Testing Multi-Tenant Isolation...")
    print("-" * 80)

    # Create second test wallet
    second_private_key = "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
    second_account = Account.from_key(second_private_key)
    second_wallet = second_account.address

    print(f"Business A: {wallet_address}")
    print(f"Business B: {second_wallet}")

    # Index data for Business B
    print("\nIndexing data for Business B...")
    business_b_data = {
        "cid": "QmTestB001",
        "integration": "quickbooks",
        "data_type": "products",
        "data": {
            "product_id": "PROD-B001",
            "name": "Different Product",
            "revenue": 99999.00
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Index for Business B
        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/rag/index",
            params={
                "wallet_address": second_wallet,
                "cid": business_b_data["cid"],
                "integration": business_b_data["integration"],
                "data_type": business_b_data["data_type"]
            },
            json=business_b_data["data"]
        )
        print(f"Business B Indexing: {response.status_code}")

        # Query from Business A (should NOT see Business B's data)
        print("\nQuerying from Business A (should NOT see Business B's product)...")
        headers = create_auth_headers(wallet_address, TEST_WALLET_PRIVATE_KEY)
        payload = {
            "query": "Show me all products",
            "wallet_address": wallet_address,
            "max_results": 10
        }

        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/query/multitenant",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            result = response.json()
            answer = result['answer']

            # Check if Business B's product appears in answer
            if "Different Product" in answer or "99999" in answer:
                print("❌ ISOLATION FAILURE: Business A can see Business B's data!")
            else:
                print("✅ ISOLATION SUCCESS: Business A cannot see Business B's data")

            print(f"Answer: {answer[:300]}...")
        else:
            print(f"Error: {response.status_code}")

        # Query from Business B (should see their own data)
        print("\nQuerying from Business B (should see their own product)...")
        headers_b = create_auth_headers(second_wallet, second_private_key)
        payload_b = {
            "query": "Show me all products",
            "wallet_address": second_wallet,
            "max_results": 10
        }

        response = await client.post(
            f"{API_BASE_URL}/api/v1/ai/query/multitenant",
            headers=headers_b,
            json=payload_b
        )

        if response.status_code == 200:
            result = response.json()
            answer = result['answer']

            if "Different Product" in answer or "99999" in answer:
                print("✅ Business B can see their own data")
            else:
                print("❌ Business B cannot see their own data")

            print(f"Answer: {answer[:300]}...")


async def main():
    """Run all RAG tests"""
    print("=" * 80)
    print("RAG INDEXING AND RETRIEVAL TEST SUITE")
    print("=" * 80)

    try:
        # Test 1: Index sample data
        if not await index_sample_data():
            print("\n❌ Indexing failed. Stopping tests.")
            return

        # Test 2: Check stats
        await check_rag_stats()

        # Test 3: Test RAG queries
        await test_rag_queries()

        # Test 4: Test multi-tenant isolation
        await test_multitenant_isolation()

        print("\n" + "=" * 80)
        print("RAG TEST SUITE COMPLETED")
        print("=" * 80)

    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
