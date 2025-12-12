#!/usr/bin/env python3
"""
Direct test of products API to debug the issue
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models.marketplace import Product

async def test_products():
    """Test products directly"""

    async with AsyncSessionLocal() as db:
        try:
            print("Testing direct database query...")

            # Same query as the API endpoint
            query = select(Product).options(
                selectinload(Product.pricing_plans)
            ).where(Product.active == True)

            result = await db.execute(query.order_by(Product.name))
            products = result.scalars().all()

            print(f"Found {len(products)} products")

            for product in products[:3]:
                print(f"\nProduct: {product.name}")
                print(f"  ID: {product.id}")
                print(f"  Slug: {product.slug}")
                print(f"  Developer: {product.developer}")
                print(f"  Category: {product.category}")
                print(f"  Active: {product.active}")
                print(f"  Has Adapter: {product.has_adapter}")

                # Check pricing model
                if hasattr(product, 'pricing_model') and product.pricing_model:
                    print(f"  Pricing Model: {product.pricing_model}")
                    try:
                        print(f"  Pricing Model Value: {product.pricing_model.value}")
                    except Exception as e:
                        print(f"  Error getting pricing model value: {e}")
                else:
                    print("  Pricing Model: Not set")

                # Check pricing plans
                print(f"  Pricing Plans: {len(product.pricing_plans)}")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_products())