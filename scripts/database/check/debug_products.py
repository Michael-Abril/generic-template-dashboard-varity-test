#!/usr/bin/env python3
"""Debug why products aren't being returned by API"""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine
from app.models.marketplace import Product, Category, PricingPlan

async def debug_products():
    """Debug products query"""
    print("Debugging products query...\n")

    async with AsyncSessionLocal() as session:
        # Test 1: Count products
        result = await session.execute(select(Product))
        products = result.scalars().all()
        print(f"Total products in database: {len(products)}")

        # Test 2: Count active products
        result = await session.execute(select(Product).where(Product.active == True))
        active_products = result.scalars().all()
        print(f"Active products: {len(active_products)}")

        # Test 3: Show sample products
        if products:
            print("\nSample products:")
            for p in products[:5]:
                print(f"  ID: {p.id}, Name: {p.name}, Slug: {p.slug}, Active: {p.active}, Category: {p.category}")

        # Test 4: Check categories
        result = await session.execute(select(Category))
        categories = result.scalars().all()
        print(f"\nTotal categories: {len(categories)}")

        # Test 5: Check pricing plans
        result = await session.execute(select(PricingPlan))
        plans = result.scalars().all()
        print(f"Total pricing plans: {len(plans)}")

        # Test 6: Try the exact query from the API
        print("\n\nTrying API query...")
        from sqlalchemy.orm import selectinload
        from sqlalchemy import and_, or_

        query = select(Product).options(
            selectinload(Product.pricing_plans)
        ).where(Product.active == True)

        result = await session.execute(query.order_by(Product.name))
        api_products = result.scalars().all()
        print(f"Products returned by API query: {len(api_products)}")

        if api_products:
            print("\nSample API product:")
            p = api_products[0]
            print(f"  ID: {p.id}")
            print(f"  Name: {p.name}")
            print(f"  Slug: {p.slug}")
            print(f"  Active: {p.active}")
            print(f"  Pricing Plans: {len(p.pricing_plans)}")

if __name__ == "__main__":
    asyncio.run(debug_products())
