"""
Test API Server - SQLite Version
Quick test server for marketplace API endpoints
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
from contextlib import contextmanager

app = FastAPI(title="Marketplace Test API")

DB_PATH = "marketplace_test.db"

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Response Models
class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    icon: Optional[str]
    description: Optional[str]
    product_count: int = 0

class PricingPlanSummary(BaseModel):
    id: int
    tier: str
    name: str
    monthly_price: Optional[float]
    annual_price: Optional[float]
    is_popular: bool

class ProductSummary(BaseModel):
    id: int
    name: str
    slug: str
    developer: str
    category: str
    logo: str
    brand_color: Optional[str]
    short_description: Optional[str]
    has_adapter: bool
    pricing_model: str
    starting_price: Optional[float]
    plan_count: int

class FeatureResponse(BaseModel):
    feature_text: str
    is_included: bool

class PlanDetailResponse(BaseModel):
    id: int
    tier: str
    name: str
    monthly_price: Optional[float]
    annual_price: Optional[float]
    is_per_user: bool
    is_popular: bool
    features: List[FeatureResponse] = []

class ProductDetail(BaseModel):
    id: int
    name: str
    slug: str
    developer: str
    category: str
    logo: str
    brand_color: Optional[str]
    description: Optional[str]
    has_adapter: bool
    pricing_model: str
    pricing_plans: List[PlanDetailResponse] = []
    data_sync: List[str] = []

# Endpoints
@app.get("/api/v1/marketplace/categories", response_model=List[CategoryResponse])
def get_categories():
    """Get all categories with product counts"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get categories
        cursor.execute("""
            SELECT id, name, slug, icon, description
            FROM marketplace_categories
            ORDER BY sort_order, name
        """)
        categories = []

        for row in cursor.fetchall():
            # Count products in this category
            cursor.execute("""
                SELECT COUNT(*) FROM marketplace_products
                WHERE category = ? AND active = 1
            """, (row['slug'],))
            count = cursor.fetchone()[0]

            categories.append(CategoryResponse(
                id=row['id'],
                name=row['name'],
                slug=row['slug'],
                icon=row['icon'],
                description=row['description'],
                product_count=count
            ))

        return categories

@app.get("/api/v1/marketplace/products", response_model=List[ProductSummary])
def get_products(category: Optional[str] = None, search: Optional[str] = None):
    """Get all products with optional filters"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, name, slug, developer, category, logo, brand_color,
                   short_description, has_adapter, pricing_model, active
            FROM marketplace_products
            WHERE active = 1
        """
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if search:
            query += " AND (name LIKE ? OR description LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        query += " ORDER BY featured DESC, name"

        cursor.execute(query, params)
        products = []

        for row in cursor.fetchall():
            # Get starting price
            cursor.execute("""
                SELECT MIN(CAST(monthly_price AS REAL)) as starting_price,
                       COUNT(*) as plan_count
                FROM marketplace_pricing_plans
                WHERE product_id = ? AND monthly_price > 0
            """, (row['id'],))
            price_row = cursor.fetchone()

            products.append(ProductSummary(
                id=row['id'],
                name=row['name'],
                slug=row['slug'],
                developer=row['developer'],
                category=row['category'],
                logo=row['logo'],
                brand_color=row['brand_color'],
                short_description=row['short_description'],
                has_adapter=bool(row['has_adapter']),
                pricing_model=row['pricing_model'],
                starting_price=price_row[0] if price_row[0] else None,
                plan_count=price_row[1] if price_row[1] else 0
            ))

        return products

@app.get("/api/v1/marketplace/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: int):
    """Get detailed product information"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get product
        cursor.execute("""
            SELECT id, name, slug, developer, category, logo, brand_color,
                   description, has_adapter, pricing_model
            FROM marketplace_products
            WHERE id = ? AND active = 1
        """, (product_id,))

        product_row = cursor.fetchone()
        if not product_row:
            raise HTTPException(status_code=404, detail="Product not found")

        # Get pricing plans
        cursor.execute("""
            SELECT id, tier, name,
                   CAST(monthly_price AS REAL) as monthly_price,
                   CAST(annual_price AS REAL) as annual_price,
                   is_per_user, is_popular, sort_order
            FROM marketplace_pricing_plans
            WHERE product_id = ?
            ORDER BY sort_order
        """, (product_id,))

        pricing_plans = []
        for plan_row in cursor.fetchall():
            # Get features for this plan
            cursor.execute("""
                SELECT feature_text, is_included
                FROM marketplace_plan_features
                WHERE plan_id = ?
                ORDER BY sort_order
            """, (plan_row['id'],))

            features = [
                FeatureResponse(
                    feature_text=f['feature_text'],
                    is_included=bool(f['is_included'])
                )
                for f in cursor.fetchall()
            ]

            pricing_plans.append(PlanDetailResponse(
                id=plan_row['id'],
                tier=plan_row['tier'],
                name=plan_row['name'],
                monthly_price=plan_row['monthly_price'],
                annual_price=plan_row['annual_price'],
                is_per_user=bool(plan_row['is_per_user']),
                is_popular=bool(plan_row['is_popular']),
                features=features
            ))

        # Get data sync types
        cursor.execute("""
            SELECT sync_type
            FROM marketplace_data_sync_types
            WHERE product_id = ?
            ORDER BY sort_order
        """, (product_id,))
        data_sync = [row['sync_type'] for row in cursor.fetchall()]

        return ProductDetail(
            id=product_row['id'],
            name=product_row['name'],
            slug=product_row['slug'],
            developer=product_row['developer'],
            category=product_row['category'],
            logo=product_row['logo'],
            brand_color=product_row['brand_color'],
            description=product_row['description'],
            has_adapter=bool(product_row['has_adapter']),
            pricing_model=product_row['pricing_model'],
            pricing_plans=pricing_plans,
            data_sync=data_sync
        )

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "marketplace_test.db"}

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Marketplace Test API Server...")
    print("📍 API URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("✅ Database: marketplace_test.db\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
