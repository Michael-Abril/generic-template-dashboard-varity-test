"""
Chart Generation Service for AI-Powered Analytics

This service handles:
1. Parsing user queries to understand chart intent
2. Fetching relevant data from RAG
3. Generating chart configurations that Recharts can render
4. Suggesting optimal chart types based on data
"""

import json
import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from .rag_service import BusinessRAGService
from .together_service import TogetherService

logger = logging.getLogger(__name__)


class ChartGenerationService:
    """
    AI-powered chart generation service

    Generates Recharts-compatible configurations from natural language queries
    """

    def __init__(self):
        self.rag_service = BusinessRAGService()
        self.together_service = TogetherService()

        # Chart type definitions for AI guidance
        self.chart_types = {
            "bar": {
                "use_for": "Comparisons between categories, ranking",
                "max_categories": 12,
                "requires": ["label", "value"]
            },
            "line": {
                "use_for": "Trends over time, continuous data",
                "max_points": 50,
                "requires": ["label", "value"]
            },
            "area": {
                "use_for": "Volume over time, cumulative values",
                "max_points": 50,
                "requires": ["label", "value"]
            },
            "pie": {
                "use_for": "Parts of a whole, distribution",
                "max_slices": 8,
                "requires": ["label", "value"]
            },
            "donut": {
                "use_for": "Parts of a whole with center metric",
                "max_slices": 8,
                "requires": ["label", "value"]
            },
            "kpi": {
                "use_for": "Single metric display with trend",
                "requires": ["value", "label"]
            }
        }

        logger.info("ChartGenerationService initialized")

    async def generate_chart(
        self,
        query: str,
        wallet_address: str,
        integrations: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a chart configuration from a natural language query

        Args:
            query: User's natural language request (e.g., "Show revenue by month")
            wallet_address: User's wallet address for data access
            integrations: Optional filter for specific integrations

        Returns:
            Chart configuration ready for Recharts rendering
        """
        logger.info(f"Generating chart for query: '{query[:100]}...' wallet: {wallet_address[:10]}...")

        try:
            # Step 1: Fetch relevant data from RAG
            rag_results = await self._fetch_relevant_data(
                wallet_address=wallet_address,
                query=query,
                integrations=integrations
            )

            # Step 2: Use AI to analyze data and generate chart config
            chart_config = await self._generate_chart_with_ai(
                query=query,
                rag_data=rag_results,
                wallet_address=wallet_address
            )

            return {
                "success": True,
                "chart": chart_config,
                "data_sources": len(rag_results),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Chart generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "chart": self._get_fallback_chart(query)
            }

    async def _fetch_relevant_data(
        self,
        wallet_address: str,
        query: str,
        integrations: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch data from RAG that's relevant to the chart query"""
        try:
            # Query RAG for relevant business data
            results = await self.rag_service.query_business_rag(
                business_wallet=wallet_address,
                query=query,
                limit=10,
                integration=integrations[0] if integrations else None
            )

            return results

        except Exception as e:
            logger.warning(f"RAG query failed: {e}")
            return []

    async def _generate_chart_with_ai(
        self,
        query: str,
        rag_data: List[Dict[str, Any]],
        wallet_address: str
    ) -> Dict[str, Any]:
        """Use AI to generate chart configuration from query and data"""

        # Build context from RAG data
        data_context = ""
        if rag_data:
            data_samples = []
            for idx, item in enumerate(rag_data[:5], 1):
                data = item.get("data", {})
                integration = item.get("integration", "unknown")
                data_type = item.get("data_type", "unknown")
                data_samples.append(
                    f"Source {idx} ({integration}/{data_type}):\n{json.dumps(data, indent=2)[:500]}"
                )
            data_context = "\n\n".join(data_samples)

        system_prompt = f"""You are a data visualization expert for the Varity Dashboard. Generate chart configurations from user queries.

## AVAILABLE CHART TYPES
{json.dumps(self.chart_types, indent=2)}

## YOUR TASK
Given the user's query and available business data, generate a chart configuration in JSON format.

## RESPONSE FORMAT (JSON ONLY)
You must respond with ONLY valid JSON in this exact format:
{{
    "id": "unique-uuid",
    "type": "bar|line|area|pie|donut|kpi",
    "title": "Chart Title",
    "data": [
        {{"label": "Category 1", "value": 1000}},
        {{"label": "Category 2", "value": 2000}}
    ],
    "config": {{
        "xAxisLabel": "X Axis Label",
        "yAxisLabel": "Y Axis Label",
        "colors": ["#3b82f6", "#10b981", "#f59e0b"],
        "showLegend": true,
        "valuePrefix": "$",
        "valueSuffix": ""
    }},
    "summary": "Brief insight about what the chart shows",
    "suggested_queries": ["Follow-up query 1", "Follow-up query 2"]
}}

## RULES
1. ALWAYS use realistic sample data if actual data is unavailable
2. Choose the most appropriate chart type for the query
3. Use sensible colors from the provided palette
4. Keep data points between 3-12 items for readability
5. Generate meaningful labels and titles
6. Include a brief insight summary
7. Suggest 2-3 follow-up queries

## AVAILABLE DATA
{data_context if data_context else "No specific business data available. Generate representative sample data based on the query type."}
"""

        user_prompt = f"""Generate a chart for this request: "{query}"

Remember to respond with ONLY valid JSON, no markdown code blocks or extra text."""

        try:
            response = await self.together_service.query(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=2048
            )

            # Parse JSON response
            chart_config = self._parse_ai_response(response)

            # Ensure required fields
            if "id" not in chart_config:
                chart_config["id"] = str(uuid.uuid4())

            return chart_config

        except Exception as e:
            logger.error(f"AI chart generation failed: {e}")
            return self._get_fallback_chart(query)

    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response, handling potential formatting issues"""
        try:
            # Try direct JSON parse
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                if json_end > json_start:
                    return json.loads(response[json_start:json_end].strip())
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                if json_end > json_start:
                    return json.loads(response[json_start:json_end].strip())

            # Try to find JSON object in response
            brace_start = response.find("{")
            brace_end = response.rfind("}") + 1
            if brace_start >= 0 and brace_end > brace_start:
                return json.loads(response[brace_start:brace_end])

            raise ValueError("Could not parse AI response as JSON")

    def _get_fallback_chart(self, query: str) -> Dict[str, Any]:
        """Return a fallback chart when generation fails"""
        return {
            "id": str(uuid.uuid4()),
            "type": "bar",
            "title": "Sample Data",
            "data": [
                {"label": "Q1", "value": 25000},
                {"label": "Q2", "value": 32000},
                {"label": "Q3", "value": 28000},
                {"label": "Q4", "value": 41000}
            ],
            "config": {
                "xAxisLabel": "Quarter",
                "yAxisLabel": "Value",
                "colors": ["#3b82f6"],
                "showLegend": False,
                "valuePrefix": "$",
                "valueSuffix": ""
            },
            "summary": "Connect your integrations to see real data for: " + query[:50],
            "suggested_queries": [
                "Show monthly revenue",
                "Compare expenses by category",
                "Display customer growth"
            ]
        }

    def get_chart_suggestions(self, integrations: List[str]) -> List[Dict[str, str]]:
        """Get suggested chart queries based on connected integrations"""
        suggestions = []

        integration_suggestions = {
            "quickbooks": [
                {"query": "Show revenue by month for this year", "type": "line"},
                {"query": "Compare expenses by category", "type": "pie"},
                {"query": "Display outstanding invoices", "type": "bar"},
                {"query": "Show cash flow trend", "type": "area"},
                {"query": "Top 10 customers by revenue", "type": "bar"}
            ],
            "google": [
                {"query": "Emails received per day this week", "type": "bar"},
                {"query": "Meeting hours by day", "type": "area"},
                {"query": "Drive storage by file type", "type": "pie"},
                {"query": "Contact additions over time", "type": "line"}
            ],
            "salesforce": [
                {"query": "Pipeline value by stage", "type": "bar"},
                {"query": "Deals won vs lost this quarter", "type": "pie"},
                {"query": "Sales trend by month", "type": "line"},
                {"query": "Top accounts by opportunity value", "type": "bar"}
            ],
            "hubspot": [
                {"query": "Contacts by lifecycle stage", "type": "pie"},
                {"query": "Deal pipeline by stage", "type": "bar"},
                {"query": "Email engagement over time", "type": "line"},
                {"query": "Marketing vs sales leads", "type": "pie"}
            ],
            "microsoft": [
                {"query": "Emails by sender domain", "type": "pie"},
                {"query": "Calendar events per week", "type": "bar"},
                {"query": "OneDrive usage by folder", "type": "pie"}
            ],
            "slack": [
                {"query": "Messages by channel", "type": "bar"},
                {"query": "Active users over time", "type": "line"},
                {"query": "Message volume by day", "type": "area"}
            ]
        }

        for integration in integrations:
            if integration.lower() in integration_suggestions:
                suggestions.extend(integration_suggestions[integration.lower()])

        # Add generic suggestions if no integrations
        if not suggestions:
            suggestions = [
                {"query": "Show monthly revenue trend", "type": "line"},
                {"query": "Compare quarterly performance", "type": "bar"},
                {"query": "Display expense breakdown", "type": "pie"},
                {"query": "Track customer growth", "type": "area"}
            ]

        return suggestions[:8]  # Limit to 8 suggestions


# Create singleton instance
try:
    chart_generation_service = ChartGenerationService()
    logger.info("Chart generation service singleton created")
except Exception as e:
    logger.warning(f"Failed to create chart generation service: {e}")
    chart_generation_service = None
