"""
Marketplace Database Seed Script

Populates the database with authentic product data, pricing tiers, and features
based on real-world 2025 pricing research.

Usage:
    python -m scripts.seed_marketplace
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal, init_db
from app.models.marketplace import (
    Category, Product, PricingPlan, PlanFeature, PlanLimit,
    DataSyncType, PricingModel
)
from scripts.marketplace_data import PRODUCTS_DATA


# =====================================================================
# CATEGORY DATA
# =====================================================================

CATEGORIES = [
    {
        "name": "Accounting",
        "slug": "accounting",
        "icon": "calculator",
        "description": "Financial management and bookkeeping software",
        "sort_order": 1
    },
    {
        "name": "CRM",
        "slug": "crm",
        "icon": "users",
        "description": "Customer relationship management platforms",
        "sort_order": 2
    },
    {
        "name": "E-commerce",
        "slug": "e-commerce",
        "icon": "shopping-cart",
        "description": "Online store and sales platforms",
        "sort_order": 3
    },
    {
        "name": "Communication",
        "slug": "communication",
        "icon": "message-circle",
        "description": "Team messaging and collaboration tools",
        "sort_order": 4
    },
    {
        "name": "Project Management",
        "slug": "project-management",
        "icon": "check-square",
        "description": "Task and project tracking software",
        "sort_order": 5
    },
    {
        "name": "Payments",
        "slug": "payments",
        "icon": "credit-card",
        "description": "Payment processing and financial infrastructure",
        "sort_order": 6
    },
    {
        "name": "Marketing",
        "slug": "marketing",
        "icon": "trending-up",
        "description": "Marketing automation and email campaigns",
        "sort_order": 7
    },
    {
        "name": "Customer Support",
        "slug": "customer-support",
        "icon": "headphones",
        "description": "Help desk and customer service platforms",
        "sort_order": 8
    },
    {
        "name": "Productivity",
        "slug": "productivity",
        "icon": "briefcase",
        "description": "Office productivity and collaboration suites",
        "sort_order": 9
    },
    {
        "name": "Documents",
        "slug": "documents",
        "icon": "file-text",
        "description": "Document management and e-signature tools",
        "sort_order": 10
    },
    {
        "name": "Storage",
        "slug": "storage",
        "icon": "hard-drive",
        "description": "Cloud file storage and sharing",
        "sort_order": 11
    },
    {
        "name": "Payroll & HR",
        "slug": "payroll-hr",
        "icon": "users",
        "description": "Payroll processing and human resources management",
        "sort_order": 12
    },
    {
        "name": "Scheduling",
        "slug": "scheduling",
        "icon": "calendar",
        "description": "Appointment booking and scheduling tools",
        "sort_order": 13
    },
    {
        "name": "Design",
        "slug": "design",
        "icon": "image",
        "description": "Graphic design and creative tools",
        "sort_order": 14
    },
    {
        "name": "Point of Sale",
        "slug": "pos",
        "icon": "shopping-bag",
        "description": "Point of sale and retail management systems",
        "sort_order": 15
    }
]


# Product data imported from marketplace_data.py

async def seed_categories(session):
    """Seed product categories"""
    print("📁 Seeding categories...")
    for cat_data in CATEGORIES:
        category = Category(**cat_data)
        session.add(category)
    await session.commit()
    print(f"   ✅ Created {len(CATEGORIES)} categories")


async def seed_product(session, product_data):
    """Seed a single product with all its pricing and features"""
    # Create product
    product = Product(**product_data["product"])
    session.add(product)
    await session.flush()  # Get product.id

    # Create pricing plans
    plans_map = {}
    for plan_data in product_data["pricing_plans"]:
        plan = PricingPlan(product_id=product.id, **plan_data)
        session.add(plan)
        await session.flush()
        plans_map[plan_data["tier"]] = plan

    # Create features for each plan
    if "features" in product_data:
        for tier, features_list in product_data["features"].items():
            plan = plans_map.get(tier)
            if plan:
                for idx, feature_text in enumerate(features_list):
                    feature = PlanFeature(
                        plan_id=plan.id,
                        product_id=product.id,
                        feature_text=feature_text,
                        sort_order=idx
                    )
                    session.add(feature)

    # Create limits for each plan
    if "limits" in product_data:
        for tier, limits_dict in product_data["limits"].items():
            plan = plans_map.get(tier)
            if plan:
                for idx, (key, value) in enumerate(limits_dict.items()):
                    limit = PlanLimit(
                        plan_id=plan.id,
                        limit_key=key,
                        limit_value=value,
                        is_unlimited=(value.lower() == "unlimited"),
                        sort_order=idx
                    )
                    session.add(limit)

    # Create data sync types
    if "data_sync" in product_data:
        for idx, sync_type in enumerate(product_data["data_sync"]):
            data_sync = DataSyncType(
                product_id=product.id,
                sync_type=sync_type,
                sort_order=idx
            )
            session.add(data_sync)

    await session.commit()
    print(f"   ✅ Created {product.name} with {len(product_data['pricing_plans'])} plans")


async def main():
    """Main seed function"""
    print("\n" + "="*70)
    print("🌱 MARKETPLACE DATABASE SEED")
    print("="*70 + "\n")

    # Initialize database
    print("🔧 Initializing database...")
    await init_db()
    print("   ✅ Database initialized\n")

    async with AsyncSessionLocal() as session:
        try:
            # Seed categories
            await seed_categories(session)
            print()

            # Seed all products
            print("📦 Seeding products...")
            for idx, product_data in enumerate(PRODUCTS_DATA, 1):
                await seed_product(session, product_data)

            print(f"\n   ✅ Successfully seeded {len(PRODUCTS_DATA)} products\n")

            print("="*70)
            print("✅ SEED COMPLETED SUCCESSFULLY")
            print(f"   📊 Total: {len(CATEGORIES)} categories, {len(PRODUCTS_DATA)} products")
            print("="*70 + "\n")

        except Exception as e:
            print(f"\n❌ Error during seed: {str(e)}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
