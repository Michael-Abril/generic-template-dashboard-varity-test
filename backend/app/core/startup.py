"""
Varity Generic Template - Startup & Shutdown Module

Handles application startup sequence:
1. Database initialization and table creation
2. Marketplace data seeding
3. Redis connection (optional)
4. External service health checks (Pinata, Ollama, Arbitrum RPC)
5. Graceful shutdown

Author: Backend API Development Agent (Claude 4.5 Sonnet)
"""
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)


async def init_database() -> bool:
    """
    Initialize database:
    1. Create all tables if not exist
    2. Verify database connectivity

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        logger.info("Initializing database...")

        from app.core.database import engine, Base

        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False


async def seed_marketplace_data() -> bool:
    """
    Seed marketplace with products if empty.
    Uses the existing test_seed_marketplace.py data.

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import select, func
        from app.models.marketplace import Product

        # Check if products exist
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(func.count(Product.id)))
            count = result.scalar()

            if count == 0:
                logger.info("Seeding marketplace with initial products...")

                # Run the seeding script
                backend_dir = Path(__file__).parent.parent.parent
                seed_script = backend_dir / "test_seed_marketplace.py"

                if seed_script.exists():
                    result = subprocess.run(
                        [sys.executable, str(seed_script)],
                        cwd=str(backend_dir),
                        capture_output=True,
                        text=True
                    )

                    if result.returncode == 0:
                        logger.info("✅ Marketplace seeded with 20 products")
                    else:
                        logger.warning(f"⚠️  Marketplace seeding had issues: {result.stderr}")
                        logger.info("Continuing anyway - marketplace may be empty")
                else:
                    logger.warning(f"⚠️  Seed script not found at {seed_script}")
                    logger.info("Continuing without seeding - marketplace will be empty")
            else:
                logger.info(f"Marketplace already has {count} products, skipping seed")

        return True
    except Exception as e:
        logger.error(f"❌ Marketplace seeding failed: {e}")
        logger.info("Continuing anyway - marketplace may be empty")
        return False


async def init_redis() -> bool:
    """
    Initialize Redis connection with retry logic.
    Redis is optional - app works without it but may have degraded performance.

    Returns:
        bool: True if Redis is available, False otherwise
    """
    from app.core.database import REDIS_URL

    # Check if Redis URL is configured (not localhost fallback)
    if not REDIS_URL or REDIS_URL == "redis://localhost:6379":
        # Only log info if we're likely in production without Redis
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production":
            logger.info("ℹ️  Redis not configured - app will work without caching")
        else:
            logger.info("ℹ️  Using local Redis (or no Redis if unavailable)")

    try:
        from app.core.database import get_redis

        redis = await get_redis()
        await redis.ping()

        logger.info("✅ Redis connection established")
        return True
    except Exception as e:
        # Use INFO level, not WARNING - Redis is truly optional
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production":
            logger.info(f"ℹ️  Redis not available - app continues without caching")
        else:
            logger.warning(f"⚠️  Redis not available: {e}")
        return False


