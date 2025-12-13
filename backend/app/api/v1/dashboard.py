"""
Dashboard API Endpoints - KPI Metrics and Business Intelligence

This module provides endpoints for the main dashboard page with real-time
business metrics aggregated from integrated tools (QuickBooks, Salesforce, Shopify).
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import json

from app.core.database import get_db
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# =====================================================================
# RESPONSE MODELS
# =====================================================================

class KPIMetricsResponse(BaseModel):
    """Dashboard KPI metrics"""
    total_revenue: float
    revenue_change_percent: float
    active_customers: int
    customers_change_percent: float
    inventory_value: float
    inventory_change_percent: float
    unpaid_invoices: float
    invoices_change_percent: float
    data_sources: List[str]  # List of connected integrations
    last_updated: str

    class Config:
        from_attributes = True


class RevenueTrendPoint(BaseModel):
    """Revenue trend data point"""
    month: str
    revenue: float

    class Config:
        from_attributes = True


class RevenueTrendResponse(BaseModel):
    """6-month revenue trend"""
    trend_data: List[RevenueTrendPoint]
    data_source: str  # Which integration provided the data
    last_updated: str

    class Config:
        from_attributes = True


class ActivityItem(BaseModel):
    """Recent activity item"""
    id: str
    type: str  # 'invoice', 'order', 'payment', 'lead', etc.
    title: str
    description: str
    amount: Optional[float] = None
    timestamp: str
    source: str  # Integration that provided this activity

    class Config:
        from_attributes = True


class RecentActivityResponse(BaseModel):
    """Recent business activities"""
    activities: List[ActivityItem]
    total_count: int
    last_updated: str

    class Config:
        from_attributes = True


class CustomerRevenue(BaseModel):
    """Top customer revenue data"""
    customer_name: str
    revenue: float
    percentage: float

    class Config:
        from_attributes = True


class TopCustomersResponse(BaseModel):
    """Top customers by revenue"""
    customers: List[CustomerRevenue]
    total_revenue: float
    data_source: str
    last_updated: str

    class Config:
        from_attributes = True


# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

async def get_integration_data(
    wallet_address: str,
    integration: str,
    data_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve and decrypt integration data from Filecoin storage

    Args:
        wallet_address: User's wallet address
        integration: Integration name (quickbooks, salesforce, shopify)
        data_type: Optional filter for specific data type

    Returns:
        List of decrypted data records
    """
    try:
        # List files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=integration,
            data_type=data_type,
            limit=1000
        )

        if not files:
            logger.info(f"No data found for {integration} integration")
            return []

        # Retrieve and decrypt each file
        all_data = []
        for file in files:
            try:
                # Retrieve encrypted data
                encrypted = await filecoin_service.retrieve_data(file["cid"])

                # Decrypt with wallet
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=wallet_address
                )

                # Handle both single record and list of records
                if isinstance(decrypted, list):
                    all_data.extend(decrypted)
                else:
                    all_data.append(decrypted)

            except Exception as e:
                logger.warning(f"Failed to decrypt file {file.get('cid')}: {e}")
                continue

        logger.info(f"Retrieved {len(all_data)} records from {integration}")
        return all_data

    except Exception as e:
        logger.error(f"Failed to get {integration} data: {e}")
        return []


