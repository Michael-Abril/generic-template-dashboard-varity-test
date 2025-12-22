"""
AI Analytics API Endpoints

Provides AI-powered analytics chart generation and layout management.
Users can generate any chart via natural language queries.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import uuid
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.services.chart_generation_service import chart_generation_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Request/Response Models ====================

class ChartGenerateRequest(BaseModel):
    """Request to generate a chart from natural language"""
    query: str
    wallet_address: str
    integrations: Optional[List[str]] = None


class ChartConfig(BaseModel):
    """Chart configuration for Recharts"""
    id: str
    type: str  # bar, line, area, pie, donut, kpi
    title: str
    data: List[Dict[str, Any]]
    config: Dict[str, Any]
    summary: Optional[str] = None
    suggested_queries: Optional[List[str]] = None


class ChartGenerateResponse(BaseModel):
    """Response from chart generation"""
    success: bool
    chart: Optional[ChartConfig] = None
    error: Optional[str] = None
    data_sources: int = 0
    timestamp: str


class ChartSuggestionsResponse(BaseModel):
    """Suggested chart queries based on integrations"""
    success: bool
    suggestions: List[Dict[str, str]]
    integrations_used: List[str]


class DashboardWidget(BaseModel):
    """A widget in the analytics dashboard"""
    id: str
    chart_config: Dict[str, Any]
    x: int
    y: int
    w: int
    h: int
    created_at: str


class DashboardLayout(BaseModel):
    """Complete dashboard layout with widgets"""
    id: str
    name: str
    widgets: List[DashboardWidget]
    is_default: bool = False
    created_at: str
    updated_at: str


class SaveLayoutRequest(BaseModel):
    """Request to save a dashboard layout"""
    wallet_address: str
    name: str
    widgets: List[Dict[str, Any]]
    is_default: bool = False


class SaveLayoutResponse(BaseModel):
    """Response from saving layout"""
    success: bool
    layout_id: str
    message: str


# ==================== Chart Generation Endpoints ====================

@router.post("/generate-chart", response_model=ChartGenerateResponse)
async def generate_chart(request: ChartGenerateRequest):
    """
    Generate a chart configuration from natural language query.

    This endpoint:
    1. Parses the user's query to understand what visualization they want
    2. Fetches relevant data from RAG (if integrations are connected)
    3. Uses AI to generate a Recharts-compatible chart configuration
    4. Returns the chart config ready to render

    Examples:
    - "Show revenue by month for 2024"
    - "Compare expenses by category"
    - "Display my top 10 customers"
    - "Track email volume over the last week"

    Args:
        request: Chart generation request with query and wallet address

    Returns:
        Chart configuration ready for Recharts rendering
    """
    try:
        logger.info(
            f"Chart generation request from {request.wallet_address[:10]}...: "
            f"'{request.query[:100]}...'"
        )

        if not chart_generation_service:
            raise HTTPException(
                status_code=503,
                detail="Chart generation service not available"
            )

        result = await chart_generation_service.generate_chart(
            query=request.query,
            wallet_address=request.wallet_address,
            integrations=request.integrations
        )

        if not result.get("success"):
            return ChartGenerateResponse(
                success=False,
                error=result.get("error", "Chart generation failed"),
                chart=None,
                data_sources=0,
                timestamp=datetime.utcnow().isoformat()
            )

        chart_data = result.get("chart", {})

        return ChartGenerateResponse(
            success=True,
            chart=ChartConfig(
                id=chart_data.get("id", str(uuid.uuid4())),
                type=chart_data.get("type", "bar"),
                title=chart_data.get("title", "Chart"),
                data=chart_data.get("data", []),
                config=chart_data.get("config", {}),
                summary=chart_data.get("summary"),
                suggested_queries=chart_data.get("suggested_queries", [])
            ),
            data_sources=result.get("data_sources", 0),
            timestamp=result.get("timestamp", datetime.utcnow().isoformat())
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chart generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart-suggestions", response_model=ChartSuggestionsResponse)
async def get_chart_suggestions(
    wallet_address: str = Query(..., description="User's wallet address"),
    integrations: Optional[str] = Query(None, description="Comma-separated integrations")
):
    """
    Get suggested chart queries based on connected integrations.

    Returns a list of suggested queries that work well with the user's
    connected data sources.

    Args:
        wallet_address: User's wallet address
        integrations: Comma-separated list of connected integrations

    Returns:
        List of suggested chart queries
    """
    try:
        integration_list = integrations.split(",") if integrations else []

        if not chart_generation_service:
            return ChartSuggestionsResponse(
                success=True,
                suggestions=[
                    {"query": "Show monthly revenue trend", "type": "line"},
                    {"query": "Compare quarterly performance", "type": "bar"},
                    {"query": "Display expense breakdown", "type": "pie"}
                ],
                integrations_used=[]
            )

        suggestions = chart_generation_service.get_chart_suggestions(integration_list)

        return ChartSuggestionsResponse(
            success=True,
            suggestions=suggestions,
            integrations_used=integration_list
        )

    except Exception as e:
        logger.error(f"Failed to get chart suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Layout Management Endpoints ====================

# In-memory storage for MVP (replace with database in production)
_layouts_store: Dict[str, Dict[str, Any]] = {}


@router.post("/layouts", response_model=SaveLayoutResponse)
async def save_layout(request: SaveLayoutRequest):
    """
    Save a dashboard layout with widget positions.

    This endpoint persists the user's custom dashboard layout including:
    - Widget positions (x, y)
    - Widget sizes (w, h)
    - Chart configurations for each widget

    Args:
        request: Layout save request with widgets and metadata

    Returns:
        Success response with layout ID
    """
    try:
        layout_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        # Store layout (in-memory for MVP)
        wallet_key = request.wallet_address.lower()
        if wallet_key not in _layouts_store:
            _layouts_store[wallet_key] = {}

        layout_data = {
            "id": layout_id,
            "name": request.name,
            "widgets": request.widgets,
            "is_default": request.is_default,
            "created_at": timestamp,
            "updated_at": timestamp
        }

        # If this is default, unset other defaults
        if request.is_default:
            for lid, layout in _layouts_store[wallet_key].items():
                layout["is_default"] = False

        _layouts_store[wallet_key][layout_id] = layout_data

        logger.info(f"Saved layout {layout_id} for wallet {wallet_key[:10]}...")

        return SaveLayoutResponse(
            success=True,
            layout_id=layout_id,
            message=f"Layout '{request.name}' saved successfully"
        )

    except Exception as e:
        logger.error(f"Failed to save layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/layouts")
async def list_layouts(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    List all saved layouts for a user.

    Args:
        wallet_address: User's wallet address

    Returns:
        List of saved layouts
    """
    try:
        wallet_key = wallet_address.lower()
        layouts = list(_layouts_store.get(wallet_key, {}).values())

        return {
            "success": True,
            "layouts": layouts,
            "count": len(layouts)
        }

    except Exception as e:
        logger.error(f"Failed to list layouts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/layouts/{layout_id}")
