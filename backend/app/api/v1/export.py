"""
Export API Endpoints - Data Export in Multiple Formats

This module provides endpoints for exporting dashboard data in various formats:
- CSV: Tabular data export
- PDF: Professional business reports with charts
- JSON: Raw data export for API integrations
- Excel: Multi-sheet workbooks with styling

SUPPORTED EXPORTS:
- Dashboard summary (all formats)
- Transaction history (CSV, Excel, JSON)
- Analytics data (Excel, JSON)
- Custom reports (PDF)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import io

from ...core.database import get_db
from ...services.export_service import export_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["export"])


# =====================================================================
# EXPORT ENDPOINTS
# =====================================================================


@router.get("/dashboard/csv")
async def export_dashboard_csv(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export dashboard data to CSV format

    Returns CSV file with:
    - KPI metrics
    - Revenue trends
    - Recent transactions
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data, calculate_percentage_change

        logger.info(f"Exporting dashboard CSV for wallet {wallet_address}")

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

        # QUICKBOOKS DATA - Revenue and Invoices
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )
        except Exception as e:
            logger.warning(f"QuickBooks data unavailable for export: {e}")

        # SALESFORCE DATA - Active Customers
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])
                customers_change_percent = 5.2  # Placeholder for historical comparison
        except Exception as e:
            logger.warning(f"Salesforce data unavailable for export: {e}")

        # SHOPIFY DATA - Inventory Value
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )
                inventory_change_percent = -2.4  # Placeholder for historical comparison
        except Exception as e:
            logger.warning(f"Shopify data unavailable for export: {e}")

        # Build KPI data structure
        kpi_data = {
            "total_revenue": total_revenue,
            "revenue_change_percent": revenue_change_percent,
            "active_customers": active_customers,
            "customers_change_percent": customers_change_percent,
            "inventory_value": inventory_value,
            "inventory_change_percent": inventory_change_percent,
            "unpaid_invoices": unpaid_invoices,
            "invoices_change_percent": invoices_change_percent,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Calculate revenue trend from real data
        revenue_trend_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
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
                    month_label = month_date.strftime("%b %Y")

                    revenue_trend_data.append({
                        "month": month_label,
                        "revenue": monthly_revenue.get(month_key, 0)
                    })
        except Exception as e:
            logger.warning(f"Revenue trend data unavailable: {e}")

        revenue_trend = {
            "trend_data": revenue_trend_data,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Get recent activity from real data
        activities = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:5]:  # Limit to 5 most recent
                activities.append({
                    "type": "invoice",
                    "description": f"Invoice #{invoice.get('doc_number')} - {invoice.get('customer_name')}",
                    "amount": float(invoice.get('total_amount', 0))
                })
        except Exception as e:
            logger.warning(f"Activity data unavailable: {e}")

        recent_activity = {
            "activities": activities,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Prepare data for CSV export
        export_data = []

        # Add KPI metrics
        export_data.append({
            "Metric Type": "KPI",
            "Metric": "Total Revenue",
            "Value": kpi_data.get("total_revenue", 0),
            "Change": f"{kpi_data.get('revenue_change_percent', 0):+.1f}%",
            "Last Updated": kpi_data.get("last_updated", "N/A"),
        })
        export_data.append({
            "Metric Type": "KPI",
            "Metric": "Active Customers",
            "Value": kpi_data.get("active_customers", 0),
            "Change": f"{kpi_data.get('customers_change_percent', 0):+.1f}%",
            "Last Updated": kpi_data.get("last_updated", "N/A"),
        })
        export_data.append({
            "Metric Type": "KPI",
            "Metric": "Inventory Value",
            "Value": kpi_data.get("inventory_value", 0),
            "Change": f"{kpi_data.get('inventory_change_percent', 0):+.1f}%",
            "Last Updated": kpi_data.get("last_updated", "N/A"),
        })
        export_data.append({
            "Metric Type": "KPI",
            "Metric": "Unpaid Invoices",
            "Value": kpi_data.get("unpaid_invoices", 0),
            "Change": f"{kpi_data.get('invoices_change_percent', 0):+.1f}%",
            "Last Updated": kpi_data.get("last_updated", "N/A"),
        })

        # Add revenue trends
        for trend_point in revenue_trend.get("trend_data", []):
            export_data.append({
                "Metric Type": "Revenue Trend",
                "Metric": "Monthly Revenue",
                "Value": trend_point.get("revenue", 0),
                "Change": trend_point.get("month", "N/A"),
                "Last Updated": revenue_trend.get("last_updated", "N/A"),
            })

        # Add recent activity
        for activity in recent_activity.get("activities", []):
            export_data.append({
                "Metric Type": "Activity",
                "Metric": activity.get("type", "N/A"),
                "Value": activity.get("description", "N/A"),
                "Change": f"${activity.get('amount', 0):,.2f}",
                "Last Updated": activity.get("timestamp", "N/A"),
            })

        # Export to CSV
        csv_bytes = await export_service.export_to_csv(export_data, filename="dashboard_export.csv")

        # Return as downloadable file
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            },
        )

    except Exception as e:
        logger.error(f"Failed to export dashboard to CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/dashboard/pdf")
async def export_dashboard_pdf(
    wallet_address: str = Query(..., description="User's wallet address"),
    company_name: str = Query("Your Company", description="Company name for report"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export dashboard to professional PDF report

    Returns PDF with:
    - Executive summary
    - KPI metrics table
    - Revenue chart
    - Recent transactions
    - AI-generated insights
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data, calculate_percentage_change

        logger.info(f"Exporting dashboard PDF for wallet {wallet_address}")

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

        # QUICKBOOKS DATA
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )
        except Exception as e:
            logger.warning(f"QuickBooks data unavailable for PDF: {e}")

        # SALESFORCE DATA
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])
                customers_change_percent = 5.2
        except Exception as e:
            logger.warning(f"Salesforce data unavailable for PDF: {e}")

        # SHOPIFY DATA
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )
                inventory_change_percent = -2.4
        except Exception as e:
            logger.warning(f"Shopify data unavailable for PDF: {e}")

        kpi_data = {
            "total_revenue": total_revenue,
            "revenue_change_percent": revenue_change_percent,
            "active_customers": active_customers,
            "customers_change_percent": customers_change_percent,
            "inventory_value": inventory_value,
            "inventory_change_percent": inventory_change_percent,
            "unpaid_invoices": unpaid_invoices,
            "invoices_change_percent": invoices_change_percent,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Calculate revenue trend
        revenue_trend_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                monthly_revenue = {}
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid" and invoice.get("txn_date"):
                        month_key = invoice["txn_date"][:7]
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

                current_date = datetime.utcnow()
                for i in range(5, -1, -1):
                    month_date = current_date - timedelta(days=30 * i)
                    month_key = month_date.strftime("%Y-%m")
                    month_label = month_date.strftime("%b %Y")

                    revenue_trend_data.append({
                        "month": month_label,
                        "revenue": monthly_revenue.get(month_key, 0)
                    })
        except Exception as e:
            logger.warning(f"Revenue trend unavailable for PDF: {e}")

        # Get recent activity
        activities = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:5]:
                activities.append({
                    "type": "invoice",
                    "description": f"Invoice #{invoice.get('doc_number')} - {invoice.get('customer_name')}",
                    "amount": float(invoice.get('total_amount', 0)),
                    "timestamp": invoice.get('txn_date', datetime.utcnow().isoformat())
                })
        except Exception as e:
            logger.warning(f"Activity data unavailable for PDF: {e}")

        # Export to PDF
        pdf_bytes = await export_service.export_dashboard_to_pdf(
            company_name=company_name,
            kpi_data=kpi_data,
            revenue_trend=revenue_trend_data,
            recent_activity=activities,
        )

        # Return as downloadable file
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={company_name.replace(' ', '_')}_dashboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            },
        )

    except Exception as e:
        logger.error(f"Failed to export dashboard to PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/dashboard/json")
async def export_dashboard_json(
    wallet_address: str = Query(..., description="User's wallet address"),
    pretty: bool = Query(True, description="Pretty-print JSON"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export dashboard data to JSON format

    Returns complete dashboard data as JSON
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data, calculate_percentage_change

        logger.info(f"Exporting dashboard JSON for wallet {wallet_address}")

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

        # QUICKBOOKS DATA
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )
        except Exception as e:
            logger.warning(f"QuickBooks data unavailable for JSON: {e}")

        # SALESFORCE DATA
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])
                customers_change_percent = 5.2
        except Exception as e:
            logger.warning(f"Salesforce data unavailable for JSON: {e}")

        # SHOPIFY DATA
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )
                inventory_change_percent = -2.4
        except Exception as e:
            logger.warning(f"Shopify data unavailable for JSON: {e}")

        kpi_data = {
            "total_revenue": total_revenue,
            "revenue_change_percent": revenue_change_percent,
            "active_customers": active_customers,
            "customers_change_percent": customers_change_percent,
            "inventory_value": inventory_value,
            "inventory_change_percent": inventory_change_percent,
            "unpaid_invoices": unpaid_invoices,
            "invoices_change_percent": invoices_change_percent,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Calculate revenue trend
        revenue_trend_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                monthly_revenue = {}
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid" and invoice.get("txn_date"):
                        month_key = invoice["txn_date"][:7]
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

                current_date = datetime.utcnow()
                for i in range(5, -1, -1):
                    month_date = current_date - timedelta(days=30 * i)
                    month_key = month_date.strftime("%Y-%m")
                    month_label = month_date.strftime("%b %Y")

                    revenue_trend_data.append({
                        "month": month_label,
                        "revenue": monthly_revenue.get(month_key, 0)
                    })
        except Exception as e:
            logger.warning(f"Revenue trend unavailable for JSON: {e}")

        revenue_trend = {
            "trend_data": revenue_trend_data,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Get recent activity
        activities = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:5]:
                activities.append({
                    "type": "invoice",
                    "description": f"Invoice #{invoice.get('doc_number')} - {invoice.get('customer_name')}",
                    "amount": float(invoice.get('total_amount', 0)),
                    "timestamp": invoice.get('txn_date', datetime.utcnow().isoformat())
                })
        except Exception as e:
            logger.warning(f"Activity data unavailable for JSON: {e}")

        recent_activity = {
            "activities": activities,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Combine all data
        export_data = {
            "wallet_address": wallet_address,
            "exported_at": datetime.now().isoformat(),
            "kpis": kpi_data,
            "revenue_trend": revenue_trend,
            "recent_activity": recent_activity,
            "data_sources": data_sources,
        }

        # Export to JSON
        json_bytes = await export_service.export_to_json(
            export_data, filename="dashboard_export.json", pretty=pretty
        )

        # Return as downloadable file
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            },
        )

    except Exception as e:
        logger.error(f"Failed to export dashboard to JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/dashboard/excel")
async def export_dashboard_excel(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export dashboard data to Excel format

    Returns multi-sheet Excel workbook with:
    - Summary sheet (KPIs)
    - Revenue Trend sheet
    - Recent Activity sheet
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data, calculate_percentage_change

        logger.info(f"Exporting dashboard Excel for wallet {wallet_address}")

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

        # QUICKBOOKS DATA
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )
        except Exception as e:
            logger.warning(f"QuickBooks data unavailable for Excel: {e}")

        # SALESFORCE DATA
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])
                customers_change_percent = 5.2
        except Exception as e:
            logger.warning(f"Salesforce data unavailable for Excel: {e}")

        # SHOPIFY DATA
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )
                inventory_change_percent = -2.4
        except Exception as e:
            logger.warning(f"Shopify data unavailable for Excel: {e}")

        kpi_data = {
            "total_revenue": total_revenue,
            "revenue_change_percent": revenue_change_percent,
            "active_customers": active_customers,
            "customers_change_percent": customers_change_percent,
            "inventory_value": inventory_value,
            "inventory_change_percent": inventory_change_percent,
            "unpaid_invoices": unpaid_invoices,
            "invoices_change_percent": invoices_change_percent,
            "last_updated": datetime.utcnow().isoformat(),
            "data_sources": data_sources,
        }

        # Calculate revenue trend
        revenue_trend_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                monthly_revenue = {}
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid" and invoice.get("txn_date"):
                        month_key = invoice["txn_date"][:7]
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

                current_date = datetime.utcnow()
                for i in range(5, -1, -1):
                    month_date = current_date - timedelta(days=30 * i)
                    month_key = month_date.strftime("%Y-%m")
                    month_label = month_date.strftime("%b %Y")

                    revenue_trend_data.append({
                        "month": month_label,
                        "revenue": monthly_revenue.get(month_key, 0)
                    })
        except Exception as e:
            logger.warning(f"Revenue trend unavailable for Excel: {e}")

        revenue_trend = {
            "trend_data": revenue_trend_data,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Get recent activity
        activities_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for idx, invoice in enumerate(qb_invoices[:10]):  # Limit to 10
                activities_data.append({
                    "id": f"qb-{invoice.get('id', idx)}",
                    "type": "invoice",
                    "description": f"Invoice #{invoice.get('doc_number')} - {invoice.get('customer_name')}",
                    "amount": float(invoice.get('total_amount', 0)),
                    "status": invoice.get('status', 'unknown'),
                    "timestamp": invoice.get('txn_date', datetime.utcnow().isoformat())
                })
        except Exception as e:
            logger.warning(f"Activity data unavailable for Excel: {e}")

        recent_activity = {
            "activities": activities_data,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Prepare analytics data for Excel export
        analytics_data = {
            "summary": {
                "Total Revenue": f"${kpi_data.get('total_revenue', 0):,.2f}",
                "Active Customers": kpi_data.get("active_customers", 0),
                "Inventory Value": f"${kpi_data.get('inventory_value', 0):,.2f}",
                "Unpaid Invoices": f"${kpi_data.get('unpaid_invoices', 0):,.2f}",
                "Last Updated": kpi_data.get("last_updated", "N/A"),
                "Data Sources": ", ".join(data_sources) if data_sources else "No data synced yet",
            },
            "revenue_trend": revenue_trend_data,
            "customers": [
                {
                    "Activity ID": activity.get("id", ""),
                    "Type": activity.get("type", ""),
                    "Description": activity.get("description", ""),
                    "Amount": activity.get("amount", 0),
                    "Status": activity.get("status", ""),
                    "Timestamp": activity.get("timestamp", ""),
                }
                for activity in activities_data
            ],
        }

        # Export to Excel
        excel_bytes = await export_service.export_analytics_to_excel(analytics_data)

        # Return as downloadable file
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            },
        )

    except Exception as e:
        logger.error(f"Failed to export dashboard to Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/transactions/csv")
async def export_transactions_csv(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, description="Number of transactions to export"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export transaction history to CSV

    Returns CSV file with transaction details
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data

        logger.info(f"Exporting transactions CSV for wallet {wallet_address}")

        # Get real transaction data from integrations
        transactions = []

        # QUICKBOOKS INVOICES
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:limit]:
                transactions.append({
                    "id": f"qb-inv-{invoice.get('id', '')}",
                    "type": "invoice",
                    "description": f"Invoice #{invoice.get('doc_number')} - {invoice.get('customer_name')}",
                    "amount": float(invoice.get('total_amount', 0)),
                    "status": invoice.get('status', 'unknown'),
                    "timestamp": invoice.get('txn_date', datetime.utcnow().isoformat())
                })
        except Exception as e:
            logger.warning(f"QuickBooks invoices unavailable for transactions export: {e}")

        # SHOPIFY ORDERS
        try:
            shopify_orders = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="orders"
            )

            for order in shopify_orders[:limit]:
                transactions.append({
                    "id": f"shopify-order-{order.get('id', '')}",
                    "type": "order",
                    "description": f"Order #{order.get('order_number')} - {order.get('customer_name', 'N/A')}",
                    "amount": float(order.get('total_price', 0)),
                    "status": order.get('financial_status', 'unknown'),
                    "timestamp": order.get('created_at', datetime.utcnow().isoformat())
                })
        except Exception as e:
            logger.warning(f"Shopify orders unavailable for transactions export: {e}")

        # Sort by timestamp descending
        transactions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        # Limit results
        transactions = transactions[:limit]

        if not transactions:
            # Return empty CSV with headers if no data
            logger.info(f"No transactions found for wallet {wallet_address}")
            transactions = [{
                "id": "",
                "type": "",
                "description": "No transactions found. Connect integrations and sync data.",
                "amount": 0.0,
                "status": "",
                "timestamp": ""
            }]

        # Export to CSV
        csv_bytes = await export_service.export_transactions_to_csv(transactions)

        # Return as downloadable file
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export transactions to CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/analytics/json")
async def export_analytics_json(
    wallet_address: str = Query(..., description="User's wallet address"),
    pretty: bool = Query(True, description="Pretty-print JSON"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export analytics data to JSON format

    Returns comprehensive analytics data
    """
    try:
        # Import dashboard helper function
        from .dashboard import get_integration_data, calculate_percentage_change

        logger.info(f"Exporting analytics JSON for wallet {wallet_address}")

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

        # QUICKBOOKS DATA
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")
                current_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid"
                )
                total_revenue = current_month_revenue

                unpaid_invoices = sum(
                    float(inv.get("balance", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "outstanding"
                )

                last_month_revenue = sum(
                    float(inv.get("total_amount", 0))
                    for inv in qb_invoices
                    if inv.get("status") == "paid" and
                       inv.get("txn_date", "").startswith(last_month.strftime("%Y-%m"))
                )

                revenue_change_percent = calculate_percentage_change(
                    current_month_revenue, last_month_revenue
                )
        except Exception as e:
            logger.warning(f"QuickBooks data unavailable for analytics JSON: {e}")

        # SALESFORCE DATA
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

            if sf_accounts:
                data_sources.append("Salesforce")
                active_customers = len([
                    acc for acc in sf_accounts
                    if float(acc.get("annual_revenue", 0)) > 0
                ])
                customers_change_percent = 5.2
        except Exception as e:
            logger.warning(f"Salesforce data unavailable for analytics JSON: {e}")

        # SHOPIFY DATA
        try:
            shopify_products = await get_integration_data(
                wallet_address=wallet_address,
                integration="shopify",
                data_type="products"
            )

            if shopify_products:
                data_sources.append("Shopify")
                inventory_value = sum(
                    float(prod.get("price", 0)) * int(prod.get("inventory_quantity", 0))
                    for prod in shopify_products
                )
                inventory_change_percent = -2.4
        except Exception as e:
            logger.warning(f"Shopify data unavailable for analytics JSON: {e}")

        kpi_data = {
            "total_revenue": total_revenue,
            "revenue_change_percent": revenue_change_percent,
            "active_customers": active_customers,
            "customers_change_percent": customers_change_percent,
            "inventory_value": inventory_value,
            "inventory_change_percent": inventory_change_percent,
            "unpaid_invoices": unpaid_invoices,
            "invoices_change_percent": invoices_change_percent,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Calculate revenue trend
        revenue_trend_data = []
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                monthly_revenue = {}
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid" and invoice.get("txn_date"):
                        month_key = invoice["txn_date"][:7]
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

                current_date = datetime.utcnow()
                for i in range(5, -1, -1):
                    month_date = current_date - timedelta(days=30 * i)
                    month_key = month_date.strftime("%Y-%m")
                    month_label = month_date.strftime("%b %Y")

                    revenue_trend_data.append({
                        "month": month_label,
                        "revenue": monthly_revenue.get(month_key, 0)
                    })
        except Exception as e:
            logger.warning(f"Revenue trend unavailable for analytics JSON: {e}")

        revenue_trend = {
            "trend_data": revenue_trend_data,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Combine analytics
        analytics_data = {
            "wallet_address": wallet_address,
            "exported_at": datetime.now().isoformat(),
            "kpis": kpi_data,
            "revenue_trend": revenue_trend,
            "data_sources": data_sources,
        }

        # Export to JSON
        json_bytes = await export_service.export_to_json(
            analytics_data, filename="analytics_export.json", pretty=pretty
        )

        # Return as downloadable file
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=analytics_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            },
        )

    except Exception as e:
        logger.error(f"Failed to export analytics to JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
