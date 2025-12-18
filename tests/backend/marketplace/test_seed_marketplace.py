"""
Test Seed Script - Synchronous SQLite Version
For quick testing without PostgreSQL
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, Column, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
import enum
from datetime import datetime

# SQLite database
SQLITE_URL = "sqlite:///./marketplace_test.db"
engine = create_engine(SQLITE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Recreate models for SQLite (simplified)
class PricingModel(str, enum.Enum):
    FIXED_TIER = "fixed_tier"
    PER_USER = "per_user"
    PER_SEAT = "per_seat"
    USAGE_BASED = "usage_based"
    CONTACT_BASED = "contact_based"
    HYBRID = "hybrid"

class Category(Base):
    __tablename__ = "marketplace_categories"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50))
    description = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)  # Added missing column
    products = relationship("Product", back_populates="category_rel")

class Product(Base):
    __tablename__ = "marketplace_products"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    developer = Column(String(255), nullable=False)
    category = Column(String(100), ForeignKey("marketplace_categories.slug"), nullable=False)
    logo = Column(String(100))
    logo_url = Column(String(500))  # Added missing column
    brand_color = Column(String(7))
    description = Column(Text)
    short_description = Column(String(500))
    has_adapter = Column(Boolean, default=False)
    storage_info = Column(Text)
    pricing_model = Column(SQLEnum(PricingModel), default=PricingModel.FIXED_TIER)
    transaction_fee_percent = Column(Numeric(5, 2))
    transaction_fee_fixed = Column(Numeric(10, 2))
    per_unit_cost = Column(Numeric(10, 4))
    active = Column(Boolean, default=True)
    featured = Column(Boolean, default=False)
    coming_soon = Column(Boolean, default=False)  # Added missing column
    website_url = Column(String(500))  # Added missing column
    documentation_url = Column(String(500))  # Added missing column
    support_url = Column(String(500))  # Added missing column
    terms_url = Column(String(500))  # Added missing column
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)  # Added missing column
    category_rel = relationship("Category", back_populates="products")
    pricing_plans = relationship("PricingPlan", back_populates="product", cascade="all, delete-orphan")
    data_sync_types = relationship("DataSyncType", back_populates="product", cascade="all, delete-orphan")

class PricingPlan(Base):
    __tablename__ = "marketplace_pricing_plans"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)
    tier = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    monthly_price = Column(Numeric(10, 2))
    annual_price = Column(Numeric(10, 2))
    annual_discount_percent = Column(Integer)
    is_per_user = Column(Boolean, default=False)
    minimum_users = Column(Integer)
    maximum_users = Column(Integer)
    is_free = Column(Boolean, default=False)
    trial_days = Column(Integer)  # Added missing column
    is_popular = Column(Boolean, default=False)
    is_recommended = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    setup_fee = Column(Numeric(10, 2))
    onboarding_fee = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)  # Added missing column
    product = relationship("Product", back_populates="pricing_plans")
    features = relationship("PlanFeature", back_populates="plan", cascade="all, delete-orphan")
    limits = relationship("PlanLimit", back_populates="plan", cascade="all, delete-orphan")

class PlanFeature(Base):
    __tablename__ = "marketplace_plan_features"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)
    feature_text = Column(Text, nullable=False)
    category = Column(String(100))
    is_included = Column(Boolean, default=True)
    is_highlight = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan = relationship("PricingPlan", back_populates="features")

class PlanLimit(Base):
    __tablename__ = "marketplace_plan_limits"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"), nullable=False)
    limit_key = Column(String(100), nullable=False)
    limit_value = Column(String(100))
    display_text = Column(String(255))
    is_unlimited = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan = relationship("PricingPlan", back_populates="limits")

class DataSyncType(Base):
    __tablename__ = "marketplace_data_sync_types"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)
    sync_type = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    product = relationship("Product", back_populates="data_sync_types")

# Import product data
from scripts.marketplace_data import PRODUCTS_DATA

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
    {"name": "Storage", "slug": "storage", "icon": "hard-drive", "description": "Cloud file storage and sharing", "sort_order": 11}
]

def seed_categories(session):
    """Seed product categories"""
    print("📁 Seeding categories...")
    for cat_data in CATEGORIES:
        category = Category(**cat_data)
        session.add(category)
    session.commit()
    print(f"   ✅ Created {len(CATEGORIES)} categories")

def seed_product(session, product_data):
    """Seed a single product with all its pricing and features"""
    # Create product
    product_dict = dict(product_data["product"])
    if "pricing_model" in product_dict and hasattr(product_dict["pricing_model"], "value"):
        product_dict["pricing_model"] = product_dict["pricing_model"].value

    product = Product(**product_dict)
    session.add(product)
    session.flush()

    # Create pricing plans
    plans_map = {}
    for plan_data in product_data["pricing_plans"]:
        plan = PricingPlan(product_id=product.id, **plan_data)
        session.add(plan)
        session.flush()
        plans_map[plan_data["tier"]] = plan

    # Create features for each plan
    if "features" in product_data:
        for tier, features_list in product_data["features"].items():
            plan = plans_map.get(tier)
            if plan:
                for idx, feature_text in enumerate(features_list):
                    feature = PlanFeature(
                        plan_id=plan.id,
                        product_id=product.id,
                        feature_text=feature_text,
                        sort_order=idx
                    )
                    session.add(feature)

    # Create limits for each plan
    if "limits" in product_data:
        for tier, limits_dict in product_data["limits"].items():
            plan = plans_map.get(tier)
            if plan:
                for idx, (key, value) in enumerate(limits_dict.items()):
                    limit = PlanLimit(
                        plan_id=plan.id,
                        limit_key=key,
                        limit_value=value,
                        is_unlimited=(value.lower() == "unlimited"),
                        sort_order=idx
                    )
                    session.add(limit)

    # Create data sync types
    if "data_sync" in product_data:
        for idx, sync_type in enumerate(product_data["data_sync"]):
            data_sync = DataSyncType(
                product_id=product.id,
                sync_type=sync_type,
                sort_order=idx
            )
            session.add(data_sync)

    session.commit()
    print(f"   ✅ Created {product.name} with {len(product_data['pricing_plans'])} plans")

def main():
    """Main seed function"""
    print("\n" + "="*70)
    print("🌱 MARKETPLACE DATABASE SEED (SQLite Test Version)")
    print("="*70 + "\n")

    # Create all tables
    print("🔧 Creating database tables...")
    Base.metadata.drop_all(engine)  # Drop existing
    Base.metadata.create_all(engine)
    print("   ✅ Tables created\n")

    session = SessionLocal()
    try:
        # Seed categories
        seed_categories(session)
        print()

        # Seed all products
        print("📦 Seeding products...")
        for idx, product_data in enumerate(PRODUCTS_DATA, 1):
            seed_product(session, product_data)

        print(f"\n   ✅ Successfully seeded {len(PRODUCTS_DATA)} products\n")

        print("="*70)
        print("✅ SEED COMPLETED SUCCESSFULLY")
        print(f"   📊 Total: {len(CATEGORIES)} categories, {len(PRODUCTS_DATA)} products")
        print(f"   📁 Database: marketplace_test.db")
        print("="*70 + "\n")

    except Exception as e:
        print(f"\n❌ Error during seed: {str(e)}")
        import traceback
        traceback.print_exc()
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()
