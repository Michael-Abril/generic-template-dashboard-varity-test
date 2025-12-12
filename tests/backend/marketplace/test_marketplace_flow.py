#!/usr/bin/env python3
"""
Test Marketplace Purchase and Integration Flow

This script tests the complete marketplace flow:
1. Browse products
2. Make a purchase
3. View purchases
4. Connect integration (mock OAuth)
5. Check integration status

Run with: python test_marketplace_flow.py
"""

import asyncio
import httpx
import json
from datetime import datetime
from typing import Optional

# Test configuration
BASE_URL = "http://localhost:8001"
TEST_WALLET = "0x742d35cc6634c0532925a3b844bc9e7595f0beb2"  # Example wallet


class MarketplaceTestSuite:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL)
        self.wallet_address = TEST_WALLET

    async def test_browse_products(self):
        """Test browsing marketplace products"""
        print("\n🔍 Testing: Browse Products")
        print("-" * 50)

        response = await self.client.get("/api/v1/marketplace/products")

        if response.status_code == 200:
            products = response.json()
            print(f"✅ Found {len(products)} products")

            # Display first 3 products
            for product in products[:3]:
                print(f"  - {product['name']} ({product['category']})")
                print(f"    Starting at ${product['starting_price']}/mo")

            return products
        else:
            print(f"❌ Failed to fetch products: {response.status_code}")
            return []

    async def test_get_pricing(self, product_id: int):
        """Test getting product pricing details"""
        print(f"\n💰 Testing: Get Pricing for Product {product_id}")
        print("-" * 50)

        response = await self.client.get(f"/api/v1/marketplace/products/{product_id}/pricing")

        if response.status_code == 200:
            pricing = response.json()
            print(f"✅ Product: {pricing['product_name']}")
            print(f"  Plans available: {len(pricing['plans'])}")

            for plan in pricing['plans'][:2]:
                print(f"  - {plan['name']}: ${plan['base_price']}/{plan['billing_period']}")

            return pricing
        else:
            print(f"❌ Failed to fetch pricing: {response.status_code}")
            return None

    async def test_purchase_product(self, product_id: int):
        """Test purchasing a product"""
        print(f"\n🛒 Testing: Purchase Product {product_id}")
        print("-" * 50)

        purchase_data = {
            "wallet_address": self.wallet_address,
            "product_id": product_id,
            "tier": "Professional",
            "billing_period": "monthly",
            "user_count": 5
        }

        response = await self.client.post(
            "/api/v1/marketplace/purchase",
            json=purchase_data
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Purchase successful!")
            print(f"  License ID: {result.get('license_id')}")
            print(f"  Amount: ${result.get('amount_paid')} {result.get('currency')}")
            print(f"  Transaction: {result.get('transaction_hash')[:20]}...")
            return result
        else:
            print(f"❌ Purchase failed: {response.status_code}")
            print(f"  Error: {response.text}")
            return None

    async def test_view_purchases(self):
        """Test viewing user purchases"""
        print(f"\n📦 Testing: View My Purchases")
        print("-" * 50)

        response = await self.client.get(
            f"/api/v1/marketplace/my-purchases",
            params={"wallet_address": self.wallet_address}
        )

        if response.status_code == 200:
            purchases = response.json()
            print(f"✅ Found {len(purchases)} purchases")

            for purchase in purchases:
                print(f"  - {purchase['product_name']} ({purchase['pricing_plan']})")
                print(f"    Purchased: {purchase['purchase_date']}")
                print(f"    Active: {purchase['is_active']}")
                print(f"    Connected: {purchase['has_oauth_connection']}")

            return purchases
        else:
            print(f"❌ Failed to fetch purchases: {response.status_code}")
            return []

    async def test_view_integrations(self):
        """Test viewing integration status"""
        print(f"\n🔌 Testing: View My Integrations")
        print("-" * 50)

        response = await self.client.get(
            f"/api/v1/marketplace/my-integrations",
            params={"wallet_address": self.wallet_address}
        )

        if response.status_code == 200:
            integrations = response.json()
            print(f"✅ Found {len(integrations)} integrations")

            for integration in integrations:
                status = "✅ Connected" if integration['is_connected'] else "❌ Not Connected"
                print(f"  - {integration['product_name']}: {status}")
                if integration['is_connected']:
                    print(f"    Account: {integration.get('account_name', 'N/A')}")
                    print(f"    Last Sync: {integration.get('last_sync', 'Never')}")

            return integrations
        else:
            print(f"❌ Failed to fetch integrations: {response.status_code}")
            return []

    async def test_connect_integration(self, product_id: int):
        """Test connecting an integration (mock)"""
        print(f"\n🔗 Testing: Connect Integration for Product {product_id}")
        print("-" * 50)

        connect_data = {
            "product_id": product_id,
            "access_token": "mock_access_token_" + str(product_id),
            "refresh_token": "mock_refresh_token_" + str(product_id),
            "account_name": "Test Company",
            "account_email": "test@example.com"
        }

        response = await self.client.post(
            f"/api/v1/marketplace/connect-integration",
            params={"wallet_address": self.wallet_address},
            json=connect_data
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Integration connected successfully!")
            print(f"  Message: {result.get('message')}")
            return result
        else:
            print(f"❌ Failed to connect integration: {response.status_code}")
            print(f"  Error: {response.text}")
            return None

    async def test_check_subscriptions(self):
        """Test viewing active subscriptions"""
        print(f"\n💳 Testing: View My Subscriptions")
        print("-" * 50)

        response = await self.client.get(
            f"/api/v1/marketplace/my-subscriptions",
            params={"wallet_address": self.wallet_address}
        )

        if response.status_code == 200:
            subscriptions = response.json()
            print(f"✅ Found {len(subscriptions)} active subscriptions")

            for sub in subscriptions:
                print(f"  - {sub['product_name']} ({sub['plan_name']})")
                print(f"    Status: {sub['status']}")
                print(f"    Amount: ${sub['amount']} {sub['currency']}")
                print(f"    Next billing: {sub.get('next_billing_date', 'N/A')}")

            return subscriptions
        else:
            print(f"❌ Failed to fetch subscriptions: {response.status_code}")
            return []

    async def run_full_test(self):
        """Run complete marketplace test flow"""
        print("=" * 60)
        print("🚀 MARKETPLACE INTEGRATION TEST SUITE")
        print("=" * 60)
        print(f"Testing with wallet: {self.wallet_address}")

        try:
            # 1. Browse products
            products = await self.test_browse_products()

            if products:
                # Use first product for testing
                test_product = products[0]
                product_id = test_product['id']

                # 2. Get pricing details
                pricing = await self.test_get_pricing(product_id)

                # 3. Make a purchase
                purchase_result = await self.test_purchase_product(product_id)

                if purchase_result:
                    # 4. View purchases
                    await asyncio.sleep(1)  # Small delay for database
                    await self.test_view_purchases()

                    # 5. Connect integration
                    await self.test_connect_integration(product_id)

                    # 6. Check integration status
                    await asyncio.sleep(1)
                    await self.test_view_integrations()

                    # 7. Check subscriptions
                    await self.test_check_subscriptions()

            print("\n" + "=" * 60)
            print("✅ TEST SUITE COMPLETED")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ Test suite failed with error: {e}")
        finally:
            await self.client.aclose()


async def main():
    """Run the test suite"""
    tester = MarketplaceTestSuite()
    await tester.run_full_test()


if __name__ == "__main__":
    print("Starting Marketplace Test Suite...")
    asyncio.run(main())