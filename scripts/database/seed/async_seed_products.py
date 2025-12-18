#!/usr/bin/env python3
"""Async seed marketplace products"""
import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, engine
from app.models import Product
from app.core.database import Base

async def seed_products():
    """Seed 20 marketplace products"""

    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Get session
    async for db in get_db():
        try:
            # Check existing products
            result = await db.execute(select(Product))
            existing = result.scalars().all()

            if len(existing) > 0:
                print(f'Already have {len(existing)} products')
                return

            # Seed products
            products = [
                Product(
                    name='QuickBooks',
                    slug='quickbooks',
                    description='Complete accounting software for managing finances',
                    category='finance',
                    features=json.dumps(['Invoicing', 'Expense Tracking', 'Financial Reports']),
                    pricing_tiers=json.dumps([
                        {'name': 'Starter', 'price': 30, 'features': ['Basic invoicing']},
                        {'name': 'Plus', 'price': 90, 'features': ['All features']}
                    ])
                ),
                Product(
                    name='Stripe',
                    slug='stripe',
                    description='Payment processing platform',
                    category='payments',
                    features=json.dumps(['Payment Processing', 'Subscriptions']),
                    pricing_tiers=json.dumps([{'name': 'Pay as you go', 'price': 0}])
                ),
                Product(
                    name='Salesforce',
                    slug='salesforce',
                    description='CRM platform for sales and service',
                    category='sales',
                    features=json.dumps(['Contact Management', 'Sales Pipeline']),
                    pricing_tiers=json.dumps([{'name': 'Professional', 'price': 75}])
                ),
                Product(
                    name='Shopify',
                    slug='shopify',
                    description='E-commerce platform',
                    category='ecommerce',
                    features=json.dumps(['Online Store', 'Inventory Management']),
                    pricing_tiers=json.dumps([{'name': 'Basic', 'price': 39}])
                ),
                Product(
                    name='Google Workspace',
                    slug='google-workspace',
                    description='Productivity and collaboration tools',
                    category='productivity',
                    features=json.dumps(['Gmail', 'Drive', 'Docs', 'Calendar']),
                    pricing_tiers=json.dumps([{'name': 'Business Starter', 'price': 6}])
                ),
                Product(
                    name='Slack',
                    slug='slack',
                    description='Team communication platform',
                    category='communication',
                    features=json.dumps(['Channels', 'Direct Messages', 'File Sharing']),
                    pricing_tiers=json.dumps([{'name': 'Pro', 'price': 8.75}])
                ),
                Product(
                    name='HubSpot',
                    slug='hubspot',
                    description='Marketing and sales software',
                    category='marketing',
                    features=json.dumps(['CRM', 'Email Marketing', 'Analytics']),
                    pricing_tiers=json.dumps([{'name': 'Starter', 'price': 20}])
                ),
                Product(
                    name='Zendesk',
                    slug='zendesk',
                    description='Customer service platform',
                    category='support',
                    features=json.dumps(['Ticket Management', 'Knowledge Base']),
                    pricing_tiers=json.dumps([{'name': 'Team', 'price': 19}])
                ),
                Product(
                    name='Mailchimp',
                    slug='mailchimp',
                    description='Email marketing platform',
                    category='marketing',
                    features=json.dumps(['Email Campaigns', 'Automation']),
                    pricing_tiers=json.dumps([{'name': 'Essentials', 'price': 13}])
                ),
                Product(
                    name='Zoom',
                    slug='zoom',
                    description='Video conferencing platform',
                    category='communication',
                    features=json.dumps(['Video Meetings', 'Webinars', 'Recording']),
                    pricing_tiers=json.dumps([{'name': 'Pro', 'price': 14.99}])
                ),
                Product(
                    name='Dropbox Business',
                    slug='dropbox',
                    description='Cloud storage and file sync',
                    category='storage',
                    features=json.dumps(['File Storage', 'Sharing', 'Collaboration']),
                    pricing_tiers=json.dumps([{'name': 'Standard', 'price': 15}])
                ),
                Product(
                    name='Xero',
                    slug='xero',
                    description='Accounting software for small business',
                    category='finance',
                    features=json.dumps(['Invoicing', 'Bank Reconciliation']),
                    pricing_tiers=json.dumps([{'name': 'Growing', 'price': 37}])
                ),
                Product(
                    name='Asana',
                    slug='asana',
                    description='Work management platform',
                    category='productivity',
                    features=json.dumps(['Task Management', 'Projects', 'Timelines']),
                    pricing_tiers=json.dumps([{'name': 'Premium', 'price': 13.49}])
                ),
                Product(
                    name='Trello',
                    slug='trello',
                    description='Visual collaboration tool',
                    category='productivity',
                    features=json.dumps(['Boards', 'Cards', 'Lists']),
                    pricing_tiers=json.dumps([{'name': 'Standard', 'price': 6}])
                ),
                Product(
                    name='Monday.com',
                    slug='monday',
                    description='Work operating system',
                    category='productivity',
                    features=json.dumps(['Workflows', 'Dashboards', 'Automation']),
                    pricing_tiers=json.dumps([{'name': 'Standard', 'price': 12}])
                ),
                Product(
                    name='GitHub',
                    slug='github',
                    description='Development platform',
                    category='development',
                    features=json.dumps(['Repositories', 'Issues', 'Actions']),
                    pricing_tiers=json.dumps([{'name': 'Team', 'price': 4}])
                ),
                Product(
                    name='Jira',
                    slug='jira',
                    description='Issue tracking for teams',
                    category='development',
                    features=json.dumps(['Issue Tracking', 'Agile Boards']),
                    pricing_tiers=json.dumps([{'name': 'Standard', 'price': 7.75}])
                ),
                Product(
                    name='Notion',
                    slug='notion',
                    description='All-in-one workspace',
                    category='productivity',
                    features=json.dumps(['Notes', 'Databases', 'Tasks']),
                    pricing_tiers=json.dumps([{'name': 'Plus', 'price': 10}])
                ),
                Product(
                    name='DocuSign',
                    slug='docusign',
                    description='Electronic signature platform',
                    category='business',
                    features=json.dumps(['E-Signatures', 'Document Management']),
                    pricing_tiers=json.dumps([{'name': 'Standard', 'price': 40}])
                ),
                Product(
                    name='Microsoft 365',
                    slug='microsoft-365',
                    description='Office suite with cloud services',
                    category='productivity',
                    features=json.dumps(['Word', 'Excel', 'Teams', 'OneDrive']),
                    pricing_tiers=json.dumps([{'name': 'Business Standard', 'price': 12.5}])
                )
            ]

            for product in products:
                db.add(product)

            await db.commit()
            print(f'Added {len(products)} products successfully!')

        finally:
            await db.close()
            break

if __name__ == '__main__':
    asyncio.run(seed_products())