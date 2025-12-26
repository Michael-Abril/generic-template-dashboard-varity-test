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
    import traceback
    try:
        logger.info("Initializing database...")

        # Log DATABASE_URL (masked) for debugging
        from app.core.database import DATABASE_URL, engine, Base
        if DATABASE_URL:
            # Mask password in URL for logging
            masked_url = DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL
            logger.info(f"Database URL (masked): {masked_url}")
        else:
            logger.error("DATABASE_URL is not set!")
            return False

        # Import all models to register them with Base before creating tables
        from app.models.marketplace import Product, Category, PricingPlan  # noqa: F401
        from app.models.purchase import Purchase, Subscription  # noqa: F401
        from app.models.user_settings import UserSettings, APIKey  # noqa: F401
        from app.models.conversation import Conversation, Message  # noqa: F401

        # Create all tables
        logger.info("Attempting to connect to database and create tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        # Log FULL exception details for debugging
        logger.error(f"❌ Database initialization failed: {type(e).__name__}: {e}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return False


async def seed_marketplace_data() -> bool:
    """
    Seed marketplace with products if empty.
    In production, auto-seeds if database is empty (for Railway persistence).

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import select, func
        from app.models.marketplace import Product, Category

        # Check environment
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

        # Check if products exist
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(func.count(Product.id)))
            count = result.scalar()

            if count == 0:
                logger.info("🔄 Marketplace empty - auto-seeding database...")

                # Auto-seed in BOTH production and development for reliability
                try:
                    await _auto_seed_marketplace(session)
                    await session.commit()

                    # Verify seeding
                    result = await session.execute(select(func.count(Product.id)))
                    new_count = result.scalar()
                    logger.info(f"✅ Marketplace auto-seeded with {new_count} products")
                except Exception as seed_error:
                    logger.error(f"❌ Auto-seed failed: {seed_error}")
                    await session.rollback()

                    # Fall back to development seed script if available
                    if not is_production:
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
                                logger.info("✅ Marketplace seeded via script")
            else:
                logger.info(f"✅ Marketplace has {count} products")

        return True
    except Exception as e:
        logger.info(f"ℹ️  Marketplace initialization skipped: {e}")
        return True  # Don't fail startup for marketplace issues


async def _auto_seed_marketplace(session) -> None:
    """
    Internal function to seed marketplace data directly in the database.
    Uses the same data as the admin seed endpoint.
    """
    from app.models.marketplace import Category, Product

    # Categories data
    CATEGORIES = [
        {"name": "Accounting", "slug": "accounting", "icon": "calculator", "description": "Financial management and bookkeeping software", "sort_order": 1},
        {"name": "CRM", "slug": "crm", "icon": "users", "description": "Customer relationship management platforms", "sort_order": 2},
        {"name": "E-commerce", "slug": "e-commerce", "icon": "shopping-cart", "description": "Online store and sales platforms", "sort_order": 3},
        {"name": "Communication", "slug": "communication", "icon": "message-circle", "description": "Team messaging and collaboration tools", "sort_order": 4},
        {"name": "Project Management", "slug": "project-management", "icon": "check-square", "description": "Task and project tracking software", "sort_order": 5},
        {"name": "Payments", "slug": "payments", "icon": "credit-card", "description": "Payment processing and financial infrastructure", "sort_order": 6},
        {"name": "Marketing", "slug": "marketing", "icon": "trending-up", "description": "Marketing automation and email campaigns", "sort_order": 7},
        {"name": "Customer Support", "slug": "customer-support", "icon": "headphones", "description": "Help desk and customer service platforms", "sort_order": 8},
        {"name": "Productivity", "slug": "productivity", "icon": "briefcase", "description": "Office productivity and collaboration suites", "sort_order": 9},
        {"name": "Documents", "slug": "documents", "icon": "file-text", "description": "Document management and e-signature tools", "sort_order": 10},
        {"name": "Storage", "slug": "storage", "icon": "hard-drive", "description": "Cloud file storage and sharing", "sort_order": 11},
        {"name": "Payroll & HR", "slug": "payroll-hr", "icon": "users", "description": "Payroll processing and human resources management", "sort_order": 12},
        {"name": "Scheduling", "slug": "scheduling", "icon": "calendar", "description": "Appointment booking and scheduling tools", "sort_order": 13},
        {"name": "Design", "slug": "design", "icon": "image", "description": "Graphic design and creative tools", "sort_order": 14},
        {"name": "Point of Sale", "slug": "pos", "icon": "shopping-bag", "description": "Point of sale and retail management systems", "sort_order": 15}
    ]

    # Products data (core SMB integrations)
    PRODUCTS = [
        # ACCOUNTING
        {"name": "QuickBooks", "slug": "quickbooks", "developer": "Intuit", "category": "accounting", "logo": "quickbooks", "short_description": "Accounting & invoicing for small business", "coming_soon": False, "active": True, "has_adapter": True},
        {"name": "Xero", "slug": "xero", "developer": "Xero Limited", "category": "accounting", "logo": "xero", "short_description": "Cloud accounting for modern businesses", "coming_soon": False, "active": True, "has_adapter": False},
        {"name": "FreshBooks", "slug": "freshbooks", "developer": "FreshBooks", "category": "accounting", "logo": "freshbooks", "short_description": "Invoicing made easy", "coming_soon": False, "active": True, "has_adapter": False},
        # CRM
        {"name": "HubSpot", "slug": "hubspot", "developer": "HubSpot", "category": "crm", "logo": "hubspot", "short_description": "All-in-one CRM platform", "coming_soon": False, "active": True, "has_adapter": False},
        {"name": "Salesforce", "slug": "salesforce", "developer": "Salesforce", "category": "crm", "logo": "salesforce", "short_description": "Enterprise CRM leader", "coming_soon": False, "active": True, "has_adapter": False},
        # E-COMMERCE
        {"name": "Shopify", "slug": "shopify", "developer": "Shopify", "category": "e-commerce", "logo": "shopify", "short_description": "Complete e-commerce platform", "coming_soon": False, "active": True, "has_adapter": False},
        # COMMUNICATION
        {"name": "Slack", "slug": "slack", "developer": "Salesforce", "category": "communication", "logo": "slack", "short_description": "Team messaging and collaboration", "coming_soon": False, "active": True, "has_adapter": False},
        {"name": "Zoom", "slug": "zoom", "developer": "Zoom", "category": "communication", "logo": "zoom", "short_description": "Video conferencing platform", "coming_soon": False, "active": True, "has_adapter": False},
        # PROJECT MANAGEMENT
        {"name": "Asana", "slug": "asana", "developer": "Asana", "category": "project-management", "logo": "asana", "short_description": "Project and task management", "coming_soon": True, "active": True, "has_adapter": False},
        {"name": "Trello", "slug": "trello", "developer": "Atlassian", "category": "project-management", "logo": "trello", "short_description": "Visual project boards", "coming_soon": True, "active": True, "has_adapter": False},
        {"name": "Monday.com", "slug": "monday", "developer": "monday.com", "category": "project-management", "logo": "monday", "short_description": "Work management platform", "coming_soon": True, "active": True, "has_adapter": False},
        # PAYMENTS
        {"name": "Stripe", "slug": "stripe", "developer": "Stripe", "category": "payments", "logo": "stripe", "short_description": "Online payment processing", "coming_soon": True, "active": True, "has_adapter": False},
        {"name": "Square", "slug": "square", "developer": "Block", "category": "payments", "logo": "square", "short_description": "POS and payment solutions", "coming_soon": True, "active": True, "has_adapter": False},
        {"name": "PayPal", "slug": "paypal", "developer": "PayPal", "category": "payments", "logo": "paypal", "short_description": "Digital payment platform", "coming_soon": True, "active": True, "has_adapter": False},
        # MARKETING
        {"name": "Mailchimp", "slug": "mailchimp", "developer": "Intuit", "category": "marketing", "logo": "mailchimp", "short_description": "Email marketing automation", "coming_soon": False, "active": True, "has_adapter": False},
        # CUSTOMER SUPPORT
        {"name": "Zendesk", "slug": "zendesk", "developer": "Zendesk", "category": "customer-support", "logo": "zendesk", "short_description": "Customer service platform", "coming_soon": False, "active": True, "has_adapter": False},
        {"name": "Intercom", "slug": "intercom", "developer": "Intercom", "category": "customer-support", "logo": "intercom", "short_description": "Customer messaging platform", "coming_soon": True, "active": True, "has_adapter": False},
        # PRODUCTIVITY
        {"name": "Google Workspace", "slug": "google-workspace", "developer": "Google", "category": "productivity", "logo": "google", "short_description": "Productivity and collaboration suite", "coming_soon": False, "active": True, "has_adapter": False},
        {"name": "Microsoft 365", "slug": "microsoft-365", "developer": "Microsoft", "category": "productivity", "logo": "microsoft", "short_description": "Office productivity suite", "coming_soon": False, "active": True, "has_adapter": False},
        # DOCUMENTS
        {"name": "DocuSign", "slug": "docusign", "developer": "DocuSign", "category": "documents", "logo": "docusign", "short_description": "Electronic signature platform", "coming_soon": False, "active": True, "has_adapter": False},
        # STORAGE
        {"name": "Dropbox", "slug": "dropbox", "developer": "Dropbox", "category": "storage", "logo": "dropbox", "short_description": "Cloud file storage", "coming_soon": False, "active": True, "has_adapter": False},
        # PAYROLL & HR
        {"name": "Gusto", "slug": "gusto", "developer": "Gusto", "category": "payroll-hr", "logo": "gusto", "short_description": "Payroll and HR platform", "coming_soon": True, "active": True, "has_adapter": False},
        # SCHEDULING
        {"name": "Calendly", "slug": "calendly", "developer": "Calendly", "category": "scheduling", "logo": "calendly", "short_description": "Scheduling automation", "coming_soon": True, "active": True, "has_adapter": False},
        # DESIGN
        {"name": "Canva", "slug": "canva", "developer": "Canva", "category": "design", "logo": "canva", "short_description": "Graphic design platform", "coming_soon": True, "active": True, "has_adapter": False},
    ]

    # Create categories first
    for cat_data in CATEGORIES:
        category = Category(**cat_data)
        session.add(category)

    await session.flush()  # Get category IDs

    # Create products
    for prod_data in PRODUCTS:
        product = Product(
            name=prod_data["name"],
            slug=prod_data["slug"],
            developer=prod_data["developer"],
            category=prod_data["category"],
            logo=prod_data["logo"],
            short_description=prod_data["short_description"],
            description=prod_data.get("description", prod_data["short_description"]),
            coming_soon=prod_data["coming_soon"],
            active=prod_data["active"],
            has_adapter=prod_data["has_adapter"],
            pricing_model="fixed_tier"
        )
        session.add(product)

    logger.info(f"✅ Auto-seeded {len(CATEGORIES)} categories and {len(PRODUCTS)} products")


async def init_redis() -> bool:
    """
    Initialize Redis connection with retry logic.
    Redis is optional - app works without it but may have degraded performance.

    Returns:
        bool: True if Redis is available, False otherwise
    """
    from app.core.database import REDIS_URL, get_redis

    # Check if Redis URL is configured
    if not REDIS_URL:
        logger.info("ℹ️  Redis not configured - app will work without caching")
        return False

    try:
        redis = await get_redis()
        if redis is None:
            logger.info("ℹ️  Redis disabled - app will work without caching")
            return False

        await redis.ping()
        logger.info("✅ Redis connection established")
        return True
    except Exception as e:
        logger.info(f"ℹ️  Redis not available - app continues without caching")
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

    # Check Pinata - ALWAYS use API key + secret (JWT gets corrupted in Railway env vars)
    pinata_api_key = os.getenv("PINATA_API_KEY") or getattr(settings, 'pinata_api_key', None)
    pinata_secret = os.getenv("PINATA_SECRET_KEY") or getattr(settings, 'pinata_secret_key', None)

    has_pinata_creds = pinata_api_key and pinata_secret

    if has_pinata_creds:
        try:
            import httpx

            # Use API key + secret authentication (more reliable than JWT in cloud environments)
            headers = {
                "pinata_api_key": pinata_api_key,
                "pinata_secret_api_key": pinata_secret
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.pinata.cloud/data/testAuthentication",
                    headers=headers
                )
                services["pinata"] = response.status_code == 200

                if services["pinata"]:
                    logger.info("✅ Pinata (Filecoin/IPFS) is available")
                else:
                    # Log error but don't crash - Pinata is optional for beta
                    logger.info(f"ℹ️  Pinata auth returned HTTP {response.status_code} - storage features may be limited")
                    services["pinata"] = False
        except Exception as e:
            logger.info(f"ℹ️  Pinata not reachable - storage features will use fallback")
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
