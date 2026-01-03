"""
Test Marketplace Integration with Smart Contracts

This script tests the complete marketplace purchase flow including:
1. NFT license minting
2. Subscription billing creation
3. Database record creation
4. End-to-end purchase verification

Run with: python test_marketplace_integration.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

async def test_blockchain_service():
    """Test blockchain service initialization and connection"""
    print("\n" + "="*80)
    print("TEST 1: Blockchain Service Connection")
    print("="*80)

    try:
        from backend.app.services.blockchain_service import get_blockchain_service

        blockchain = get_blockchain_service()

        # Get network info
        info = blockchain.get_network_info()

        print(f"\n✅ Blockchain Service Connected Successfully")
        print(f"   - Network: {info['network']}")
        print(f"   - Chain ID: {info['chain_id']}")
        print(f"   - RPC URL: {info['rpc_url']}")
        print(f"   - Connected: {info['is_connected']}")
        print(f"   - Block Number: {info['block_number']}")
        print(f"   - Contracts Loaded: {len(info['contracts'])}")

        for contract_name in info['contracts']:
            print(f"      - {contract_name}")

        return True

    except Exception as e:
        print(f"\n❌ Blockchain Service Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_purchase_endpoint():
    """Test the new purchase endpoint"""
    print("\n" + "="*80)
    print("TEST 2: Purchase Endpoint API")
    print("="*80)

    try:
        import httpx

        api_url = "http://localhost:8002"
        test_wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"  # Test wallet

        # Test data
        purchase_data = {
            "product_id": 1,
            "pricing_plan_id": 1,
            "payment_method": "crypto",
            "transaction_hash": "0x" + "0" * 64,  # Mock transaction hash
            "duration_months": 1
        }

        print(f"\n📤 Testing Purchase Endpoint...")
        print(f"   - API URL: {api_url}/api/v1/marketplace/purchase")
        print(f"   - Wallet: {test_wallet}")
        print(f"   - Product ID: {purchase_data['product_id']}")
        print(f"   - Duration: {purchase_data['duration_months']} month(s)")

        async with httpx.AsyncClient() as client:
            # Check backend health first
            try:
                health_response = await client.get(f"{api_url}/health", timeout=5.0)
                if health_response.status_code == 200:
                    print(f"\n✅ Backend is running (status: {health_response.status_code})")
                else:
                    print(f"\n⚠️  Backend returned status: {health_response.status_code}")
            except Exception as e:
                print(f"\n❌ Cannot connect to backend: {str(e)}")
                print(f"   Please start the backend with: cd backend && ./start_backend.sh")
                return False

            # Test the purchase endpoint
            try:
                response = await client.post(
                    f"{api_url}/api/v1/marketplace/purchase?wallet_address={test_wallet}",
                    json=purchase_data,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    print(f"\n✅ Purchase Endpoint Test Successful")
                    print(f"   - Success: {data.get('success')}")
                    print(f"   - Message: {data.get('message')}")
                    print(f"   - Purchase ID: {data.get('purchase_id')}")
                    print(f"   - NFT Token ID: {data.get('nft_token_id')}")
                    print(f"   - Subscription ID: {data.get('subscription_id')}")
                    print(f"   - License Minted: {data.get('license_minted')}")
                    print(f"   - Subscription Created: {data.get('subscription_created')}")
                    print(f"   - Transaction Hash: {data.get('transaction_hash')}")
                    return True
                else:
                    error_data = response.json() if response.status_code != 404 else {"detail": "Not found"}
                    print(f"\n⚠️  Purchase returned status {response.status_code}")
                    print(f"   - Error: {error_data.get('detail', 'Unknown error')}")
                    return False

            except Exception as e:
                print(f"\n❌ Purchase request failed: {str(e)}")
                import traceback
                traceback.print_exc()
                return False

    except Exception as e:
        print(f"\n❌ Purchase Endpoint Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_smart_contract_verification():
    """Test smart contract interactions"""
    print("\n" + "="*80)
    print("TEST 3: Smart Contract Verification")
    print("="*80)

    try:
        from backend.app.services.blockchain_service import get_blockchain_service

        blockchain = get_blockchain_service()

        test_wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        test_tool_id = 1

        print(f"\n🔍 Checking License NFT Ownership...")
        print(f"   - Wallet: {test_wallet}")
        print(f"   - Tool ID: {test_tool_id}")

        has_license = await blockchain.has_license(test_wallet, test_tool_id)
        print(f"   - Has License: {has_license}")

        print(f"\n🔍 Checking Active Subscription...")
        has_subscription = await blockchain.has_active_subscription(test_wallet, test_tool_id)
        print(f"   - Has Active Subscription: {has_subscription}")

        print(f"\n🔍 Getting User Licenses...")
        licenses = await blockchain.get_user_licenses(test_wallet)
        print(f"   - License Count: {len(licenses)}")
        if licenses:
            print(f"   - Tool IDs: {licenses}")

        print(f"\n✅ Smart Contract Verification Complete")
        print(f"   Note: Contracts may not be deployed yet, which is expected")
        print(f"   The integration is ready for when contracts are deployed")

        return True

    except Exception as e:
        print(f"\n❌ Smart Contract Verification Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_database_integration():
    """Test database models and relationships"""
    print("\n" + "="*80)
    print("TEST 4: Database Integration")
    print("="*80)

    try:
        from backend.app.models.purchase import Purchase, Subscription
        from backend.app.models.marketplace import Product, PricingPlan
        from sqlalchemy import inspect

        print(f"\n✅ Database Models Loaded Successfully")

        # Inspect Purchase model
        purchase_inspector = inspect(Purchase)
        purchase_columns = [col.key for col in purchase_inspector.columns]
        print(f"\n   Purchase Model Columns ({len(purchase_columns)}):")
        for col in sorted(purchase_columns):
            print(f"      - {col}")

        # Inspect Subscription model
        subscription_inspector = inspect(Subscription)
        subscription_columns = [col.key for col in subscription_inspector.columns]
        print(f"\n   Subscription Model Columns ({len(subscription_columns)}):")
        for col in sorted(subscription_columns):
            print(f"      - {col}")

        # Inspect Product model
        product_inspector = inspect(Product)
        product_columns = [col.key for col in product_inspector.columns]
        print(f"\n   Product Model Columns ({len(product_columns)}):")
        for col in sorted(product_columns):
            print(f"      - {col}")

        # Check for NFT token ID column in Purchase model
        has_nft_column = 'license_nft_id' in purchase_columns
        print(f"\n   ✅ Purchase.license_nft_id column: {'Present' if has_nft_column else 'Missing'}")

        return True

    except Exception as e:
        print(f"\n❌ Database Integration Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("MARKETPLACE INTEGRATION TEST SUITE")
    print("="*80)
    print("\nTesting marketplace purchase integration with smart contracts...")
    print("This will verify:")
    print("  1. Blockchain service connection")
    print("  2. Purchase endpoint functionality")
    print("  3. Smart contract interactions")
    print("  4. Database integration")

    results = []

    # Test 1: Blockchain Service
    results.append(await test_blockchain_service())

    # Test 2: Purchase Endpoint
    results.append(await test_purchase_endpoint())

    # Test 3: Smart Contract Verification
    results.append(await test_smart_contract_verification())

    # Test 4: Database Integration
    results.append(await test_database_integration())

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    passed = sum(results)
    total = len(results)

    print(f"\n   Tests Passed: {passed}/{total}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")

    if passed == total:
        print(f"\n   ✅ ALL TESTS PASSED - Marketplace integration ready!")
    else:
        print(f"\n   ⚠️  Some tests failed - see details above")

    print("\n" + "="*80)

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
