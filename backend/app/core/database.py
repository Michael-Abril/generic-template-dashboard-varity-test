import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncSession as AsyncSessionType
from sqlalchemy.orm import declarative_base, sessionmaker
from redis import asyncio as aioredis

# Database URL
# Development: SQLite with aiosqlite
# Production: Set DATABASE_URL environment variable to PostgreSQL URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./marketplace_test.db"
)

# Redis URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# SQLAlchemy setup with connection pooling
# Enhanced configuration for production stability
# Note: pool_size and max_overflow only work with PostgreSQL, not SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        pool_size=20,          # Connection pool size
        max_overflow=10,       # Allow up to 10 overflow connections
        pool_pre_ping=True,    # Verify connections before use
        pool_recycle=3600      # Recycle connections after 1 hour
    )
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
Base = declarative_base()

# Redis client
redis_client = None

async def get_redis():
    """Get Redis client"""
    global redis_client
    if redis_client is None:
        redis_client = await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    return redis_client

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Initialize database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def check_database_health() -> bool:
    """
    Check if database is accessible and responsive.

    Returns:
        bool: True if database is healthy, False otherwise
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        async with AsyncSessionLocal() as session:
            # Simple query to verify database connectivity
            from sqlalchemy import text
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
