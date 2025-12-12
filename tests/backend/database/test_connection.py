"""
Database Connection Tests

Tests database connectivity, table creation, and basic operations.
"""

import pytest
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, AsyncSessionLocal, Base, init_db, check_database_health
from app.models import (
    Category, Product, PricingPlan, UserSettings,
    Purchase, Subscription, OAuthToken
)


class TestDatabaseConnection:
    """Test basic database connectivity"""

    @pytest.mark.asyncio
    async def test_database_connection(self):
        """Test database connection works"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1

    @pytest.mark.asyncio
    async def test_database_health_check(self):
        """Test database health check function"""
        is_healthy = await check_database_health()
        assert is_healthy is True

    @pytest.mark.asyncio
    async def test_create_tables(self):
        """Test all tables can be created"""
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Verify tables exist
        async with engine.begin() as conn:
            def check_tables(connection):
                inspector = inspect(connection)
                tables = inspector.get_table_names()
                return tables

            tables = await conn.run_sync(check_tables)

        # Check all expected tables exist
        expected_tables = [
            'marketplace_categories',
            'marketplace_products',
            'marketplace_pricing_plans',
            'marketplace_plan_features',
            'marketplace_plan_limits',
            'marketplace_data_sync_types',
            'marketplace_product_addons',
            'user_settings',
            'api_keys',
            'purchases',
            'subscriptions',
            'oauth_tokens',
            'sync_logs',
            'integration_configs'
        ]

        for table in expected_tables:
            assert table in tables, f"Table {table} not found in database"

    @pytest.mark.asyncio
    async def test_database_session_commit(self):
        """Test database session can commit changes"""
        async with AsyncSessionLocal() as session:
            # Create a test category
            category = Category(
                name="Test Category",
                slug="test-category",
                icon="test-icon"
            )
            session.add(category)
            await session.commit()

            # Verify it was saved
            result = await session.execute(
                text("SELECT COUNT(*) FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "test-category"}
            )
            count = result.scalar()
            assert count == 1

            # Cleanup
            await session.execute(
                text("DELETE FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "test-category"}
            )
            await session.commit()

    @pytest.mark.asyncio
    async def test_database_session_rollback(self):
        """Test database session rollback works"""
        async with AsyncSessionLocal() as session:
            try:
                # Create a test category
                category = Category(
                    name="Rollback Test",
                    slug="rollback-test",
                    icon="test"
                )
                session.add(category)
                await session.flush()

                # Intentionally raise an error
                raise Exception("Test rollback")
            except Exception:
                await session.rollback()

            # Verify nothing was saved
            result = await session.execute(
                text("SELECT COUNT(*) FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "rollback-test"}
            )
            count = result.scalar()
            assert count == 0


class TestDatabaseIndexes:
    """Test database indexes are created correctly"""

    @pytest.mark.asyncio
    async def test_indexes_exist(self):
        """Verify all expected indexes exist"""
        async with engine.begin() as conn:
            def check_indexes(connection):
                inspector = inspect(connection)

                # Check indexes on marketplace_products
                product_indexes = inspector.get_indexes('marketplace_products')
                product_index_names = [idx['name'] for idx in product_indexes]

                expected_product_indexes = [
                    'ix_marketplace_products_slug',
                    'ix_marketplace_products_category',
                    'ix_marketplace_products_active',
                    'ix_marketplace_products_featured',
                    'idx_product_category_active'
                ]

                # Check indexes on purchases
                purchase_indexes = inspector.get_indexes('purchases')
                purchase_index_names = [idx['name'] for idx in purchase_indexes]

                expected_purchase_indexes = [
                    'ix_purchases_user_address',
                    'idx_user_product',
                    'idx_purchase_date'
                ]

                return product_index_names, purchase_index_names, expected_product_indexes, expected_purchase_indexes

            product_indexes, purchase_indexes, expected_product, expected_purchase = await conn.run_sync(check_indexes)

            # Verify product indexes
            for idx in expected_product:
                assert idx in product_indexes, f"Index {idx} not found on marketplace_products"

            # Verify purchase indexes
            for idx in expected_purchase:
                assert idx in purchase_indexes, f"Index {idx} not found on purchases"


class TestDatabaseModels:
    """Test database models work correctly"""

    @pytest.mark.asyncio
    async def test_create_category(self):
        """Test creating a category"""
        async with AsyncSessionLocal() as session:
            category = Category(
                name="Accounting",
                slug="accounting",
                icon="calculator",
                description="Financial software"
            )
            session.add(category)
            await session.commit()

            # Verify
            result = await session.execute(
                text("SELECT name FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "accounting"}
            )
            name = result.scalar()
            assert name == "Accounting"

            # Cleanup
            await session.execute(
                text("DELETE FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "accounting"}
            )
            await session.commit()

    @pytest.mark.asyncio
    async def test_create_user_settings(self):
        """Test creating user settings"""
        async with AsyncSessionLocal() as session:
            user = UserSettings(
                wallet_address="0x1234567890abcdef1234567890abcdef12345678",
                company_name="Test Company",
                industry="technology",
                timezone="UTC",
                language="en"
            )
            session.add(user)
            await session.commit()

            # Verify
            result = await session.execute(
                text("SELECT company_name FROM user_settings WHERE wallet_address = :addr"),
                {"addr": "0x1234567890abcdef1234567890abcdef12345678"}
            )
            company = result.scalar()
            assert company == "Test Company"

            # Cleanup
            await session.execute(
                text("DELETE FROM user_settings WHERE wallet_address = :addr"),
                {"addr": "0x1234567890abcdef1234567890abcdef12345678"}
            )
            await session.commit()

    @pytest.mark.asyncio
    async def test_foreign_key_constraints(self):
        """Test foreign key relationships work"""
        async with AsyncSessionLocal() as session:
            # Create category
            category = Category(name="CRM", slug="crm", icon="users")
            session.add(category)
            await session.flush()

            # Create product
            product = Product(
                name="Test CRM",
                slug="test-crm",
                developer="Test Co",
                category="crm",
                description="Test product"
            )
            session.add(product)
            await session.commit()

            # Verify relationship
            result = await session.execute(
                text("SELECT name FROM marketplace_products WHERE category = :cat"),
                {"cat": "crm"}
            )
            name = result.scalar()
            assert name == "Test CRM"

            # Cleanup (product first due to FK)
            await session.execute(
                text("DELETE FROM marketplace_products WHERE slug = :slug"),
                {"slug": "test-crm"}
            )
            await session.execute(
                text("DELETE FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "crm"}
            )
            await session.commit()


# Fixtures
@pytest.fixture(autouse=True)
async def setup_database():
    """Setup database before each test"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup is handled by individual tests


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
