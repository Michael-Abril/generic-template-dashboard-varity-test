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

router = APIRouter(tags=["admin"])

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
# Matches Product model fields: name, slug, developer, category, logo_url,
# description, short_description, coming_soon, active, has_adapter
# =====================================================================

PRODUCTS = [
    # ACCOUNTING
    {
        "name": "QuickBooks",
        "slug": "quickbooks",
        "developer": "Intuit",
        "category": "accounting",
        "logo": "quickbooks",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Intuit_QuickBooks_logo.svg/1200px-Intuit_QuickBooks_logo.svg.png",
        "description": "Industry-leading accounting software for small businesses. Track expenses, create invoices, and manage your finances.",
        "short_description": "Accounting & invoicing for small business",
        "coming_soon": False,
        "active": True,
        "has_adapter": True
    },
    {
        "name": "Xero",
        "slug": "xero",
        "developer": "Xero Limited",
        "category": "accounting",
        "logo": "xero",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Xero_software_logo.svg/1200px-Xero_software_logo.svg.png",
        "description": "Beautiful accounting software for small businesses. Connect your bank, track projects, and collaborate with your team.",
        "short_description": "Cloud accounting for modern businesses",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "FreshBooks",
        "slug": "freshbooks",
        "developer": "FreshBooks",
        "category": "accounting",
        "logo": "freshbooks",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/4/4f/FreshBooks_logo.png",
        "description": "Invoicing and accounting software built for small business owners. Simple, intuitive, and powerful.",
        "short_description": "Invoicing made easy",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # PRODUCTIVITY
    {
        "name": "Google Workspace",
        "slug": "google",
        "developer": "Google",
        "category": "productivity",
        "logo": "google",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png",
        "description": "Complete productivity suite including Gmail, Drive, Docs, Sheets, and more. Collaborate in real-time with your team.",
        "short_description": "Email, docs, and productivity suite",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Microsoft 365",
        "slug": "microsoft",
        "developer": "Microsoft",
        "category": "productivity",
        "logo": "microsoft",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png",
        "description": "Office apps and cloud services for business. Word, Excel, PowerPoint, Outlook, Teams, and more.",
        "short_description": "Office apps and business tools",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # COMMUNICATION
    {
        "name": "Slack",
        "slug": "slack",
        "developer": "Salesforce",
        "category": "communication",
        "logo": "slack",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/1200px-Slack_icon_2019.svg.png",
        "description": "Business messaging platform for teams. Channels, direct messages, integrations, and powerful search.",
        "short_description": "Team messaging and collaboration",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Zoom",
        "slug": "zoom",
        "developer": "Zoom Video Communications",
        "category": "communication",
        "logo": "zoom",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Zoom_Logo_2022.svg/1200px-Zoom_Logo_2022.svg.png",
        "description": "Video conferencing and online meeting platform. HD video, screen sharing, and recording.",
        "short_description": "Video meetings and webinars",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # CRM
    {
        "name": "HubSpot",
        "slug": "hubspot",
        "developer": "HubSpot",
        "category": "crm",
        "logo": "hubspot",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HubSpot_Logo.svg/1200px-HubSpot_Logo.svg.png",
        "description": "Complete CRM platform with marketing, sales, and service tools. Free to start, scales as you grow.",
        "short_description": "CRM, marketing & sales platform",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Salesforce",
        "slug": "salesforce",
        "developer": "Salesforce",
        "category": "crm",
        "logo": "salesforce",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/1200px-Salesforce.com_logo.svg.png",
        "description": "World's #1 CRM platform. Sales, service, marketing, and analytics in one integrated platform.",
        "short_description": "Enterprise CRM platform",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # E-COMMERCE
    {
        "name": "Shopify",
        "slug": "shopify",
        "developer": "Shopify",
        "category": "e-commerce",
        "logo": "shopify",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/1200px-Shopify_logo_2018.svg.png",
        "description": "E-commerce platform for online stores. Sell products, process payments, and manage inventory.",
        "short_description": "E-commerce and online store platform",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # PAYMENTS
    {
        "name": "Stripe",
        "slug": "stripe",
        "developer": "Stripe",
        "category": "payments",
        "logo": "stripe",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/1200px-Stripe_Logo%2C_revised_2016.svg.png",
        "description": "Payment processing infrastructure. Accept payments, send payouts, and manage finances online.",
        "short_description": "Payment processing infrastructure",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Square",
        "slug": "square",
        "developer": "Square (Block)",
        "category": "pos",
        "logo": "square",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Square%2C_Inc._-_Square_logo.svg/1200px-Square%2C_Inc._-_Square_logo.svg.png",
        "description": "Point of sale, payments, and business tools. Accept payments anywhere with Square hardware.",
        "short_description": "POS and payment processing",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "PayPal",
        "slug": "paypal",
        "developer": "PayPal",
        "category": "payments",
        "logo": "paypal",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png",
        "description": "Online payment system supporting online money transfers. Accept payments from around the world.",
        "short_description": "Online payments and money transfers",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    # CUSTOMER SUPPORT
    {
        "name": "Zendesk",
        "slug": "zendesk",
        "developer": "Zendesk",
        "category": "customer-support",
        "logo": "zendesk",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Zendesk_logo.svg/1200px-Zendesk_logo.svg.png",
        "description": "Customer service software and support ticketing system. Help desk, chat, and knowledge base.",
        "short_description": "Customer service and help desk",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Intercom",
        "slug": "intercom",
        "developer": "Intercom",
        "category": "customer-support",
        "logo": "intercom",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/6/69/Intercom_logo.svg",
        "description": "Customer messaging platform. Live chat, bots, and product tours for customer engagement.",
        "short_description": "Customer messaging platform",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    # MARKETING
    {
        "name": "Mailchimp",
        "slug": "mailchimp",
        "developer": "Intuit",
        "category": "marketing",
        "logo": "mailchimp",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Mailchimp_Logo_2018.svg/1200px-Mailchimp_Logo_2018.svg.png",
        "description": "Email marketing and automation platform. Build campaigns, manage audiences, and track results.",
        "short_description": "Email marketing and automation",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # PROJECT MANAGEMENT
    {
        "name": "Asana",
        "slug": "asana",
        "developer": "Asana",
        "category": "project-management",
        "logo": "asana",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Asana_logo.svg/1200px-Asana_logo.svg.png",
        "description": "Work management platform for teams. Organize projects, track tasks, and hit deadlines.",
        "short_description": "Project and task management",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Trello",
        "slug": "trello",
        "developer": "Atlassian",
        "category": "project-management",
        "logo": "trello",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Trello_logo.svg/1200px-Trello_logo.svg.png",
        "description": "Visual project management with boards, lists, and cards. Simple and flexible for any workflow.",
        "short_description": "Visual project boards",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    {
        "name": "Monday.com",
        "slug": "monday",
        "developer": "Monday.com",
        "category": "project-management",
        "logo": "monday",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/c/c6/Monday_logo.svg",
        "description": "Work operating system for teams. Manage projects, workflows, and team collaboration.",
        "short_description": "Work OS for team productivity",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    # DOCUMENTS
    {
        "name": "DocuSign",
        "slug": "docusign",
        "developer": "DocuSign",
        "category": "documents",
        "logo": "docusign",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/DocuSign_Logo.png/1200px-DocuSign_Logo.png",
        "description": "Electronic signature and agreement cloud. Sign, send, and manage documents securely.",
        "short_description": "Electronic signatures and agreements",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # STORAGE
    {
        "name": "Dropbox",
        "slug": "dropbox",
        "developer": "Dropbox",
        "category": "storage",
        "logo": "dropbox",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Dropbox_Icon.svg/1200px-Dropbox_Icon.svg.png",
        "description": "Cloud file storage and sharing. Store files, sync across devices, and collaborate with teams.",
        "short_description": "Cloud storage and file sharing",
        "coming_soon": False,
        "active": True,
        "has_adapter": False
    },
    # PAYROLL & HR
    {
        "name": "Gusto",
        "slug": "gusto",
        "developer": "Gusto",
        "category": "payroll-hr",
        "logo": "gusto",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Gusto_Logo.svg/1200px-Gusto_Logo.svg.png",
        "description": "Payroll, benefits, and HR for modern businesses. Easy setup, automatic tax filing, and compliance.",
        "short_description": "Payroll and HR platform",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    # SCHEDULING
    {
        "name": "Calendly",
        "slug": "calendly",
        "developer": "Calendly",
        "category": "scheduling",
        "logo": "calendly",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Calendly-Logo-Square.png",
        "description": "Scheduling automation platform. Share availability, book meetings, and eliminate scheduling conflicts.",
        "short_description": "Meeting scheduling automation",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    },
    # DESIGN
    {
        "name": "Canva",
        "slug": "canva",
        "developer": "Canva",
        "category": "design",
        "logo": "canva",
        "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bb/Canva_Logo.svg/1200px-Canva_Logo.svg.png",
        "description": "Graphic design platform for creating presentations, social media graphics, and marketing materials.",
        "short_description": "Graphic design made easy",
        "coming_soon": True,
        "active": True,
        "has_adapter": False
    }
]


@router.post("/seed-marketplace")
async def seed_marketplace(
    force: bool = False,
    admin_verified: bool = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Seed the marketplace with categories and products.
    This endpoint requires the X-Admin-Key header.

    Args:
        force: If True, delete existing data and reseed
    """
    try:
        # Check if already seeded
        result = await db.execute(select(func.count(Product.id)))
        product_count = result.scalar()

        if product_count > 0 and not force:
            return {
                "success": True,
                "message": f"Marketplace already has {product_count} products. Use ?force=true to reseed.",
                "products": product_count
            }

        # If force, clear existing data
        if force and product_count > 0:
            logger.info("Force flag set - clearing existing marketplace data...")
            from sqlalchemy import delete
            await db.execute(delete(Product))
            await db.execute(delete(Category))
            await db.commit()
            logger.info("Existing data cleared")

        # Seed categories first
        logger.info("Seeding categories...")
        for cat_data in CATEGORIES:
            category = Category(**cat_data)
            db.add(category)

        await db.flush()
        logger.info(f"Created {len(CATEGORIES)} categories")

        # Seed products - product data already has correct field names
        logger.info("Seeding products...")
        for prod_data in PRODUCTS:
            # Create a copy to avoid modifying the original
            data = prod_data.copy()
            product = Product(**data)
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