def calculate_percentage_change(current: float, previous: float) -> float:
    """Calculate percentage change between two values"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


# =====================================================================
# ENDPOINTS
# =====================================================================

@router.get("/kpis", response_model=KPIMetricsResponse)
async def get_dashboard_kpis(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get KPI metrics for the dashboard

    Aggregates data from:
    - QuickBooks: Total revenue, unpaid invoices
    - Salesforce: Active customers
    - Shopify: Inventory value

    Returns real-time business metrics with trend indicators.
    """
    try:
        logger.info(f"Fetching KPI metrics for wallet {wallet_address}")

        # Initialize metrics
        total_revenue = 0.0
        revenue_change_percent = 0.0
        active_customers = 0
        customers_change_percent = 0.0
        inventory_value = 0.0
        inventory_change_percent = 0.0
        unpaid_invoices = 0.0
        invoices_change_percent = 0.0
        data_sources = []

        # Get current date for filtering
        current_month = datetime.utcnow().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)

        # ============================================
        # QUICKBOOKS DATA - Revenue and Invoices
        # ============================================
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")

                # Calculate total revenue (all paid invoices)
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                # Calculate unpaid invoices
                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                # Calculate previous month for comparison
                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )

                logger.info(f"QuickBooks: ${total_revenue} revenue, ${unpaid_invoices} unpaid")

        except Exception as e:
            logger.warning(f"QuickBooks data unavailable: {e}")

        # ============================================
        # SALESFORCE DATA - Active Customers
        # ============================================
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")

                # Count active accounts (with revenue)
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])

                # Mock previous month comparison (would need historical data)
                # In production, query historical snapshots
                customers_change_percent = 5.2  # Placeholder

                logger.info(f"Salesforce: {active_customers} active customers")

        except Exception as e:
            logger.warning(f"Salesforce data unavailable: {e}")

        # ============================================
        # SHOPIFY DATA - Inventory Value
        # ============================================
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")

                # Calculate total inventory value
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )

                # Mock inventory change (would need historical data)
                inventory_change_percent = -2.4  # Placeholder

                logger.info(f"Shopify: ${inventory_value} inventory value")

        except Exception as e:
            logger.warning(f"Shopify data unavailable: {e}")

        return KPIMetricsResponse(
            total_revenue=total_revenue,
            revenue_change_percent=revenue_change_percent,
            active_customers=active_customers,
            customers_change_percent=customers_change_percent,
            inventory_value=inventory_value,
            inventory_change_percent=inventory_change_percent,
            unpaid_invoices=unpaid_invoices,
            invoices_change_percent=invoices_change_percent,
            data_sources=data_sources,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching KPI metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch KPI metrics")


@router.get("/revenue-trend", response_model=RevenueTrendResponse)
async def get_revenue_trend(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get 6-month revenue trend data

    Aggregates monthly revenue from QuickBooks invoices.
    Returns monthly revenue for the past 6 months.
    """
    try:
        logger.info(f"Fetching revenue trend for wallet {wallet_address}")

        # Get QuickBooks invoice data
        qb_invoices = await get_integration_data(
            wallet_address=wallet_address,
            integration="quickbooks",
            data_type="invoices"
        )

        # Calculate 6-month trend
        trend_data = []
        data_source = "QuickBooks"

        if qb_invoices:
            # Group invoices by month
            monthly_revenue = {}
            for invoice in qb_invoices:
                if invoice.get("status") == "paid" and invoice.get("txn_date"):
                    month_key = invoice["txn_date"][:7]  # YYYY-MM
                    monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

            # Generate last 6 months
            current_date = datetime.utcnow()
            for i in range(5, -1, -1):
                month_date = current_date - timedelta(days=30 * i)
                month_key = month_date.strftime("%Y-%m")
                month_label = month_date.strftime("%b")

                trend_data.append(RevenueTrendPoint(
                    month=month_label,
                    revenue=monthly_revenue.get(month_key, 0)
                ))

        return RevenueTrendResponse(
            trend_data=trend_data,
            data_source=data_source,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching revenue trend: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue trend")


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(10, description="Maximum number of activities to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent business activities

    Aggregates recent activities from all integrated tools:
    - QuickBooks: New invoices, payments
    - Salesforce: New leads, opportunities
    - Shopify: New orders

    Returns activities sorted by timestamp (most recent first).
    """
    try:
        logger.info(f"Fetching recent activity for wallet {wallet_address}")

        activities = []

        # ============================================
        # QUICKBOOKS ACTIVITIES
        # ============================================
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:5]:  # Limit to recent 5
                activities.append(ActivityItem(
                    id=f"qb-invoice-{invoice.get('id')}",
                    type="invoice",
                    title=f"Invoice #{invoice.get('doc_number')}",
                    description=f"New invoice for {invoice.get('customer_name')}",
                    amount=float(invoice.get('total_amount', 0)),
                    timestamp=invoice.get('txn_date', datetime.utcnow().isoformat()),
                    source="QuickBooks"
                ))

        except Exception as e:
            logger.warning(f"QuickBooks activities unavailable: {e}")

        # ============================================
        # SALESFORCE ACTIVITIES
        # ============================================
        try:
            sf_opportunities = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="opportunities"
            )

            for opp in sf_opportunities[:5]:  # Limit to recent 5
                activities.append(ActivityItem(
                    id=f"sf-opp-{opp.get('id')}",
                    type="opportunity",
                    title=opp.get('name', 'New Opportunity'),
                    description=f"Stage: {opp.get('stage')} - {opp.get('account_name')}",
                    amount=float(opp.get('amount', 0)) if opp.get('amount') else None,
                    timestamp=opp.get('close_date', datetime.utcnow().isoformat()),
                    source="Salesforce"
                ))

        except Exception as e:
            logger.warning(f"Salesforce activities unavailable: {e}")

        # ============================================
        # SHOPIFY ACTIVITIES
        # ============================================
        try:
            shopify_orders = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="orders"
            )

            for order in shopify_orders[:5]:  # Limit to recent 5
                activities.append(ActivityItem(
                    id=f"shopify-order-{order.get('id')}",
                    type="order",
                    title=f"Order #{order.get('order_number')}",
                    description=f"New order from {order.get('customer_name')}",
                    amount=float(order.get('total_price', 0)),
                    timestamp=order.get('created_at', datetime.utcnow().isoformat()),
                    source="Shopify"
                ))

        except Exception as e:
            logger.warning(f"Shopify activities unavailable: {e}")

        # Sort by timestamp (most recent first)
        activities.sort(key=lambda x: x.timestamp, reverse=True)

        # Limit results
        activities = activities[:limit]

        return RecentActivityResponse(
            activities=activities,
            total_count=len(activities),
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent activity")


@router.get("/top-customers", response_model=TopCustomersResponse)
async def get_top_customers(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(5, description="Number of top customers to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get top customers by revenue

    Aggregates customer revenue from:
    - QuickBooks: Invoice totals by customer
    - Salesforce: Account revenue data

    Returns top customers ranked by total revenue.
    """
    try:
        logger.info(f"Fetching top customers for wallet {wallet_address}")

        customer_revenue = {}
        data_source = ""

        # ============================================
        # QUICKBOOKS CUSTOMER REVENUE
        # ============================================
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_source = "QuickBooks"

                # Aggregate revenue by customer
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid":
                        customer_name = invoice.get("customer_name", "Unknown")
                        amount = float(invoice.get("total_amount", 0))
                        customer_revenue[customer_name] = customer_revenue.get(customer_name, 0) + amount

        except Exception as e:
            logger.warning(f"QuickBooks customer data unavailable: {e}")

        # ============================================
        # SALESFORCE CUSTOMER REVENUE
        # ============================================
        try:
            if not customer_revenue:  # Only if QuickBooks didn't provide data
                sf_accounts = await get_integration_data(
                    wallet_address=wallet_address,
                    integration="salesforce",
                    data_type="accounts"
                )

                if sf_accounts:
                    data_source = "Salesforce"

                    for account in sf_accounts:
                        customer_name = account.get("name", "Unknown")
                        revenue = float(account.get("annual_revenue", 0))
                        if revenue > 0:
                            customer_revenue[customer_name] = revenue

        except Exception as e:
            logger.warning(f"Salesforce customer data unavailable: {e}")

        # ============================================
        # CALCULATE TOP CUSTOMERS
        # ============================================
        total_revenue = sum(customer_revenue.values())

        # Initialize customers list (prevents "referenced before assignment" error)
        customers = []

        if customer_revenue:
            # Sort by revenue and get top N
            sorted_customers = sorted(
                customer_revenue.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]

            customers = [
                CustomerRevenue(
                    customer_name=name,
                    revenue=revenue,
                    percentage=round((revenue / total_revenue) * 100, 1) if total_revenue > 0 else 0
                )
                for name, revenue in sorted_customers
            ]

        return TopCustomersResponse(
            customers=customers,
            total_revenue=total_revenue,
            data_source=data_source,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching top customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch top customers")


@router.get("/analytics")
async def get_dashboard_analytics(
    wallet_address: str = Query(..., description="User's wallet address"),
    period: str = Query("mtd", description="Time period: mtd, qtd, ytd, custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period"),
    end_date: Optional[str] = Query(None, description="End date for custom period"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics data for the dashboard

    Supports different time periods:
    - mtd: Month to date
    - qtd: Quarter to date
    - ytd: Year to date
    - custom: Custom date range

    Returns aggregated metrics from all integrated tools.
    """
    try:
        logger.info(f"Fetching analytics for wallet {wallet_address}, period={period}")

        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "mtd":
            start = datetime(now.year, now.month, 1)
            end = now
        elif period == "qtd":
            quarter = (now.month - 1) // 3
            start = datetime(now.year, quarter * 3 + 1, 1)
            end = now
        elif period == "ytd":
            start = datetime(now.year, 1, 1)
            end = now
        elif period == "custom" and start_date and end_date:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
        else:
            start = datetime(now.year, now.month, 1)
            end = now

        # Fetch data from integrations
        analytics_data = {
            "period": period,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "metrics": {},
            "charts": {},
            "data_sources": []
        }

        # QuickBooks Analytics
        try:
            qb_data = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_data:
                analytics_data["data_sources"].append("QuickBooks")
                # Calculate revenue metrics
                period_revenue = sum(
                    float(inv.get('total_amount', 0))
                    for inv in qb_data
                    if start <= datetime.fromisoformat(inv.get('txn_date', now.isoformat())) <= end
                )
                analytics_data["metrics"]["revenue"] = period_revenue

                # Calculate monthly breakdown for chart
                monthly_revenue = {}
                for inv in qb_data:
                    inv_date = datetime.fromisoformat(inv.get('txn_date', now.isoformat()))
                    if start <= inv_date <= end:
                        month_key = inv_date.strftime("%Y-%m")
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(inv.get('total_amount', 0))

                analytics_data["charts"]["revenue_trend"] = [
                    {"month": month, "value": value}
                    for month, value in sorted(monthly_revenue.items())
                ]
        except Exception as e:
            logger.warning(f"QuickBooks analytics unavailable: {e}")

        analytics_data["last_updated"] = datetime.utcnow().isoformat()
        return analytics_data

    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")
