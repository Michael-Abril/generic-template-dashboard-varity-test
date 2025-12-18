#!/usr/bin/env python3
"""
Database Migration: Create Purchase Tables

This script creates the new database tables for purchase tracking:
- purchases: Track software purchases and NFT licenses
- subscriptions: Manage recurring subscriptions
- oauth_tokens: Store OAuth tokens for integrations
- sync_logs: Track data synchronization history
- integration_configs: User-specific integration settings

Run this script to update your database schema.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine, Base
from app.models.purchase import (
    Purchase,
    Subscription,
    OAuthToken,
    SyncLog,
    IntegrationConfig
)


async def create_tables():
    """Create new database tables"""
    print("Creating purchase-related database tables...")

    try:
        # Create all tables defined in the models
        async with engine.begin() as conn:
            # Import all models to ensure they're registered with Base
            from app.models import (
                Category, Product, PricingPlan, PlanFeature, PlanLimit,
                UserSettings, APIKey
            )

            # Create new tables (won't affect existing ones)
            await conn.run_sync(Base.metadata.create_all)

            print("✅ Database tables created successfully!")

            # Verify tables were created
            result = await conn.execute(text("""
                SELECT name FROM sqlite_master
                WHERE type='table'
                ORDER BY name;
            """))
            tables = result.fetchall()

            print("\nExisting database tables:")
            for table in tables:
                print(f"  - {table[0]}")

            # Check specifically for new tables
            new_tables = ['purchases', 'subscriptions', 'oauth_tokens', 'sync_logs', 'integration_configs']
            existing_new_tables = [t[0] for t in tables if t[0] in new_tables]

            if existing_new_tables:
                print(f"\n✅ Successfully created {len(existing_new_tables)} new tables:")
                for table in existing_new_tables:
                    print(f"  - {table}")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise


async def verify_schema():
    """Verify the schema of created tables"""
    print("\nVerifying table schemas...")

    async with engine.begin() as conn:
        # Check purchases table columns
        result = await conn.execute(text("PRAGMA table_info(purchases);"))
        columns = result.fetchall()

        if columns:
            print("\nPurchases table schema:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")

        # Check oauth_tokens table columns
        result = await conn.execute(text("PRAGMA table_info(oauth_tokens);"))
        columns = result.fetchall()

        if columns:
            print("\nOAuth Tokens table schema:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")


async def main():
    """Run migration"""
    print("=" * 50)
    print("Purchase Tables Migration")
    print("=" * 50)

    try:
        await create_tables()
        await verify_schema()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())