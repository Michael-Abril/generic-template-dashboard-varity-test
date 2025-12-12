#!/usr/bin/env python3
"""
Seed only products (categories already exist)
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.models.marketplace import Category, Product, PricingPlan
from datetime import datetime

async def seed_products(session: AsyncSession):
    """Seed products into marketplace"""

    # Get existing categories
    result = await session.execute(select(Category))
    categories = {cat.slug: cat for cat in result.scalars().all()}

    if not categories:
        print("❌ No categories found. Run full seed script first.")
        return

    # Define products to add
    products_data = [
        # Accounting category
        {
            "name": "QuickBooks Online",
            "slug": "quickbooks-online",
            "category": "accounting",
            "description": "Complete accounting solution for small businesses",
            "logo_url": "https://quickbooks.intuit.com/logo.png",
            "vendor": "Intuit",
            "features": ["Invoice Management", "Expense Tracking", "Tax Preparation", "Financial Reporting"],
            "starting_price": 15.0,
            "oauth_integration": True
        },
        {
            "name": "Xero",
            "slug": "xero",
            "category": "accounting",
            "description": "Cloud accounting software for small businesses",
            "logo_url": "https://xero.com/logo.png",
            "vendor": "Xero",
            "features": ["Bank Reconciliation", "Invoicing", "Inventory", "Payroll"],
            "starting_price": 13.0,
            "oauth_integration": True
        },
        # Payment Processing
        {
            "name": "Stripe",
            "slug": "stripe",
            "category": "payment-processing",
            "description": "Modern payment infrastructure for the internet",
            "logo_url": "https://stripe.com/logo.png",
            "vendor": "Stripe",
            "features": ["Payment Processing", "Subscriptions", "Invoicing", "Revenue Recognition"],
            "starting_price": 0.0,
            "oauth_integration": True
        },
        {
            "name": "Square",
            "slug": "square",
            "category": "payment-processing",
            "description": "Payment processing and business management",
            "logo_url": "https://square.com/logo.png",
            "vendor": "Square",
            "features": ["POS System", "Online Payments", "Inventory Management", "Customer Directory"],
            "starting_price": 0.0,
            "oauth_integration": True
        },
        # CRM
        {
            "name": "Salesforce",
            "slug": "salesforce",
            "category": "crm",
            "description": "World's #1 CRM platform",
            "logo_url": "https://salesforce.com/logo.png",
            "vendor": "Salesforce",
            "features": ["Lead Management", "Opportunity Tracking", "Sales Analytics", "Email Integration"],
            "starting_price": 25.0,
            "oauth_integration": True
        },
        {
            "name": "HubSpot CRM",
            "slug": "hubspot",
            "category": "crm",
            "description": "Free CRM with premium features",
            "logo_url": "https://hubspot.com/logo.png",
            "vendor": "HubSpot",
            "features": ["Contact Management", "Email Tracking", "Meeting Scheduling", "Live Chat"],
            "starting_price": 0.0,
            "oauth_integration": True
        },
        # E-commerce
        {
            "name": "Shopify",
            "slug": "shopify",
            "category": "ecommerce",
            "description": "Complete e-commerce platform",
            "logo_url": "https://shopify.com/logo.png",
            "vendor": "Shopify",
            "features": ["Online Store", "POS", "Inventory", "Marketing Tools"],
            "starting_price": 29.0,
            "oauth_integration": True
        },
        # Communication
        {
            "name": "Slack",
            "slug": "slack",
            "category": "communication",
            "description": "Business communication hub",
            "logo_url": "https://slack.com/logo.png",
            "vendor": "Slack",
            "features": ["Team Messaging", "File Sharing", "Video Calls", "App Integration"],
            "starting_price": 0.0,
            "oauth_integration": True
        },
        # Project Management
        {
            "name": "Monday.com",
            "slug": "monday",
            "category": "project-management",
            "description": "Work operating system for teams",
            "logo_url": "https://monday.com/logo.png",
            "vendor": "Monday.com",
            "features": ["Task Management", "Timeline View", "Automation", "Reporting"],
            "starting_price": 8.0,
            "oauth_integration": True
        },
        # Marketing
        {
            "name": "Mailchimp",
            "slug": "mailchimp",
            "category": "marketing",
            "description": "Email marketing and automation",
            "logo_url": "https://mailchimp.com/logo.png",
            "vendor": "Intuit",
            "features": ["Email Campaigns", "Automation", "Analytics", "Landing Pages"],
            "starting_price": 0.0,
            "oauth_integration": True
        },
        # Customer Support
        {
            "name": "Zendesk",
            "slug": "zendesk",
            "category": "customer-support",
            "description": "Customer service software",
            "logo_url": "https://zendesk.com/logo.png",
            "vendor": "Zendesk",
            "features": ["Ticket System", "Knowledge Base", "Live Chat", "Analytics"],
            "starting_price": 19.0,
            "oauth_integration": True
        },
        # Cloud Storage
        {
            "name": "Google Workspace",
            "slug": "google-workspace",
            "category": "cloud-storage",
            "description": "Productivity and collaboration tools",
            "logo_url": "https://workspace.google.com/logo.png",
            "vendor": "Google",
            "features": ["Email", "Cloud Storage", "Docs", "Video Conferencing"],
            "starting_price": 6.0,
            "oauth_integration": True
        },
    ]

    # Add products
    for product_data in products_data:
        # Skip if product already exists
        existing = await session.execute(
            select(Product).where(Product.slug == product_data['slug'])
        )
        if existing.scalar_one_or_none():
            print(f"   ⏭️  Product '{product_data['name']}' already exists")
            continue

        category = categories.get(product_data['category'])
        if not category:
            print(f"   ❌ Category '{product_data['category']}' not found")
            continue

        product = Product(
            name=product_data['name'],
            slug=product_data['slug'],
            category=category.slug,  # Use slug, not id
            description=product_data['description'],
            logo_url=product_data['logo_url'],
            developer=product_data['vendor'],  # Field is called developer, not vendor
            has_adapter=product_data['oauth_integration'],  # Field for integration support
            active=True  # Field is called active, not is_active
        )
        session.add(product)
        print(f"   ✅ Added product: {product_data['name']}")

    await session.commit()
    print(f"\n✅ Products seeded successfully!")

async def main():
    """Main function"""
    print("=" * 70)
    print("🌱 MARKETPLACE PRODUCTS SEED")
    print("=" * 70)

    # Initialize database
    print("\n🔧 Initializing database...")
    await init_db()
    print("   ✅ Database initialized")

    # Seed products
    print("\n📦 Seeding products...")
    async with AsyncSessionLocal() as session:
        await seed_products(session)

    print("\n✅ Seed complete!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())