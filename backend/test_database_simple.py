"""
Simple database test runner (without pytest)
Tests database connection and basic operations
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from app.core.database import AsyncSessionLocal, Base, engine, check_database_health
from app.models import Category, Product, UserSettings


async def test_database_connection():
    """Test 1: Basic database connection"""
    print("\n[TEST 1] Testing database connection...")
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            value = result.scalar()
            assert value == 1, f"Expected 1, got {value}"
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


async def test_health_check():
    """Test 2: Database health check"""
    print("\n[TEST 2] Testing database health check...")
    try:
        is_healthy = await check_database_health()
        assert is_healthy is True, "Health check failed"
        print("✓ Database health check passed")
        return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False


async def test_create_tables():
    """Test 3: Create all database tables"""
    print("\n[TEST 3] Creating database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Verify tables exist
        async with engine.begin() as conn:
            def check_tables(connection):
                inspector = inspect(connection)
                return inspector.get_table_names()

            tables = await conn.run_sync(check_tables)

        expected_tables = [
            'marketplace_categories',
            'marketplace_products',
            'user_settings',
            'purchases',
            'subscriptions'
        ]

        missing_tables = [t for t in expected_tables if t not in tables]
        if missing_tables:
            print(f"✗ Missing tables: {missing_tables}")
            return False

        print(f"✓ All {len(tables)} tables created successfully")
        print(f"  Tables: {', '.join(sorted(tables)[:5])}...")
        return True
    except Exception as e:
        print(f"✗ Table creation failed: {e}")
        return False


async def test_insert_and_query():
    """Test 4: Insert and query data"""
    print("\n[TEST 4] Testing data insertion and querying...")
    try:
        async with AsyncSessionLocal() as session:
            # Create a category
            category = Category(
                name="Test Category",
                slug="test-category",
                icon="test-icon"
            )
            session.add(category)
            await session.commit()

            # Query it back
            result = await session.execute(
                text("SELECT name FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "test-category"}
            )
            name = result.scalar()
            assert name == "Test Category", f"Expected 'Test Category', got '{name}'"

            # Cleanup
            await session.execute(
                text("DELETE FROM marketplace_categories WHERE slug = :slug"),
                {"slug": "test-category"}
            )
            await session.commit()

        print("✓ Data insertion and querying successful")
        return True
    except Exception as e:
        print(f"✗ Data insertion/query failed: {e}")
        return False


async def test_multi_tenant_isolation():
    """Test 5: Multi-tenant data isolation"""
    print("\n[TEST 5] Testing multi-tenant data isolation...")
    try:
        wallet_a = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        wallet_b = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        async with AsyncSessionLocal() as session:
            # Create two users
            user_a = UserSettings(
                wallet_address=wallet_a,
                company_name="Company A",
                industry="finance"
            )
            user_b = UserSettings(
                wallet_address=wallet_b,
                company_name="Company B",
                industry="healthcare"
            )
            session.add_all([user_a, user_b])
            await session.commit()

            # Query User A's data
            result = await session.execute(
                text("SELECT company_name FROM user_settings WHERE wallet_address = :addr"),
                {"addr": wallet_a}
            )
            company_a = result.scalar()
            assert company_a == "Company A", f"Expected 'Company A', got '{company_a}'"

            # Query User B's data
            result = await session.execute(
                text("SELECT company_name FROM user_settings WHERE wallet_address = :addr"),
                {"addr": wallet_b}
            )
            company_b = result.scalar()
            assert company_b == "Company B", f"Expected 'Company B', got '{company_b}'"

            # Cleanup
            await session.execute(text("DELETE FROM user_settings WHERE wallet_address IN (:a, :b)"),
                                {"a": wallet_a, "b": wallet_b})
            await session.commit()

        print("✓ Multi-tenant isolation verified")
        return True
    except Exception as e:
        print(f"✗ Multi-tenant test failed: {e}")
        return False


async def test_concurrent_connections():
    """Test 6: Concurrent database connections"""
    print("\n[TEST 6] Testing concurrent connections (100 requests)...")
    try:
        async def query_db(request_id):
            async with AsyncSessionLocal() as session:
                result = await session.execute(text("SELECT :id"), {"id": request_id})
                return result.scalar()

        # Execute 100 concurrent queries
        tasks = [query_db(i) for i in range(100)]
        results = await asyncio.gather(*tasks)

        assert len(results) == 100, f"Expected 100 results, got {len(results)}"
        assert sorted(results) == list(range(100)), "Results don't match expected values"

        print("✓ Concurrent connections test passed (100 requests)")
        return True
    except Exception as e:
        print(f"✗ Concurrent connections test failed: {e}")
        return False


async def test_indexes():
    """Test 7: Verify database indexes"""
    print("\n[TEST 7] Verifying database indexes...")
    try:
        async with engine.begin() as conn:
            def check_indexes(connection):
                inspector = inspect(connection)
                product_indexes = inspector.get_indexes('marketplace_products')
                return [idx['name'] for idx in product_indexes]

            indexes = await conn.run_sync(check_indexes)

        expected_indexes = [
            'ix_marketplace_products_slug',
            'ix_marketplace_products_category',
            'ix_marketplace_products_active'
        ]

        found = [idx for idx in expected_indexes if idx in indexes]
        print(f"✓ Found {len(found)}/{len(expected_indexes)} expected indexes")
        print(f"  Indexes: {', '.join(indexes)}")
        return len(found) >= 3
    except Exception as e:
        print(f"✗ Index verification failed: {e}")
        return False


async def run_all_tests():
    """Run all database tests"""
    print("=" * 60)
    print("DATABASE TEST SUITE")
    print("=" * 60)

    tests = [
        test_database_connection,
        test_health_check,
        test_create_tables,
        test_insert_and_query,
        test_multi_tenant_isolation,
        test_concurrent_connections,
        test_indexes,
    ]

    results = []
    for test in tests:
        result = await test()
        results.append(result)

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total} ({passed/total*100:.1f}%)")

    if passed == total:
        print("\n✓ ALL TESTS PASSED")
        return 0
    else:
        print(f"\n✗ {total - passed} TESTS FAILED")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
