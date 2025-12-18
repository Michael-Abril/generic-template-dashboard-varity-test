"""
Connection Pooling Tests

Tests database connection pooling under concurrent load.
Verifies the system can handle 100+ concurrent connections.
"""

import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import text
from datetime import datetime
import statistics

from app.core.database import AsyncSessionLocal, Base, engine


class TestConnectionPool:
    """Test database connection pooling"""

    @pytest.fixture(autouse=True)
    async def setup(self):
        """Setup test database"""
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield

    @pytest.mark.asyncio
    async def test_basic_connection_pool(self):
        """Test basic connection pooling works"""
        results = []

        async def query_database():
            """Simple database query"""
            async with AsyncSessionLocal() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar()

        # Execute 10 concurrent queries
        tasks = [query_database() for _ in range(10)]
        results = await asyncio.gather(*tasks)

        # All queries should succeed
        assert len(results) == 10
        assert all(r == 1 for r in results)

    @pytest.mark.asyncio
    async def test_concurrent_connections(self):
        """Test database handles 100 concurrent connections"""
        num_requests = 100

        async def query_database(request_id: int):
            """Database query with request tracking"""
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    text("SELECT :id AS request_id"),
                    {"id": request_id}
                )
                return result.scalar()

        # Execute 100 concurrent queries
        tasks = [query_database(i) for i in range(num_requests)]
        start_time = datetime.now()
        results = await asyncio.gather(*tasks)
        end_time = datetime.now()

        # All queries should succeed
        assert len(results) == num_requests
        assert sorted(results) == list(range(num_requests))

        # Calculate performance metrics
        duration = (end_time - start_time).total_seconds()
        print(f"\n100 concurrent requests completed in {duration:.2f} seconds")
        print(f"Average response time: {duration / num_requests * 1000:.2f}ms")

        # Performance threshold: should complete in < 10 seconds
        assert duration < 10.0, f"100 concurrent requests took too long: {duration:.2f}s"

    @pytest.mark.asyncio
    async def test_connection_pool_stress(self):
        """Stress test with 200 concurrent connections"""
        num_requests = 200

        async def database_operation(op_id: int):
            """More complex database operation"""
            async with AsyncSessionLocal() as session:
                # Multiple queries in same session
                result1 = await session.execute(text("SELECT 1"))
                result2 = await session.execute(
                    text("SELECT :id AS op_id"),
                    {"id": op_id}
                )
                return result1.scalar() + result2.scalar()

        # Execute 200 concurrent operations
        tasks = [database_operation(i) for i in range(num_requests)]
        start_time = datetime.now()
        results = await asyncio.gather(*tasks)
        end_time = datetime.now()

        # All operations should succeed
        assert len(results) == num_requests

        duration = (end_time - start_time).total_seconds()
        print(f"\n200 concurrent operations completed in {duration:.2f} seconds")

        # Should complete reasonably fast even under stress
        assert duration < 15.0, f"200 concurrent operations took too long: {duration:.2f}s"

    @pytest.mark.asyncio
    async def test_connection_pool_with_writes(self):
        """Test connection pool with concurrent writes"""
        from app.models import UserSettings

        num_users = 50

        async def create_user(user_id: int):
            """Create a user in database"""
            wallet = f"0x{'0' * 39}{user_id:01x}"
            async with AsyncSessionLocal() as session:
                user = UserSettings(
                    wallet_address=wallet,
                    company_name=f"Company {user_id}",
                    industry="technology"
                )
                session.add(user)
                await session.commit()
                return user_id

        # Create 50 users concurrently
        tasks = [create_user(i) for i in range(num_users)]
        start_time = datetime.now()
        results = await asyncio.gather(*tasks)
        end_time = datetime.now()

        # All creates should succeed
        assert len(results) == num_users

        # Verify all users were created
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT COUNT(*) FROM user_settings WHERE industry = :industry"),
                {"industry": "technology"}
            )
            count = result.scalar()
            assert count == num_users

        # Cleanup
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("DELETE FROM user_settings WHERE industry = :industry"),
                {"industry": "technology"}
            )
            await session.commit()

        duration = (end_time - start_time).total_seconds()
        print(f"\n50 concurrent writes completed in {duration:.2f} seconds")

    @pytest.mark.asyncio
    async def test_connection_pool_mixed_operations(self):
        """Test connection pool with mixed read/write operations"""
        from app.models import Category

        num_operations = 100

        async def mixed_operation(op_id: int):
            """Mix of read and write operations"""
            async with AsyncSessionLocal() as session:
                if op_id % 2 == 0:
                    # Write operation
                    category = Category(
                        name=f"Category {op_id}",
                        slug=f"category-{op_id}",
                        icon="icon"
                    )
                    session.add(category)
                    await session.commit()
                    return ("write", op_id)
                else:
                    # Read operation
                    result = await session.execute(
                        text("SELECT COUNT(*) FROM marketplace_categories")
                    )
                    count = result.scalar()
                    return ("read", count)

        # Execute mixed operations
        tasks = [mixed_operation(i) for i in range(num_operations)]
        results = await asyncio.gather(*tasks)

        # All operations should succeed
        assert len(results) == num_operations

        # Count read vs write operations
        writes = [r for r in results if r[0] == "write"]
        reads = [r for r in results if r[0] == "read"]

        assert len(writes) == 50  # Even numbers
        assert len(reads) == 50   # Odd numbers

        # Cleanup
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("DELETE FROM marketplace_categories WHERE slug LIKE :pattern"),
                {"pattern": "category-%"}
            )
            await session.commit()

    @pytest.mark.asyncio
    async def test_connection_pool_timeout_handling(self):
        """Test graceful handling when pool is exhausted"""
        num_long_running = 30  # Create some long-running connections

        async def long_running_query():
            """Simulate a long-running query"""
            async with AsyncSessionLocal() as session:
                # Simulate long operation with sleep
                await asyncio.sleep(0.5)
                result = await session.execute(text("SELECT 1"))
                return result.scalar()

        async def quick_query():
            """Quick query that should wait for pool"""
            async with AsyncSessionLocal() as session:
                result = await session.execute(text("SELECT 2"))
                return result.scalar()

        # Start long-running queries
        long_tasks = [long_running_query() for _ in range(num_long_running)]

        # Start quick queries (should wait for connections to become available)
        quick_tasks = [quick_query() for _ in range(10)]

        # Execute all tasks
        start_time = datetime.now()
        all_results = await asyncio.gather(*long_tasks, *quick_tasks)
        end_time = datetime.now()

        # All should complete successfully
        assert len(all_results) == num_long_running + 10

        duration = (end_time - start_time).total_seconds()
        print(f"\nPool exhaustion test completed in {duration:.2f} seconds")

        # Should complete without errors, even with pool contention
        assert all(r in [1, 2] for r in all_results)

    @pytest.mark.asyncio
    async def test_connection_pool_performance_metrics(self):
        """Measure connection pool performance metrics"""
        num_requests = 100
        response_times = []

        async def timed_query():
            """Query with timing"""
            start = datetime.now()
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            end = datetime.now()
            return (end - start).total_seconds() * 1000  # Convert to ms

        # Execute concurrent queries
        tasks = [timed_query() for _ in range(num_requests)]
        response_times = await asyncio.gather(*tasks)

        # Calculate statistics
        avg_time = statistics.mean(response_times)
        median_time = statistics.median(response_times)
        max_time = max(response_times)
        min_time = min(response_times)

        print(f"\nPerformance Metrics for {num_requests} concurrent requests:")
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Median:  {median_time:.2f}ms")
        print(f"  Min:     {min_time:.2f}ms")
        print(f"  Max:     {max_time:.2f}ms")

        # Performance assertions
        assert avg_time < 500.0, f"Average response time too high: {avg_time:.2f}ms"
        assert median_time < 300.0, f"Median response time too high: {median_time:.2f}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])  # -s to show print output
