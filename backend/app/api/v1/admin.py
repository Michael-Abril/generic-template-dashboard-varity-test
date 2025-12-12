"""
Admin API endpoints for database seeding and management.

These endpoints are protected by an admin secret key.
"""

import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.marketplace import Category, Product, PricingPlan, PlanFeature, PlanLimit, DataSyncType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin secret key - should be set in Railway environment variables
ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY", "varity-admin-secret-2025")


async def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Verify admin secret key"""
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return True


# =====================================================================
# CATEGORY DATA
# =====================================================================

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

# =====================================================================
# PRODUCTS DATA - Core SMB Integrations
# =====================================================================

PRODUCTS = [
    # ACCOUNTING
    {
        "name": "QuickBooks",
        "slug": "quickbooks",
        "provider": "Intuit",
        "category_slug": "accounting",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Intuit_QuickBooks_logo.svg/1200px-Intuit_QuickBooks_logo.svg.png",
        "description": "Industry-leading accounting software for small businesses. Track expenses, create invoices, and manage your finances.",
        "short_description": "Accounting & invoicing for small business",
        "oauth_configured": True,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["invoices", "expenses", "accounts", "customers", "vendors", "transactions"],
        "sort_order": 1
    },
    {
        "name": "Xero",
        "slug": "xero",
        "provider": "Xero Limited",
        "category_slug": "accounting",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Xero_software_logo.svg/1200px-Xero_software_logo.svg.png",
        "description": "Beautiful accounting software for small businesses. Connect your bank, track projects, and collaborate with your team.",
        "short_description": "Cloud accounting for modern businesses",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["invoices", "bills", "bank_transactions", "contacts"],
        "sort_order": 2
    },
    {
        "name": "FreshBooks",
        "slug": "freshbooks",
        "provider": "FreshBooks",
        "category_slug": "accounting",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/4/4f/FreshBooks_logo.png",
        "description": "Invoicing and accounting software built for small business owners. Simple, intuitive, and powerful.",
        "short_description": "Invoicing made easy",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["invoices", "expenses", "time_tracking", "clients"],
        "sort_order": 3
    },
    # PRODUCTIVITY
    {
        "name": "Google Workspace",
        "slug": "google",
        "provider": "Google",
        "category_slug": "productivity",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png",
        "description": "Complete productivity suite including Gmail, Drive, Docs, Sheets, and more. Collaborate in real-time with your team.",
        "short_description": "Email, docs, and productivity suite",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["emails", "documents", "spreadsheets", "calendar", "contacts"],
        "sort_order": 1
    },
    {
        "name": "Microsoft 365",
        "slug": "microsoft",
        "provider": "Microsoft",
        "category_slug": "productivity",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png",
        "description": "Office apps and cloud services for business. Word, Excel, PowerPoint, Outlook, Teams, and more.",
        "short_description": "Office apps and business tools",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["emails", "documents", "spreadsheets", "calendar", "files"],
        "sort_order": 2
    },
    # COMMUNICATION
    {
        "name": "Slack",
        "slug": "slack",
        "provider": "Salesforce",
        "category_slug": "communication",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/1200px-Slack_icon_2019.svg.png",
        "description": "Business messaging platform for teams. Channels, direct messages, integrations, and powerful search.",
        "short_description": "Team messaging and collaboration",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["messages", "channels", "users", "files"],
        "sort_order": 1
    },
    {
        "name": "Zoom",
        "slug": "zoom",
        "provider": "Zoom Video Communications",
        "category_slug": "communication",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Zoom_Logo_2022.svg/1200px-Zoom_Logo_2022.svg.png",
        "description": "Video conferencing and online meeting platform. HD video, screen sharing, and recording.",
        "short_description": "Video meetings and webinars",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["meetings", "recordings", "participants"],
        "sort_order": 2
    },
    # CRM
    {
        "name": "HubSpot",
        "slug": "hubspot",
        "provider": "HubSpot",
        "category_slug": "crm",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HubSpot_Logo.svg/1200px-HubSpot_Logo.svg.png",
        "description": "Complete CRM platform with marketing, sales, and service tools. Free to start, scales as you grow.",
        "short_description": "CRM, marketing & sales platform",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["contacts", "companies", "deals", "tickets", "emails"],
        "sort_order": 1
    },
    {
        "name": "Salesforce",
        "slug": "salesforce",
        "provider": "Salesforce",
        "category_slug": "crm",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/1200px-Salesforce.com_logo.svg.png",
        "description": "World's #1 CRM platform. Sales, service, marketing, and analytics in one integrated platform.",
        "short_description": "Enterprise CRM platform",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["leads", "opportunities", "accounts", "contacts", "cases"],
        "sort_order": 2
    },
    # E-COMMERCE
    {
        "name": "Shopify",
        "slug": "shopify",
        "provider": "Shopify",
        "category_slug": "e-commerce",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/1200px-Shopify_logo_2018.svg.png",
        "description": "E-commerce platform for online stores. Sell products, process payments, and manage inventory.",
        "short_description": "E-commerce and online store platform",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["orders", "products", "customers", "inventory"],
        "sort_order": 1
    },
    # PAYMENTS
    {
        "name": "Stripe",
        "slug": "stripe",
        "provider": "Stripe",
        "category_slug": "payments",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/1200px-Stripe_Logo%2C_revised_2016.svg.png",
        "description": "Payment processing infrastructure. Accept payments, send payouts, and manage finances online.",
        "short_description": "Payment processing infrastructure",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["payments", "customers", "invoices", "subscriptions"],
        "sort_order": 1
    },
    {
        "name": "Square",
        "slug": "square",
        "provider": "Square (Block)",
        "category_slug": "pos",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Square%2C_Inc._-_Square_logo.svg/1200px-Square%2C_Inc._-_Square_logo.svg.png",
        "description": "Point of sale, payments, and business tools. Accept payments anywhere with Square hardware.",
        "short_description": "POS and payment processing",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["transactions", "customers", "inventory", "employees"],
        "sort_order": 1
    },
    {
        "name": "PayPal",
        "slug": "paypal",
        "provider": "PayPal",
        "category_slug": "payments",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png",
        "description": "Online payment system supporting online money transfers. Accept payments from around the world.",
        "short_description": "Online payments and money transfers",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["transactions", "invoices", "subscriptions"],
        "sort_order": 2
    },
    # CUSTOMER SUPPORT
    {
        "name": "Zendesk",
        "slug": "zendesk",
        "provider": "Zendesk",
        "category_slug": "customer-support",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Zendesk_logo.svg/1200px-Zendesk_logo.svg.png",
        "description": "Customer service software and support ticketing system. Help desk, chat, and knowledge base.",
        "short_description": "Customer service and help desk",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["tickets", "users", "organizations"],
        "sort_order": 1
    },
    {
        "name": "Intercom",
        "slug": "intercom",
        "provider": "Intercom",
        "category_slug": "customer-support",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/6/69/Intercom_logo.svg",
        "description": "Customer messaging platform. Live chat, bots, and product tours for customer engagement.",
        "short_description": "Customer messaging platform",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["conversations", "users", "companies"],
        "sort_order": 2
    },
    # MARKETING
    {
        "name": "Mailchimp",
        "slug": "mailchimp",
        "provider": "Intuit",
        "category_slug": "marketing",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Mailchimp_Logo_2018.svg/1200px-Mailchimp_Logo_2018.svg.png",
        "description": "Email marketing and automation platform. Build campaigns, manage audiences, and track results.",
        "short_description": "Email marketing and automation",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["campaigns", "audiences", "reports"],
        "sort_order": 1
    },
    # PROJECT MANAGEMENT
    {
        "name": "Asana",
        "slug": "asana",
        "provider": "Asana",
        "category_slug": "project-management",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Asana_logo.svg/1200px-Asana_logo.svg.png",
        "description": "Work management platform for teams. Organize projects, track tasks, and hit deadlines.",
        "short_description": "Project and task management",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["tasks", "projects", "users", "teams"],
        "sort_order": 1
    },
    {
        "name": "Trello",
        "slug": "trello",
        "provider": "Atlassian",
        "category_slug": "project-management",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Trello_logo.svg/1200px-Trello_logo.svg.png",
        "description": "Visual project management with boards, lists, and cards. Simple and flexible for any workflow.",
        "short_description": "Visual project boards",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["boards", "cards", "lists", "members"],
        "sort_order": 2
    },
    {
        "name": "Monday.com",
        "slug": "monday",
        "provider": "Monday.com",
        "category_slug": "project-management",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/c/c6/Monday_logo.svg",
        "description": "Work operating system for teams. Manage projects, workflows, and team collaboration.",
        "short_description": "Work OS for team productivity",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["boards", "items", "users", "updates"],
        "sort_order": 3
    },
    # DOCUMENTS
    {
        "name": "DocuSign",
        "slug": "docusign",
        "provider": "DocuSign",
        "category_slug": "documents",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/DocuSign_Logo.png/1200px-DocuSign_Logo.png",
        "description": "Electronic signature and agreement cloud. Sign, send, and manage documents securely.",
        "short_description": "Electronic signatures and agreements",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["envelopes", "documents", "templates"],
        "sort_order": 1
    },
    # STORAGE
    {
        "name": "Dropbox",
        "slug": "dropbox",
        "provider": "Dropbox",
        "category_slug": "storage",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Dropbox_Icon.svg/1200px-Dropbox_Icon.svg.png",
        "description": "Cloud file storage and sharing. Store files, sync across devices, and collaborate with teams.",
        "short_description": "Cloud storage and file sharing",
        "oauth_configured": False,
        "coming_soon": False,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["files", "folders", "shared_links"],
        "sort_order": 1
    },
    # PAYROLL & HR
    {
        "name": "Gusto",
        "slug": "gusto",
        "provider": "Gusto",
        "category_slug": "payroll-hr",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Gusto_Logo.svg/1200px-Gusto_Logo.svg.png",
        "description": "Payroll, benefits, and HR for modern businesses. Easy setup, automatic tax filing, and compliance.",
        "short_description": "Payroll and HR platform",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["employees", "payrolls", "benefits", "time_off"],
        "sort_order": 1
    },
    # SCHEDULING
    {
        "name": "Calendly",
        "slug": "calendly",
        "provider": "Calendly",
        "category_slug": "scheduling",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Calendly-Logo-Square.png",
        "description": "Scheduling automation platform. Share availability, book meetings, and eliminate scheduling conflicts.",
        "short_description": "Meeting scheduling automation",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["events", "users", "event_types"],
        "sort_order": 1
    },
    # DESIGN
    {
        "name": "Canva",
        "slug": "canva",
        "provider": "Canva",
        "category_slug": "design",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bb/Canva_Logo.svg/1200px-Canva_Logo.svg.png",
        "description": "Graphic design platform for creating presentations, social media graphics, and marketing materials.",
        "short_description": "Graphic design made easy",
        "oauth_configured": False,
        "coming_soon": True,
        "is_active": True,
        "integration_type": "oauth",
        "data_types": ["designs", "folders", "templates"],
        "sort_order": 1
    }
]


@router.post("/seed-marketplace")
async def seed_marketplace(
    admin_verified: bool = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Seed the marketplace with categories and products.
    This endpoint requires the X-Admin-Key header.
    """
    try:
        # Check if already seeded
        result = await db.execute(select(func.count(Product.id)))
        product_count = result.scalar()

        if product_count > 0:
            return {
                "success": True,
                "message": f"Marketplace already has {product_count} products. Skipping seed.",
                "products": product_count
            }

        # Seed categories first
        logger.info("Seeding categories...")
        category_map = {}
        for cat_data in CATEGORIES:
            category = Category(**cat_data)
            db.add(category)
            category_map[cat_data["slug"]] = category

        await db.flush()
        logger.info(f"Created {len(CATEGORIES)} categories")

        # Seed products
        logger.info("Seeding products...")
        for idx, prod_data in enumerate(PRODUCTS, 1):
            # Get category by slug
            category_slug = prod_data.pop("category_slug")
            category = category_map.get(category_slug)

            if category:
                prod_data["category_id"] = category.id

            # Handle data_types as JSON
            if "data_types" in prod_data:
                import json
                prod_data["data_types"] = json.dumps(prod_data["data_types"])

            product = Product(**prod_data)
            db.add(product)

        await db.commit()
        logger.info(f"Created {len(PRODUCTS)} products")

        return {
            "success": True,
            "message": "Marketplace seeded successfully",
            "categories": len(CATEGORIES),
            "products": len(PRODUCTS)
        }

    except Exception as e:
        logger.error(f"Seed failed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def admin_status(
    admin_verified: bool = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get database status"""
    try:
        cat_result = await db.execute(select(func.count(Category.id)))
        prod_result = await db.execute(select(func.count(Product.id)))

        return {
            "success": True,
            "database": {
                "categories": cat_result.scalar(),
                "products": prod_result.scalar()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
