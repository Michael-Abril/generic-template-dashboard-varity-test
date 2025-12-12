#!/usr/bin/env python3
"""Simple database test to isolate the issue"""
import asyncio
import os
import sys

# Set environment variable before any imports
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./marketplace_test.db"

async def test_db():
    """Test database connection"""
    print("Testing database connection...")
    print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")

    try:
        from sqlalchemy.ext.asyncio import create_async_engine

        database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./marketplace_test.db")
        print(f"Creating engine with: {database_url}")

        engine = create_async_engine(
            database_url,
            echo=True,
            future=True
        )

        print("Engine created successfully!")

        # Try to connect
        async with engine.begin() as conn:
            from sqlalchemy import text
            result = await conn.execute(text("SELECT 1"))
            print(f"Query result: {result.scalar()}")
            print("✅ Database connection successful!")

        await engine.dispose()

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    result = asyncio.run(test_db())
    sys.exit(0 if result else 1)
