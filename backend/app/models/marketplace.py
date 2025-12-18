"""
Marketplace Database Models

Comprehensive models for managing marketplace products, pricing tiers, and features.
Supports multiple pricing models: fixed tier, per-user, and usage-based.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class PricingModel(str, enum.Enum):
    """Pricing model types"""
    FIXED_TIER = "fixed_tier"  # QuickBooks, Shopify, Xero
    PER_USER = "per_user"  # Salesforce, Slack, Google Workspace
    PER_SEAT = "per_seat"  # Monday.com, Asana, Trello
    USAGE_BASED = "usage_based"  # Stripe, Twilio (transaction fees)
    CONTACT_BASED = "contact_based"  # Mailchimp (based on contact count)
    HYBRID = "hybrid"  # HubSpot (per-seat + contacts)


class BillingPeriod(str, enum.Enum):
    """Billing period options"""
    MONTHLY = "monthly"
    ANNUALLY = "annually"
    USAGE = "usage"  # Pay-as-you-go


class Category(Base):
    """Product categories"""
    __tablename__ = "marketplace_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    icon = Column(String(50))
    description = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="category_rel")


class Product(Base):
    """Marketplace products/integrations"""
    __tablename__ = "marketplace_products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    developer = Column(String(255), nullable=False)
    category = Column(String(100), ForeignKey("marketplace_categories.slug"), nullable=False, index=True)

    # Logo and branding
    logo = Column(String(100))  # Logo filename (e.g., "quickbooks")
    logo_url = Column(String(500))  # Full URL to logo if external
    brand_color = Column(String(7))  # Hex color (e.g., "#2CA01C")

    # Product information
    description = Column(Text)
    short_description = Column(String(500))
    has_adapter = Column(Boolean, default=False)  # Backend integration exists
    storage_info = Column(Text)  # Privacy/storage information

    # Pricing model
    pricing_model = Column(SQLEnum(PricingModel), default=PricingModel.FIXED_TIER)

    # Usage-based pricing (for Stripe, Twilio, etc.)
    transaction_fee_percent = Column(Numeric(5, 2))  # e.g., 2.90 for 2.9%
    transaction_fee_fixed = Column(Numeric(10, 2))  # e.g., 0.30 for $0.30
    per_unit_cost = Column(Numeric(10, 4))  # e.g., 0.0075 for SMS

    # Status
    active = Column(Boolean, default=True, index=True)
    featured = Column(Boolean, default=False, index=True)
    coming_soon = Column(Boolean, default=False)

    # Metadata
    website_url = Column(String(500))
    documentation_url = Column(String(500))
    support_url = Column(String(500))
    terms_url = Column(String(500))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category_rel = relationship("Category", back_populates="products")
    pricing_plans = relationship("PricingPlan", back_populates="product", cascade="all, delete-orphan")
    data_sync_types = relationship("DataSyncType", back_populates="product", cascade="all, delete-orphan")


class PricingPlan(Base):
    """Pricing tiers for products"""
    __tablename__ = "marketplace_pricing_plans"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False, index=True)

    # Plan identification
    tier = Column(String(50), nullable=False, index=True)  # starter, professional, enterprise, etc.
    name = Column(String(100), nullable=False)  # Display name

    # Pricing
    monthly_price = Column(Numeric(10, 2))  # Monthly price
    annual_price = Column(Numeric(10, 2))  # Annual price (if different)
    annual_discount_percent = Column(Integer)  # Discount percentage for annual billing

    # Per-unit pricing (for per-user/seat models)
    is_per_user = Column(Boolean, default=False)
    minimum_users = Column(Integer)  # Minimum seats/users required
    maximum_users = Column(Integer)  # Maximum users allowed (null = unlimited)

    # Free tier specifics
    is_free = Column(Boolean, default=False)
    trial_days = Column(Integer)  # Free trial period in days

    # Highlighting
    is_popular = Column(Boolean, default=False, index=True)  # "Most Popular" badge
    is_recommended = Column(Boolean, default=False)

    # Display order
    sort_order = Column(Integer, default=0)

    # Status
    active = Column(Boolean, default=True, index=True)

    # Additional costs
    setup_fee = Column(Numeric(10, 2))  # One-time setup fee
    onboarding_fee = Column(Numeric(10, 2))  # One-time onboarding fee

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="pricing_plans")
    features = relationship("PlanFeature", back_populates="plan", cascade="all, delete-orphan")
    limits = relationship("PlanLimit", back_populates="plan", cascade="all, delete-orphan")


class PlanFeature(Base):
    """Features included in pricing plans"""
    __tablename__ = "marketplace_plan_features"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False, index=True)

    # Feature details
    feature_text = Column(Text, nullable=False)  # Feature description
    category = Column(String(100))  # core, advanced, premium, etc.

    # Status
    is_included = Column(Boolean, default=True)  # True = included, False = excluded/crossed out
    is_highlight = Column(Boolean, default=False)  # Highlight this feature

    # Display order
    sort_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plan = relationship("PricingPlan", back_populates="features")


class PlanLimit(Base):
    """Usage limits for pricing plans"""
    __tablename__ = "marketplace_plan_limits"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"), nullable=False, index=True)

    # Limit identification
    limit_key = Column(String(100), nullable=False)  # e.g., "invoicesPerMonth", "storage", "users"
    limit_value = Column(String(100))  # e.g., "50", "unlimited", "2TB"
    display_text = Column(String(255))  # Human-readable text

    # Limit type
    is_unlimited = Column(Boolean, default=False)

    # Display order
    sort_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plan = relationship("PricingPlan", back_populates="limits")


class DataSyncType(Base):
    """Data types that can be synced from integrations"""
    __tablename__ = "marketplace_data_sync_types"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False, index=True)

    # Sync type details
    sync_type = Column(String(100), nullable=False)  # e.g., "Invoices", "Expenses", "Contacts"
    description = Column(Text)
    icon = Column(String(50))  # Icon name/identifier

    # Display order
    sort_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="data_sync_types")


class ProductAddon(Base):
    """Add-ons and additional features that can be purchased"""
    __tablename__ = "marketplace_product_addons"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False, index=True)

    # Add-on details
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Pricing
    monthly_price = Column(Numeric(10, 2))
    annual_price = Column(Numeric(10, 2))
    per_unit_price = Column(Numeric(10, 4))  # For per-user add-ons
    is_per_user = Column(Boolean, default=False)

    # Availability
    required_plan_tier = Column(String(50))  # Minimum plan tier required
    active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Indexes for performance
from sqlalchemy import Index

# Create composite indexes for common queries
Index('idx_product_category_active', Product.category, Product.active)
Index('idx_plan_product_tier', PricingPlan.product_id, PricingPlan.tier)
Index('idx_feature_plan_sort', PlanFeature.plan_id, PlanFeature.sort_order)
