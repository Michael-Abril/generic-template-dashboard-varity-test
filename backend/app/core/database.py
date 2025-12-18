import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncSession as AsyncSessionType
from sqlalchemy.orm import declarative_base, sessionmaker
from redis import asyncio as aioredis

# Database URL
# Development: SQLite with aiosqlite
# Production: Set DATABASE_URL environment variable to PostgreSQL URL
# RAILWAY FIX: Railway provides postgresql:// but asyncpg requires postgresql+asyncpg://
def get_database_url() -> str:
    """Get and transform database URL for async support"""
    url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./marketplace_test.db")

    # Railway provides postgres:// or postgresql:// but asyncpg needs postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return url

DATABASE_URL = get_database_url()

# Redis URL - Check multiple possible variable names that Railway might use
# For Railway without Redis plugin, this will be None and Redis features will be disabled
_redis_url = (
    os.getenv("REDIS_URL") or
    os.getenv("REDIS_PRIVATE_URL") or
    os.getenv("REDIS_PUBLIC_URL") or
    os.getenv("REDISCLOUD_URL") or
    ""
)
# Only use localhost fallback in development, not production
REDIS_URL = _redis_url if _redis_url else (
    "redis://localhost:6379" if os.getenv("ENVIRONMENT", "development") != "production" else ""
)

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
redis_disabled = False

async def get_redis():
    """Get Redis client - returns None if Redis is not configured"""
    global redis_client, redis_disabled

    # Skip if Redis is disabled or not configured
    if redis_disabled or not REDIS_URL:
        return None

    if redis_client is None:
        try:
            redis_client = await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        except Exception:
            redis_disabled = True
            return None
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
