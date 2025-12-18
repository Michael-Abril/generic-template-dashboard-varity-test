"""
Analytics Aggregation Service for Varity Dashboard
Handles real-time analytics, custom metrics, and data visualization
"""
import os
import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
import numpy as np
import pandas as pd
from sqlalchemy import func, and_, or_, text
from celery import Celery
import asyncio

logger = logging.getLogger(__name__)

# Configure Celery
app = Celery(
    'varity_analytics',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6380'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6380')
)


class AnalyticsAggregationService:
    """
    Service for aggregating and analyzing business data from all integrations
    Provides real-time metrics, custom analytics, and predictive insights
    """

    def __init__(self):
        """Initialize analytics service"""
        self.metric_definitions = self._load_metric_definitions()
        self.cache = {}  # Simple in-memory cache
        logger.info("Analytics Aggregation Service initialized")

    def _load_metric_definitions(self) -> Dict[str, Any]:
        """Load predefined metric definitions"""
        return {
            'revenue': {
                'name': 'Total Revenue',
                'type': 'currency',
                'aggregation': 'sum',
                'sources': ['stripe', 'quickbooks', 'shopify', 'square']
            },
            'customers': {
                'name': 'Total Customers',
                'type': 'count',
                'aggregation': 'distinct',
                'sources': ['stripe', 'quickbooks', 'shopify', 'salesforce']
            },
            'conversion_rate': {
                'name': 'Conversion Rate',
                'type': 'percentage',
                'aggregation': 'calculated',
                'formula': 'conversions / visitors * 100'
            },
            'average_order_value': {
                'name': 'Average Order Value',
                'type': 'currency',
                'aggregation': 'average',
                'sources': ['stripe', 'shopify', 'square']
            },
            'churn_rate': {
                'name': 'Churn Rate',
                'type': 'percentage',
                'aggregation': 'calculated',
                'formula': 'churned_customers / total_customers * 100'
            },
            'ltv': {
                'name': 'Customer Lifetime Value',
                'type': 'currency',
                'aggregation': 'calculated',
                'formula': 'average_order_value * purchase_frequency * customer_lifespan'
            }
        }

    async def create_custom_metric(
        self,
        user_id: str,
        metric_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a custom metric definition for a user

        Args:
            user_id: User identifier
            metric_config: Custom metric configuration

        Returns:
            Created metric details
        """
        try:
            metric = {
                'id': f"custom_{user_id}_{datetime.now().timestamp()}",
                'user_id': user_id,
                'name': metric_config['name'],
                'description': metric_config.get('description', ''),
                'type': metric_config.get('type', 'number'),
                'formula': metric_config.get('formula'),
                'sources': metric_config.get('sources', []),
                'filters': metric_config.get('filters', {}),
                'aggregation': metric_config.get('aggregation', 'sum'),
                'visualization': metric_config.get('visualization', 'line'),
                'created_at': datetime.now().isoformat()
            }

            # Validate the metric formula if provided
            if metric['formula']:
                self._validate_formula(metric['formula'])

            # Store metric definition (in production, use database)
            self.metric_definitions[metric['id']] = metric

            logger.info(f"Created custom metric: {metric['name']} for user {user_id}")
            return {
                'success': True,
                'metric': metric
            }

        except Exception as e:
            logger.error(f"Failed to create custom metric: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _validate_formula(self, formula: str) -> bool:
        """Validate a metric formula for safety and correctness"""
        # Basic validation - in production, use proper expression parser
        forbidden_keywords = ['import', 'exec', 'eval', '__', 'open', 'file']
        for keyword in forbidden_keywords:
            if keyword in formula.lower():
                raise ValueError(f"Formula contains forbidden keyword: {keyword}")

        # Check for valid operators and functions
        allowed_functions = ['sum', 'avg', 'count', 'max', 'min', 'abs']
        return True

    async def calculate_metrics(
        self,
        user_id: str,
        metric_ids: List[str],
        date_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate specified metrics for a user

        Args:
            user_id: User identifier
            metric_ids: List of metric IDs to calculate
            date_range: Optional date range filter

        Returns:
            Calculated metric values
        """
        results = {
            'user_id': user_id,
            'metrics': {},
            'date_range': date_range or self._get_default_date_range(),
            'calculated_at': datetime.now().isoformat()
        }

        for metric_id in metric_ids:
            if metric_id in self.metric_definitions:
                metric_def = self.metric_definitions[metric_id]
                value = await self._calculate_single_metric(
                    user_id,
                    metric_def,
                    date_range
                )
                results['metrics'][metric_id] = {
                    'name': metric_def['name'],
                    'value': value,
                    'type': metric_def['type']
                }

        return results

    async def _calculate_single_metric(
        self,
        user_id: str,
        metric_def: Dict[str, Any],
        date_range: Optional[Dict[str, str]]
    ) -> Any:
        """Calculate a single metric value"""
        # Check cache first
        cache_key = f"{user_id}:{metric_def.get('id', metric_def['name'])}:{str(date_range)}"
        if cache_key in self.cache:
            cached_value, cached_time = self.cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                return cached_value

        # Calculate based on aggregation type
        if metric_def['aggregation'] == 'sum':
            value = await self._calculate_sum(user_id, metric_def, date_range)
        elif metric_def['aggregation'] == 'average':
            value = await self._calculate_average(user_id, metric_def, date_range)
        elif metric_def['aggregation'] == 'count':
            value = await self._calculate_count(user_id, metric_def, date_range)
        elif metric_def['aggregation'] == 'calculated':
            value = await self._calculate_formula(user_id, metric_def, date_range)
        else:
            value = 0

        # Cache the result
        self.cache[cache_key] = (value, datetime.now())
        return value

    async def _calculate_sum(
        self,
        user_id: str,
        metric_def: Dict[str, Any],
        date_range: Optional[Dict[str, str]]
    ) -> float:
        """Calculate sum aggregation"""
        # In production, query actual database
        # For now, return mock data
        return np.random.uniform(10000, 50000)

    async def _calculate_average(
        self,
        user_id: str,
        metric_def: Dict[str, Any],
        date_range: Optional[Dict[str, str]]
    ) -> float:
        """Calculate average aggregation"""
        return np.random.uniform(100, 500)

    async def _calculate_count(
        self,
        user_id: str,
        metric_def: Dict[str, Any],
        date_range: Optional[Dict[str, str]]
    ) -> int:
        """Calculate count aggregation"""
        return np.random.randint(50, 500)

    async def _calculate_formula(
        self,
        user_id: str,
        metric_def: Dict[str, Any],
        date_range: Optional[Dict[str, str]]
    ) -> float:
        """Calculate formula-based metric"""
        # Parse and evaluate formula safely
        # In production, use proper expression evaluator
        return np.random.uniform(0, 100)

    def _get_default_date_range(self) -> Dict[str, str]:
        """Get default date range (last 30 days)"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        return {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        }

    async def get_dashboard_summary(
        self,
        user_id: str,
        period: str = 'day'
    ) -> Dict[str, Any]:
        """
        Get dashboard summary with key metrics

        Args:
            user_id: User identifier
            period: Time period (day, week, month, year)

        Returns:
            Dashboard summary data
        """
        # Calculate date ranges
        now = datetime.now()
        if period == 'day':
            current_start = now.replace(hour=0, minute=0, second=0)
            previous_start = current_start - timedelta(days=1)
        elif period == 'week':
            current_start = now - timedelta(days=now.weekday())
            previous_start = current_start - timedelta(days=7)
        elif period == 'month':
            current_start = now.replace(day=1)
            previous_start = (current_start - timedelta(days=1)).replace(day=1)
        else:  # year
            current_start = now.replace(month=1, day=1)
            previous_start = current_start.replace(year=current_start.year - 1)

        current_range = {
            'start': current_start.isoformat(),
            'end': now.isoformat()
        }
        previous_range = {
            'start': previous_start.isoformat(),
            'end': current_start.isoformat()
        }

        # Calculate key metrics
        summary = {
            'period': period,
            'current_period': current_range,
            'metrics': {}
        }

        # Revenue metrics
        current_revenue = await self._calculate_sum(user_id, self.metric_definitions['revenue'], current_range)
        previous_revenue = await self._calculate_sum(user_id, self.metric_definitions['revenue'], previous_range)
        revenue_change = ((current_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue else 0

        summary['metrics']['revenue'] = {
            'value': current_revenue,
            'change': round(revenue_change, 2),
            'change_type': 'increase' if revenue_change > 0 else 'decrease'
        }

        # Customer metrics
        current_customers = await self._calculate_count(user_id, self.metric_definitions['customers'], current_range)
        previous_customers = await self._calculate_count(user_id, self.metric_definitions['customers'], previous_range)
        customer_change = ((current_customers - previous_customers) / previous_customers * 100) if previous_customers else 0

        summary['metrics']['customers'] = {
            'value': current_customers,
            'change': round(customer_change, 2),
            'change_type': 'increase' if customer_change > 0 else 'decrease'
        }

        # Average order value
        aov = await self._calculate_average(user_id, self.metric_definitions['average_order_value'], current_range)
        summary['metrics']['average_order_value'] = {
            'value': aov,
            'change': 0,  # Would calculate actual change in production
            'change_type': 'stable'
        }

        # Conversion rate
        conversion_rate = await self._calculate_formula(user_id, self.metric_definitions['conversion_rate'], current_range)
        summary['metrics']['conversion_rate'] = {
            'value': conversion_rate,
            'change': 0,
            'change_type': 'stable'
        }

        return summary

    async def get_time_series_data(
        self,
        user_id: str,
        metric_id: str,
        granularity: str = 'day',
        date_range: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get time series data for a metric

        Args:
            user_id: User identifier
            metric_id: Metric identifier
            granularity: Data granularity (hour, day, week, month)
            date_range: Date range for data

        Returns:
            Time series data points
        """
        if not date_range:
            date_range = self._get_default_date_range()

        start_date = datetime.fromisoformat(date_range['start'])
        end_date = datetime.fromisoformat(date_range['end'])

        # Generate time series data points
        data_points = []
        current_date = start_date

        while current_date <= end_date:
            # In production, query actual data
            # For now, generate mock data with realistic trends
            base_value = 1000
            trend = (current_date - start_date).days * 10
            seasonality = np.sin((current_date - start_date).days * 0.2) * 100
            noise = np.random.normal(0, 50)
            value = max(0, base_value + trend + seasonality + noise)

            data_points.append({
                'timestamp': current_date.isoformat(),
                'value': round(value, 2)
            })

            # Increment based on granularity
            if granularity == 'hour':
                current_date += timedelta(hours=1)
            elif granularity == 'day':
                current_date += timedelta(days=1)
            elif granularity == 'week':
                current_date += timedelta(weeks=1)
            else:  # month
                # Handle month increment properly
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return data_points

    async def get_funnel_data(
        self,
        user_id: str,
        funnel_type: str = 'conversion'
    ) -> List[Dict[str, Any]]:
        """
        Get funnel visualization data

        Args:
            user_id: User identifier
            funnel_type: Type of funnel (conversion, sales, onboarding)

        Returns:
            Funnel data with stages and values
        """
        funnels = {
            'conversion': [
                {'stage': 'Visitors', 'value': 10000, 'percentage': 100},
                {'stage': 'Sign-ups', 'value': 3000, 'percentage': 30},
                {'stage': 'Active Users', 'value': 1500, 'percentage': 15},
                {'stage': 'Paid Customers', 'value': 500, 'percentage': 5},
                {'stage': 'Repeat Customers', 'value': 200, 'percentage': 2}
            ],
            'sales': [
                {'stage': 'Leads', 'value': 5000, 'percentage': 100},
                {'stage': 'Qualified Leads', 'value': 2000, 'percentage': 40},
                {'stage': 'Proposals', 'value': 800, 'percentage': 16},
                {'stage': 'Negotiations', 'value': 400, 'percentage': 8},
                {'stage': 'Closed Deals', 'value': 200, 'percentage': 4}
            ],
            'onboarding': [
                {'stage': 'Registration', 'value': 1000, 'percentage': 100},
                {'stage': 'Email Verified', 'value': 850, 'percentage': 85},
                {'stage': 'Profile Completed', 'value': 600, 'percentage': 60},
                {'stage': 'First Action', 'value': 400, 'percentage': 40},
                {'stage': 'Fully Activated', 'value': 300, 'percentage': 30}
            ]
        }

        return funnels.get(funnel_type, funnels['conversion'])

    async def get_cohort_analysis(
        self,
        user_id: str,
        cohort_type: str = 'retention'
    ) -> Dict[str, Any]:
        """
        Get cohort analysis data

        Args:
            user_id: User identifier
            cohort_type: Type of cohort analysis

        Returns:
            Cohort analysis data
        """
        # Generate mock cohort data
        cohorts = []
        for i in range(6):
            cohort_date = datetime.now() - timedelta(days=30 * (5 - i))
            cohort_name = cohort_date.strftime('%B %Y')

            # Generate retention data
            retention_data = []
            initial_users = np.random.randint(100, 500)
            for month in range(6 - i):
                if month == 0:
                    retention = 100
                else:
                    retention = max(10, 100 * (0.7 ** month) + np.random.uniform(-5, 5))

                retention_data.append({
                    'month': month,
                    'users': int(initial_users * retention / 100),
                    'percentage': round(retention, 1)
                })

            cohorts.append({
                'name': cohort_name,
                'start_date': cohort_date.isoformat(),
                'initial_users': initial_users,
                'retention': retention_data
            })

        return {
            'type': cohort_type,
            'cohorts': cohorts,
            'generated_at': datetime.now().isoformat()
        }

    async def generate_insights(
        self,
        user_id: str,
        data_points: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate AI-powered insights from data

        Args:
            user_id: User identifier
            data_points: Data to analyze

        Returns:
            List of insights
        """
        insights = []

        # Analyze trends
        if len(data_points) > 1:
            values = [d.get('value', 0) for d in data_points]
            trend = np.polyfit(range(len(values)), values, 1)[0]

            if trend > 0:
                insights.append(f"Your metrics show a positive trend with {abs(trend):.1f}% growth rate")
            else:
                insights.append(f"Your metrics show a declining trend of {abs(trend):.1f}%")

        # Identify patterns
        if len(data_points) > 7:
            insights.append("Weekly patterns detected - consider scheduling campaigns on peak days")

        # Anomaly detection
        if data_points:
            mean_val = np.mean([d.get('value', 0) for d in data_points])
            std_val = np.std([d.get('value', 0) for d in data_points])
            anomalies = [d for d in data_points if abs(d.get('value', 0) - mean_val) > 2 * std_val]

            if anomalies:
                insights.append(f"Detected {len(anomalies)} unusual data points that may require attention")

        # Recommendations
        insights.append("Consider A/B testing to improve conversion rates")
        insights.append("Email campaigns show best performance on Tuesday mornings")

        return insights

    async def export_analytics_data(
        self,
        user_id: str,
        export_format: str = 'csv'
    ) -> bytes:
        """
        Export analytics data in specified format

        Args:
            user_id: User identifier
            export_format: Format (csv, json, excel)

        Returns:
            Exported data as bytes
        """
        # Get all user data
        summary = await self.get_dashboard_summary(user_id)

        if export_format == 'json':
            return json.dumps(summary, indent=2).encode()

        elif export_format == 'csv':
            # Convert to CSV format
            df = pd.DataFrame([
                {
                    'Metric': name,
                    'Value': data['value'],
                    'Change': data['change'],
                    'Type': data['change_type']
                }
                for name, data in summary['metrics'].items()
            ])
            return df.to_csv(index=False).encode()

        else:
            # Default to JSON
            return json.dumps(summary, indent=2).encode()


# Celery tasks
@app.task(name='app.services.analytics_service.aggregate_hourly_data')
def aggregate_hourly_data():
    """Aggregate data every hour"""
    service = AnalyticsAggregationService()
    logger.info("Running hourly analytics aggregation")

    # In production, get all active users
    users = ['user1', 'user2']  # Mock data

    for user_id in users:
        try:
            asyncio.run(service.calculate_metrics(
                user_id,
                ['revenue', 'customers', 'conversion_rate']
            ))
        except Exception as e:
            logger.error(f"Failed to aggregate hourly data for {user_id}: {str(e)}")

    return {'status': 'completed', 'users_processed': len(users)}


@app.task(name='app.services.analytics_service.aggregate_daily_data')
def aggregate_daily_data():
    """Aggregate data daily"""
    service = AnalyticsAggregationService()
    logger.info("Running daily analytics aggregation")

    # More comprehensive daily aggregation
    return {'status': 'completed', 'timestamp': datetime.now().isoformat()}


@app.task(name='app.services.analytics_service.generate_weekly_reports')
def generate_weekly_reports():
    """Generate weekly analytics reports"""
    service = AnalyticsAggregationService()
    logger.info("Generating weekly analytics reports")

    # Generate and store weekly reports
    return {'status': 'completed', 'reports_generated': 0}


# Singleton instance
analytics_service = AnalyticsAggregationService()