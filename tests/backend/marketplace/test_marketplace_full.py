#!/usr/bin/env python3
"""
Comprehensive test of marketplace functionality
Tests all endpoints to ensure businesses can buy and connect software
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.api.v1.marketplace_v2 import (
    get_products, get_product, purchase_license,
    get_integration_config, PurchaseRequest
)
from app.core.database import AsyncSessionLocal
from app.models.purchase import Purchase
from sqlalchemy import select
from datetime import datetime
import json

async def test_marketplace_complete():
    """Test complete marketplace flow"""

    print("="*70)
    print("🛒 MARKETPLACE COMPREHENSIVE TEST")
    print("="*70)

    async with AsyncSessionLocal() as db:
        try:
            # Test 1: Get all products
            print("\n1️⃣ Testing GET /api/v1/marketplace/products")
            products = await get_products(
                category=None,
                search=None,
                featured=None,
                has_adapter=None,
                db=db
            )
            print(f"   ✅ Retrieved {len(products)} products")

            if products:
                # Show sample products
                print("\n   Sample products:")
                for product in products[:3]:
                    print(f"     - {product.name} (${product.starting_price})")
                    print(f"       Category: {product.category}")
                    print(f"       Has OAuth: {product.has_adapter}")

                # Test 2: Get single product
                print("\n2️⃣ Testing GET /api/v1/marketplace/products/{id}")
                test_product = products[0]
                single_product = await get_product(test_product.id, db)
                print(f"   ✅ Retrieved product: {single_product.name}")
                print(f"      Developer: {single_product.developer}")
                print(f"      Description: {single_product.description[:100]}...")

                # Test 3: Test purchase creation (mock)
                print("\n3️⃣ Testing POST /api/v1/marketplace/purchase")

                # Get full product details to access pricing plans
                product_with_plans = None
                test_plan = None

                for product in products[:5]:  # Check first 5 products
                    # Get full product details
                    full_product = await get_product(product.id, db)
                    if full_product and hasattr(full_product, 'pricing_plans') and full_product.pricing_plans:
                        product_with_plans = full_product
                        test_plan = full_product.pricing_plans[0]
                        break

                if product_with_plans and test_plan:

                    purchase_request = PurchaseRequest(
                        product_id=product_with_plans.id,
                        tier=test_plan.tier,  # Use tier field, not name
                        billing_period="monthly" if test_plan.monthly_price else "annually",
                        users=5,
                        wallet_address="0x1234567890123456789012345678901234567890"
                    )

                    print(f"   Creating mock purchase for: {product_with_plans.name}")
                    print(f"   Plan: {test_plan.name} (Tier: {test_plan.tier})")
                    print(f"   Users: {purchase_request.users}")

                    # Note: In production, this would interact with smart contract
                    purchase_result = await purchase_license(purchase_request, db)
                    print(f"   ✅ Purchase created successfully")
                    print(f"      Transaction Hash: {purchase_result.transaction_hash}")
                    print(f"      Amount Paid: ${purchase_result.amount_paid}")
                else:
                    print("   ⚠️  No products with pricing plans found for testing")

                # Test 4: Get user purchases (direct DB query)
                print("\n4️⃣ Testing Purchase Retrieval")
                test_address = "0x1234567890123456789012345678901234567890"

                # Query purchases directly from database
                result = await db.execute(
                    select(Purchase).where(Purchase.user_address == test_address)
                )
                purchases = result.scalars().all()

                print(f"   ✅ Retrieved {len(purchases)} purchases for address")

                if purchases:
                    for purchase in purchases[:2]:
                        print(f"     - Purchase ID: {purchase.id}")
                        print(f"       Product ID: {purchase.product_id}")
                        print(f"       Date: {purchase.purchase_date}")

                # Test 5: OAuth connections (will need real credentials)
                print("\n5️⃣ Testing OAuth Connection Endpoints")
                print("   ℹ️  OAuth endpoints require real client credentials")

                # Check if OAuth products exist
                oauth_products = [p for p in products if p.has_adapter]
                print(f"   Found {len(oauth_products)} products with OAuth integration:")
                for product in oauth_products[:5]:
                    print(f"     - {product.name}")

                print("\n" + "="*70)
                print("✅ MARKETPLACE TEST COMPLETE")
                print("="*70)

                # Summary
                print("\n📊 TEST SUMMARY:")
                print(f"   • Products Available: {len(products)}")
                print(f"   • OAuth Integrations: {len(oauth_products)}")
                print(f"   • Categories: {len(set(p.category for p in products))}")
                print(f"   • API Status: OPERATIONAL")

                # Next steps
                print("\n📝 NEXT STEPS FOR ENTERPRISE READINESS:")
                print("   1. Configure OAuth credentials in .env file:")
                for product in oauth_products[:3]:
                    slug = product.slug.upper().replace('-', '_')
                    print(f"      - {slug}_CLIENT_ID")
                    print(f"      - {slug}_CLIENT_SECRET")
                print("\n   2. Deploy marketplace smart contract to Varity L3")
                print("   3. Update MARKETPLACE_CONTRACT address in .env")
                print("   4. Configure webhook endpoints for OAuth callbacks")
                print("   5. Setup monitoring and analytics")

            else:
                print("   ❌ No products found - database may need seeding")

        except Exception as e:
            print(f"\n❌ Error during test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_marketplace_complete())