async def check_external_services() -> Dict[str, bool]:
    """
    Verify external services are accessible:
    1. Pinata (Filecoin/IPFS)
    2. Ollama (LLM) - OPTIONAL for Railway deployment
    3. Arbitrum Sepolia RPC

    Returns:
        dict: Service name -> availability status
    """
    from app.core.config import settings

    services = {}

    # Check Pinata (JWT or API key/secret) - Use settings object for consistency
    pinata_jwt = getattr(settings, 'pinata_jwt', None)
    pinata_api_key = getattr(settings, 'pinata_api_key', None)
    pinata_secret = getattr(settings, 'pinata_secret_key', None)

    has_pinata_creds = pinata_jwt or (pinata_api_key and pinata_secret)

    if has_pinata_creds:
        try:
            import httpx

            headers = {}
            if pinata_jwt:
                headers["Authorization"] = f"Bearer {pinata_jwt}"
            else:
                headers["pinata_api_key"] = pinata_api_key
                headers["pinata_secret_api_key"] = pinata_secret

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.pinata.cloud/data/testAuthentication",
                    headers=headers
                )
                services["pinata"] = response.status_code == 200

                if services["pinata"]:
                    logger.info("✅ Pinata (Filecoin/IPFS) is available")
                else:
                    # Log more details for debugging
                    logger.warning(f"⚠️  Pinata authentication failed: HTTP {response.status_code}")
                    logger.warning(f"    API Key: {pinata_api_key[:8] if pinata_api_key else 'None'}...")
                    logger.warning(f"    JWT present: {bool(pinata_jwt)}")
        except Exception as e:
            logger.warning(f"⚠️  Pinata check failed: {e}")
            services["pinata"] = False
    else:
        services["pinata"] = False
        logger.info("ℹ️  Pinata not configured - using mock storage for beta deployment")

    # Check Ollama - OPTIONAL for Railway (Railway doesn't have Ollama)
    ollama_url = getattr(settings, 'ollama_url', 'http://localhost:11434')

    # Skip Ollama check if URL is empty or explicitly disabled
    if not ollama_url or ollama_url.lower() in ['none', 'disabled', '']:
        services["ollama"] = False
        logger.info("ℹ️  Ollama disabled - AI chatbot features will use fallback responses")
    else:
        try:
            import httpx

            ollama_url = ollama_url.rstrip('/')
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{ollama_url}/api/tags")
                services["ollama"] = response.status_code == 200

                if services["ollama"]:
                    logger.info(f"✅ Ollama (LLM) is available at {ollama_url}")
                else:
                    logger.info(f"ℹ️  Ollama not responding at {ollama_url} - AI features will use fallback")
        except Exception as e:
            # Ollama is optional - don't warn loudly for Railway deployments
            services["ollama"] = False
            logger.info(f"ℹ️  Ollama not available ({ollama_url}) - AI features will use fallback responses")

    # Check Varity L3 RPC
    try:
        from web3 import Web3
        rpc_url = os.getenv("VARITY_L3_RPC", "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz")
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        services["arbitrum_rpc"] = w3.is_connected()

        if services["arbitrum_rpc"]:
            logger.info(f"✅ Varity L3 RPC is available ({rpc_url})")
        else:
            logger.warning(f"⚠️  Varity L3 RPC connection failed ({rpc_url})")
    except Exception as e:
        logger.warning(f"⚠️  Varity L3 RPC check failed: {e}")
        logger.warning("Blockchain features may not work properly")
        services["arbitrum_rpc"] = False

    return services


async def startup_sequence() -> Dict[str, Any]:
    """
    Main startup sequence - run all initialization tasks.
    This is called on app startup.

    Returns:
        dict: Service statuses and metadata
    """
    logger.info("=" * 60)
    logger.info("STARTING GENERIC COMPANY DASHBOARD BACKEND")
    logger.info("=" * 60)

    services = {}

    # Step 1: Initialize database
    db_ok = await init_database()
    if not db_ok:
        logger.error("FATAL: Database initialization failed")
        raise Exception("Cannot start without database")
    services["database"] = True

    # Step 2: Seed marketplace data
    seed_ok = await seed_marketplace_data()
    services["marketplace_seeded"] = seed_ok

    # Step 3: Initialize Redis (optional)
    redis_ok = await init_redis()
    services["redis"] = redis_ok

    # Step 4: Check external services
    external_services = await check_external_services()
    services.update(external_services)

    logger.info("=" * 60)
    logger.info("✅ BACKEND STARTUP COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Database: {'✅' if services.get('database') else '❌'}")
    logger.info(f"Redis: {'✅' if services.get('redis') else '⚠️  Optional'}")
    logger.info(f"Pinata: {'✅' if services.get('pinata') else '⚠️  Not configured'}")
    logger.info(f"Ollama: {'✅' if services.get('ollama') else '⚠️  Not available'}")
    logger.info(f"Arbitrum RPC: {'✅' if services.get('arbitrum_rpc') else '⚠️  Not available'}")
    logger.info("=" * 60)

    return services


async def shutdown_sequence():
    """
    Graceful shutdown - clean up resources.
    """
    logger.info("Shutting down...")

    try:
        # Close database connections
        from app.core.database import engine
        await engine.dispose()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")

    logger.info("✅ Shutdown complete")
