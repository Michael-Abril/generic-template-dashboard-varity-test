"""
Productivity Analytics API Endpoints
Provides productivity metrics and insights
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.productivity_analytics import ProductivityAnalytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class AnalyticsRequest(BaseModel):
    """Request model for analytics"""
    business_wallet: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    integrations: Optional[List[str]] = None


@router.post("/metrics")
async def get_metrics(request: AnalyticsRequest):
    """
    Get comprehensive productivity metrics

    Args:
        request: Analytics request parameters

    Returns:
        Comprehensive metrics dashboard
    """
    try:
        service = ProductivityAnalytics()

        # Parse dates or use defaults
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date.replace("Z", "+00:00"))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date.replace("Z", "+00:00"))
        else:
            end_date = datetime.utcnow()

        metrics = await service.calculate_metrics(
            business_wallet=request.business_wallet,
            start_date=start_date,
            end_date=end_date,
            integrations=request.integrations
        )

        return metrics

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/score/{business_wallet}")
async def get_productivity_score(
    business_wallet: str,
    period_days: int = 30
):
    """
    Get team productivity score

    Args:
        business_wallet: Business identifier
        period_days: Number of days to analyze

    Returns:
        Productivity score and breakdown
    """
    try:
        service = ProductivityAnalytics()

        score = await service.get_team_productivity_score(
            business_wallet=business_wallet,
            period_days=period_days
        )

        return score

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_dashboard(request: AnalyticsRequest, format: str = "json"):
    """
    Export comprehensive dashboard data

    Args:
        request: Analytics request parameters
        format: Export format (json, csv)

    Returns:
        Dashboard data for visualization
    """
    try:
        service = ProductivityAnalytics()

        # Parse dates
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date.replace("Z", "+00:00"))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date.replace("Z", "+00:00"))
        else:
            end_date = datetime.utcnow()

        dashboard_data = await service.export_dashboard_data(
            business_wallet=request.business_wallet,
            start_date=start_date,
            end_date=end_date,
            format=format
        )

        return dashboard_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{business_wallet}")
async def get_insights(business_wallet: str, days: int = 30):
    """
    Get AI-powered productivity insights

    Args:
        business_wallet: Business identifier
        days: Number of days to analyze

    Returns:
        Insights and recommendations
    """
    try:
        service = ProductivityAnalytics()

        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        insights = await service._generate_insights(
            business_wallet=business_wallet,
            start_date=start_date,
            end_date=end_date
        )

        recommendations = await service._generate_recommendations(
            business_wallet=business_wallet
        )

        alerts = await service._generate_alerts(
            business_wallet=business_wallet
        )

        return {
            "insights": insights,
            "recommendations": recommendations,
            "alerts": alerts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# ADVANCED ANALYTICS ENDPOINTS
# =====================================================================

@router.get("/advanced-kpis/{user_id}")
async def get_advanced_kpis(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get advanced KPI metrics including growth, retention, engagement

    Args:
        user_id: User identifier
        start_date: Optional start date (ISO format)
        end_date: Optional end date (ISO format)

    Returns:
        Advanced KPI dashboard with multiple metric categories
    """
    try:
        from app.services.analytics_service import analytics_service

        # Parse date range
        date_range = None
        if start_date and end_date:
            date_range = {"start": start_date, "end": end_date}

        kpis = await analytics_service.calculate_advanced_kpis(user_id, date_range)

        return kpis

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison/{user_id}/{metric_id}")
async def get_period_comparison(
    user_id: str,
    metric_id: str,
    comparison_type: str = "previous_period"
):
    """
    Compare metric across different time periods

    Args:
        user_id: User identifier
        metric_id: Metric to compare (revenue, customers, etc.)
        comparison_type: Type of comparison (previous_period, previous_year)

    Returns:
        Period-over-period comparison with change metrics
    """
    try:
        from app.services.analytics_service import analytics_service

        comparison = await analytics_service.calculate_period_comparison(
            user_id, metric_id, comparison_type
        )

        return comparison

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart-data/{user_id}")
async def get_chart_data(
    user_id: str,
    chart_type: str,
    metric_ids: str,  # Comma-separated list
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    granularity: str = "day"
):
    """
    Get chart-ready data for frontend visualization

    Args:
        user_id: User identifier
        chart_type: Chart type (line, bar, pie, donut, area, scatter)
        metric_ids: Comma-separated metric IDs
        start_date: Optional start date
        end_date: Optional end date
        granularity: Data granularity (hour, day, week, month)

    Returns:
        Chart-ready data formatted for Chart.js, Recharts, etc.
    """
    try:
        from app.services.analytics_service import analytics_service

        # Parse metric IDs
        metrics = [m.strip() for m in metric_ids.split(",")]

        # Parse date range
        date_range = None
        if start_date and end_date:
            date_range = {"start": start_date, "end": end_date}

        chart_data = await analytics_service.get_chart_data(
            user_id, chart_type, metrics, date_range, granularity
        )

        return chart_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drilldown/{user_id}/{metric_id}")
async def get_metric_drilldown(
    user_id: str,
    metric_id: str,
    dimension: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Drill down into metric details by dimension

    Args:
        user_id: User identifier
        metric_id: Metric to analyze
        dimension: Dimension to drill down by (source, category, geography, product)
        start_date: Optional start date
        end_date: Optional end date

    Returns:
        Detailed breakdown of metric by dimension
    """
    try:
        from app.services.analytics_service import analytics_service

        # Parse date range
        date_range = None
        if start_date and end_date:
            date_range = {"start": start_date, "end": end_date}

        drilldown = await analytics_service.get_metric_drilldown(
            user_id, metric_id, dimension, date_range
        )

        return drilldown

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/time-series/{user_id}/{metric_id}")
async def get_time_series(
    user_id: str,
    metric_id: str,
    granularity: str = "day",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get time series data for a metric

    Args:
        user_id: User identifier
        metric_id: Metric identifier
        granularity: Data granularity (hour, day, week, month)
        start_date: Optional start date
        end_date: Optional end date

    Returns:
        Time series data points
    """
    try:
        from app.services.analytics_service import analytics_service

        # Parse date range
        date_range = None
        if start_date and end_date:
            date_range = {"start": start_date, "end": end_date}

        time_series = await analytics_service.get_time_series_data(
            user_id, metric_id, granularity, date_range
        )

        return {"metric_id": metric_id, "granularity": granularity, "data": time_series}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/{user_id}")
async def get_funnel_analysis(user_id: str, funnel_type: str = "conversion"):
    """
    Get funnel visualization data

    Args:
        user_id: User identifier
        funnel_type: Type of funnel (conversion, sales, onboarding)

    Returns:
        Funnel data with stages and conversion rates
    """
    try:
        from app.services.analytics_service import analytics_service

        funnel_data = await analytics_service.get_funnel_data(user_id, funnel_type)

        return {"funnel_type": funnel_type, "stages": funnel_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohort/{user_id}")
async def get_cohort_analysis(user_id: str, cohort_type: str = "retention"):
    """
    Get cohort analysis data

    Args:
        user_id: User identifier
        cohort_type: Type of cohort analysis (retention, revenue)

    Returns:
        Cohort analysis with retention/revenue data
    """
    try:
        from app.services.analytics_service import analytics_service

        cohort_data = await analytics_service.get_cohort_analysis(user_id, cohort_type)

        return cohort_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
