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
from ...services.adapter_router import adapter_router
from ...models.marketplace import Product
from ...models.purchase import Purchase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["export"])


# =====================================================================
# EXPORT ENDPOINTS
# =====================================================================


@router.get("/dashboard/csv")
async def export_dashboard_csv(
    company_id: str = Query(..., description="Company ID"),
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
        # Generate sample dashboard data for export
        # In production, this would fetch from database/integrations
        kpi_data = {
            "total_revenue": 125000.00,
            "revenue_change_percent": 12.5,
            "active_customers": 1250,
            "customers_change_percent": 8.3,
            "inventory_value": 45000.00,
            "inventory_change_percent": -2.1,
            "unpaid_invoices": 15750.00,
            "invoices_change_percent": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
        }
        revenue_trend = {
            "trend_data": [
                {"month": "Jan 2025", "revenue": 95000},
                {"month": "Feb 2025", "revenue": 102000},
                {"month": "Mar 2025", "revenue": 115000},
                {"month": "Apr 2025", "revenue": 125000},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }
        recent_activity = {
            "activities": [
                {"type": "sale", "description": "New sale completed", "amount": 1250.00},
                {"type": "customer", "description": "New customer registered", "amount": 0},
                {"type": "invoice", "description": "Invoice paid", "amount": 3500.00},
            ],
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
    company_id: str = Query(..., description="Company ID"),
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
        # Generate sample dashboard data for export
        # In production, this would fetch from database/integrations
        kpi_data = {
            "total_revenue": 125000.00,
            "revenue_change_percent": 12.5,
            "active_customers": 1250,
            "customers_change_percent": 8.3,
            "inventory_value": 45000.00,
            "inventory_change_percent": -2.1,
            "unpaid_invoices": 15750.00,
            "invoices_change_percent": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
        }
        revenue_trend = {
            "trend_data": [
                {"month": "Jan 2025", "revenue": 95000},
                {"month": "Feb 2025", "revenue": 102000},
                {"month": "Mar 2025", "revenue": 115000},
                {"month": "Apr 2025", "revenue": 125000},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }
        recent_activity = {
            "activities": [
                {"type": "sale", "description": "New sale completed", "amount": 1250.00, "timestamp": datetime.utcnow().isoformat()},
                {"type": "customer", "description": "New customer registered", "amount": 0, "timestamp": datetime.utcnow().isoformat()},
                {"type": "invoice", "description": "Invoice paid", "amount": 3500.00, "timestamp": datetime.utcnow().isoformat()},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Export to PDF
        pdf_bytes = await export_service.export_dashboard_to_pdf(
            company_name=company_name,
            kpi_data=kpi_data,
            revenue_trend=revenue_trend.get("trend_data", []),
            recent_activity=recent_activity.get("activities", []),
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
    company_id: str = Query(..., description="Company ID"),
    pretty: bool = Query(True, description="Pretty-print JSON"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export dashboard data to JSON format

    Returns complete dashboard data as JSON
    """
    try:
        # Generate sample dashboard data for export
        # In production, this would fetch from database/integrations
        kpi_data = {
            "total_revenue": 125000.00,
            "revenue_change_percent": 12.5,
            "active_customers": 1250,
            "customers_change_percent": 8.3,
            "inventory_value": 45000.00,
            "inventory_change_percent": -2.1,
            "unpaid_invoices": 15750.00,
            "invoices_change_percent": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
        }
        revenue_trend = {
            "trend_data": [
                {"month": "Jan 2025", "revenue": 95000},
                {"month": "Feb 2025", "revenue": 102000},
                {"month": "Mar 2025", "revenue": 115000},
                {"month": "Apr 2025", "revenue": 125000},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }
        recent_activity = {
            "activities": [
                {"type": "sale", "description": "New sale completed", "amount": 1250.00, "timestamp": datetime.utcnow().isoformat()},
                {"type": "customer", "description": "New customer registered", "amount": 0, "timestamp": datetime.utcnow().isoformat()},
                {"type": "invoice", "description": "Invoice paid", "amount": 3500.00, "timestamp": datetime.utcnow().isoformat()},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Combine all data
        export_data = {
            "company_id": company_id,
            "exported_at": datetime.now().isoformat(),
            "kpis": kpi_data,
            "revenue_trend": revenue_trend,
            "recent_activity": recent_activity,
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
    company_id: str = Query(..., description="Company ID"),
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
        # Generate sample dashboard data for export
        # In production, this would fetch from database/integrations
        kpi_data = {
            "total_revenue": 125000.00,
            "revenue_change_percent": 12.5,
            "active_customers": 1250,
            "customers_change_percent": 8.3,
            "inventory_value": 45000.00,
            "inventory_change_percent": -2.1,
            "unpaid_invoices": 15750.00,
            "invoices_change_percent": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
            "data_sources": ["QuickBooks", "Salesforce", "Shopify"],
        }
        revenue_trend = {
            "trend_data": [
                {"month": "Jan 2025", "revenue": 95000},
                {"month": "Feb 2025", "revenue": 102000},
                {"month": "Mar 2025", "revenue": 115000},
                {"month": "Apr 2025", "revenue": 125000},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }
        recent_activity = {
            "activities": [
                {"id": "act-001", "type": "sale", "description": "New sale completed", "amount": 1250.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "act-002", "type": "customer", "description": "New customer registered", "amount": 0, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "act-003", "type": "invoice", "description": "Invoice paid", "amount": 3500.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
            ],
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
                "Data Sources": ", ".join(kpi_data.get("data_sources", [])),
            },
            "revenue_trend": revenue_trend.get("trend_data", []),
            "customers": [
                {
                    "Activity ID": activity.get("id", ""),
                    "Type": activity.get("type", ""),
                    "Description": activity.get("description", ""),
                    "Amount": activity.get("amount", 0),
                    "Status": activity.get("status", ""),
                    "Timestamp": activity.get("timestamp", ""),
                }
                for activity in recent_activity.get("activities", [])
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
    company_id: str = Query(..., description="Company ID"),
    limit: int = Query(100, description="Number of transactions to export"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export transaction history to CSV

    Returns CSV file with transaction details
    """
    try:
        # Generate sample transaction data for export
        # In production, this would fetch from database/integrations
        recent_activity = {
            "activities": [
                {"id": "txn-001", "type": "sale", "description": "Product sale - Widget A", "amount": 1250.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "txn-002", "type": "refund", "description": "Refund processed", "amount": -150.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "txn-003", "type": "invoice", "description": "Invoice #INV-2025-001 paid", "amount": 3500.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "txn-004", "type": "sale", "description": "Product sale - Widget B", "amount": 890.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
                {"id": "txn-005", "type": "payment", "description": "Customer payment received", "amount": 2100.00, "status": "completed", "timestamp": datetime.utcnow().isoformat()},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }
        transactions = recent_activity.get("activities", [])[:limit]

        if not transactions:
            raise HTTPException(status_code=404, detail="No transactions found")

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
    company_id: str = Query(..., description="Company ID"),
    pretty: bool = Query(True, description="Pretty-print JSON"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export analytics data to JSON format

    Returns comprehensive analytics data
    """
    try:
        # Generate sample analytics data for export
        # In production, this would fetch from database/integrations
        kpi_data = {
            "total_revenue": 125000.00,
            "revenue_change_percent": 12.5,
            "active_customers": 1250,
            "customers_change_percent": 8.3,
            "inventory_value": 45000.00,
            "inventory_change_percent": -2.1,
            "unpaid_invoices": 15750.00,
            "invoices_change_percent": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
        }
        revenue_trend = {
            "trend_data": [
                {"month": "Jan 2025", "revenue": 95000},
                {"month": "Feb 2025", "revenue": 102000},
                {"month": "Mar 2025", "revenue": 115000},
                {"month": "Apr 2025", "revenue": 125000},
            ],
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Combine analytics
        analytics_data = {
            "company_id": company_id,
            "exported_at": datetime.now().isoformat(),
            "kpis": kpi_data,
            "revenue_trend": revenue_trend,
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