async def get_layout(
    layout_id: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Get a specific layout by ID.

    Args:
        layout_id: Layout ID
        wallet_address: User's wallet address

    Returns:
        Layout data with widgets
    """
    try:
        wallet_key = wallet_address.lower()
        layouts = _layouts_store.get(wallet_key, {})

        if layout_id not in layouts:
            raise HTTPException(status_code=404, detail="Layout not found")

        return {
            "success": True,
            "layout": layouts[layout_id]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/layouts/{layout_id}")
async def update_layout(
    layout_id: str,
    request: SaveLayoutRequest
):
    """
    Update an existing layout.

    Args:
        layout_id: Layout ID to update
        request: Updated layout data

    Returns:
        Success response
    """
    try:
        wallet_key = request.wallet_address.lower()
        layouts = _layouts_store.get(wallet_key, {})

        if layout_id not in layouts:
            raise HTTPException(status_code=404, detail="Layout not found")

        # Update layout
        layouts[layout_id].update({
            "name": request.name,
            "widgets": request.widgets,
            "is_default": request.is_default,
            "updated_at": datetime.utcnow().isoformat()
        })

        # Handle default flag
        if request.is_default:
            for lid, layout in layouts.items():
                if lid != layout_id:
                    layout["is_default"] = False

        logger.info(f"Updated layout {layout_id}")

        return {
            "success": True,
            "message": "Layout updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/layouts/{layout_id}")
async def delete_layout(
    layout_id: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Delete a layout.

    Args:
        layout_id: Layout ID to delete
        wallet_address: User's wallet address

    Returns:
        Success response
    """
    try:
        wallet_key = wallet_address.lower()
        layouts = _layouts_store.get(wallet_key, {})

        if layout_id not in layouts:
            raise HTTPException(status_code=404, detail="Layout not found")

        del layouts[layout_id]

        logger.info(f"Deleted layout {layout_id}")

        return {
            "success": True,
            "message": "Layout deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/layouts/default")
async def get_default_layout(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Get the user's default layout.

    Args:
        wallet_address: User's wallet address

    Returns:
        Default layout or empty layout
    """
    try:
        wallet_key = wallet_address.lower()
        layouts = _layouts_store.get(wallet_key, {})

        # Find default layout
        for layout in layouts.values():
            if layout.get("is_default"):
                return {
                    "success": True,
                    "layout": layout
                }

        # Return empty layout if no default
        return {
            "success": True,
            "layout": None,
            "message": "No default layout set"
        }

    except Exception as e:
        logger.error(f"Failed to get default layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Quick Chart Templates ====================

@router.get("/templates")
async def get_chart_templates():
    """
    Get pre-built chart templates for quick start.

    Returns:
        List of chart templates
    """
    templates = [
        {
            "id": "revenue-trend",
            "name": "Revenue Trend",
            "description": "Monthly revenue line chart",
            "type": "line",
            "query": "Show monthly revenue for the last 12 months",
            "preview_data": [
                {"label": "Jan", "value": 45000},
                {"label": "Feb", "value": 52000},
                {"label": "Mar", "value": 48000}
            ]
        },
        {
            "id": "expense-breakdown",
            "name": "Expense Breakdown",
            "description": "Expenses by category pie chart",
            "type": "pie",
            "query": "Show expense breakdown by category",
            "preview_data": [
                {"label": "Payroll", "value": 45},
                {"label": "Marketing", "value": 25},
                {"label": "Operations", "value": 30}
            ]
        },
        {
            "id": "sales-pipeline",
            "name": "Sales Pipeline",
            "description": "Pipeline by stage bar chart",
            "type": "bar",
            "query": "Show sales pipeline by stage",
            "preview_data": [
                {"label": "Prospect", "value": 120000},
                {"label": "Qualified", "value": 85000},
                {"label": "Proposal", "value": 45000},
                {"label": "Closed", "value": 32000}
            ]
        },
        {
            "id": "customer-growth",
            "name": "Customer Growth",
            "description": "Customer count over time",
            "type": "area",
            "query": "Show customer growth over the last year",
            "preview_data": [
                {"label": "Q1", "value": 150},
                {"label": "Q2", "value": 220},
                {"label": "Q3", "value": 310},
                {"label": "Q4", "value": 425}
            ]
        },
        {
            "id": "kpi-revenue",
            "name": "Revenue KPI",
            "description": "Total revenue metric card",
            "type": "kpi",
            "query": "What is the total revenue this month?",
            "preview_data": [
                {"label": "Revenue", "value": 125000, "change": 12.5}
            ]
        }
    ]

    return {
        "success": True,
        "templates": templates,
        "count": len(templates)
    }
