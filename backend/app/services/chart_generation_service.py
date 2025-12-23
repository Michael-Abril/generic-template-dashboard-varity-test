"""
Chart Generation Service for AI-Powered Analytics

This service handles:
1. Parsing user queries to understand chart intent
2. Fetching REAL data from Pinata/Filecoin
3. Decrypting and processing business data
4. Generating chart configurations that Recharts can render
5. Suggesting optimal chart types based on data
"""

import json
import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import re

from .rag_service import BusinessRAGService
from .together_service import TogetherService
from .filecoin_service import FilecoinMultiTenantService
from .encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class ChartGenerationService:
    """
    AI-powered chart generation service

    Generates Recharts-compatible configurations from natural language queries
    """

    def __init__(self):
        self.rag_service = BusinessRAGService()
        self.together_service = TogetherService()
        self.filecoin_service = FilecoinMultiTenantService()
        self.encryption_service = EncryptionService()

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
        """
        Fetch REAL data from Pinata/Filecoin that's relevant to the chart query

        This method:
        1. Determines which integration to query based on the user's question
        2. Fetches encrypted data from Pinata
        3. Decrypts the data
        4. Returns structured data ready for charting
        """
        try:
            # Step 1: Determine which integration to query
            target_integration = self._detect_integration_from_query(query, integrations)

            logger.info(f"Fetching data for chart - Integration: {target_integration}, Query: {query[:50]}...")

            # Step 2: Query Pinata for business data files
            files = await self.filecoin_service.query_business_data(
                business_wallet=wallet_address,
                integration=target_integration,
                data_type=None  # Fetch all data types for the integration
            )

            if not files:
                logger.warning(f"No data found in Pinata for wallet {wallet_address[:10]}...")
                return []

            logger.info(f"Found {len(files)} files in Pinata for {target_integration or 'all integrations'}")

            # Step 3: Retrieve and decrypt the most recent files
            decrypted_data = []
            for file_info in files[:10]:  # Limit to 10 most recent files
                try:
                    cid = file_info.get("cid")
                    metadata = file_info.get("metadata", {})

                    # Retrieve encrypted data from IPFS
                    encrypted_payload = await self.filecoin_service.retrieve_data(cid)

                    # Decrypt the data
                    decrypted = await self._decrypt_customer_data(
                        wallet_address=wallet_address,
                        encrypted_payload=encrypted_payload
                    )

                    if decrypted:
                        decrypted_data.append({
                            "data": decrypted,
                            "integration": metadata.get("integration", "unknown"),
                            "data_type": metadata.get("data_type", "unknown"),
                            "cid": cid,
                            "timestamp": metadata.get("timestamp", "")
                        })

                except Exception as e:
                    logger.warning(f"Failed to decrypt file {file_info.get('cid', 'unknown')}: {e}")
                    continue

            logger.info(f"Successfully decrypted {len(decrypted_data)} data sources")
            return decrypted_data

        except Exception as e:
            logger.warning(f"Data fetch from Pinata failed: {e}, falling back to RAG")

            # Fallback to RAG if Pinata query fails
            try:
                results = await self.rag_service.query_business_rag(
                    business_wallet=wallet_address,
                    query=query,
                    limit=10,
                    integration=integrations[0] if integrations else None
                )
                return results
            except Exception as rag_error:
                logger.error(f"Both Pinata and RAG queries failed: {rag_error}")
                return []

    def _detect_integration_from_query(
        self,
        query: str,
        integrations: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Detect which integration to query based on keywords in the user's question

        Examples:
        - "Show my revenue" -> "quickbooks"
        - "Show email volume" -> "google"
        - "Show my pipeline" -> "salesforce"
        """
        query_lower = query.lower()

        # Integration keyword mappings
        integration_keywords = {
            "quickbooks": ["revenue", "invoice", "expense", "payment", "customer", "vendor", "bill", "sales", "profit", "cash flow"],
            "google": ["email", "gmail", "calendar", "meeting", "drive", "contact", "file"],
            "salesforce": ["deal", "pipeline", "opportunity", "lead", "account", "contact", "crm"],
            "hubspot": ["deal", "pipeline", "contact", "lead", "marketing", "campaign"],
            "microsoft": ["email", "outlook", "onedrive", "calendar", "teams"],
            "slack": ["message", "channel", "conversation", "team communication"]
        }

        # If specific integrations are provided, check those first
        if integrations:
            for integration in integrations:
                if integration.lower() in query_lower:
                    return integration

        # Otherwise, detect from keywords
        for integration, keywords in integration_keywords.items():
            for keyword in keywords:
                if keyword in query_lower:
                    logger.info(f"Detected integration '{integration}' from keyword '{keyword}'")
                    return integration

        # If no specific integration detected, return None (query all)
        return None

    async def _decrypt_customer_data(
        self,
        wallet_address: str,
        encrypted_payload: dict
    ) -> Optional[dict]:
        """
        Decrypt customer data retrieved from Filecoin

        Args:
            wallet_address: Customer's wallet address
            encrypted_payload: Encrypted data from Filecoin

        Returns:
            Decrypted data dictionary or None if decryption fails
        """
        try:
            # The encrypted payload format from Filecoin is:
            # {
            #     "encrypted": "hex_string",
            #     "wallet": "wallet_address",
            #     "integration": "integration_name",
            #     "data_type": "data_type",
            #     "encrypted_at": "timestamp"
            # }

            encrypted_hex = encrypted_payload.get("encrypted")
            if not encrypted_hex:
                logger.warning("No encrypted data found in payload")
                return None

            # Convert hex string back to bytes
            encrypted_bytes = bytes.fromhex(encrypted_hex)

            # Decrypt using wallet-derived key
            decrypted = await self.encryption_service.decrypt_with_wallet(
                encrypted_data={
                    "encrypted_data": encrypted_bytes,
                    "metadata": {
                        "customer_wallet": wallet_address.lower(),
                        "integration": encrypted_payload.get("integration", "unknown")
                    }
                },
                customer_wallet=wallet_address
            )

            return decrypted

        except Exception as e:
            logger.error(f"Decryption failed for wallet {wallet_address[:10]}...: {e}")
            return None

    async def _generate_chart_with_ai(
        self,
        query: str,
        rag_data: List[Dict[str, Any]],
        wallet_address: str
    ) -> Dict[str, Any]:
        """
        Use AI to generate chart configuration from query and REAL data

        This method:
        1. Analyzes the actual business data
        2. Determines the best chart type for the data
        3. Transforms data into chart-ready format
        4. Generates insights and suggested queries
        """

        # Build context from real business data
        data_context = ""
        has_real_data = False

        if rag_data:
            data_samples = []
            for idx, item in enumerate(rag_data[:5], 1):
                data = item.get("data", {})
                integration = item.get("integration", "unknown")
                data_type = item.get("data_type", "unknown")

                # Format data nicely with truncation for large datasets
                data_json = json.dumps(data, indent=2, default=str)
                if len(data_json) > 1000:
                    data_json = data_json[:1000] + "\n... (truncated)"

                data_samples.append(
                    f"Source {idx} ({integration}/{data_type}):\n{data_json}"
                )
                has_real_data = True

            data_context = "\n\n".join(data_samples)

        # Indicate if we have real data or should use samples
        data_availability = "REAL BUSINESS DATA AVAILABLE" if has_real_data else "NO DATA - GENERATE SAMPLE"

        system_prompt = f"""You are a data visualization expert for the Varity Dashboard. Generate chart configurations from user queries and REAL business data.

## DATA STATUS: {data_availability}

## AVAILABLE CHART TYPES
{json.dumps(self.chart_types, indent=2)}

## YOUR TASK
Given the user's query and available business data, generate a chart configuration in JSON format.

## CRITICAL INSTRUCTIONS FOR REAL DATA
If REAL data is available:
1. **Extract actual values** from the provided business data
2. **Use real labels, amounts, dates** from the data (e.g., actual customer names, invoice amounts, dates)
3. **Calculate aggregations** if needed (sum, average, count)
4. **Transform data structures** to chart format (e.g., convert array of invoices to monthly revenue)
5. **Provide insights** based on actual patterns in the data

If NO real data:
1. Generate representative sample data that matches the query type
2. Use realistic values for the industry/context
3. Include a note in the summary that this is sample data

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
        "colors": ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"],
        "showLegend": true,
        "valuePrefix": "$",
        "valueSuffix": ""
    }},
    "summary": "Brief insight about what the chart shows (mention if using real data or samples)",
    "suggested_queries": ["Follow-up query 1", "Follow-up query 2", "Follow-up query 3"]
}}

## DATA PROCESSING EXAMPLES

### Example 1: Revenue by Month (QuickBooks invoices)
Query: "Show my revenue by month"
Real Data: [{{"invoice_date": "2024-01-15", "total": 5000}}, {{"invoice_date": "2024-01-20", "total": 3000}}, {{"invoice_date": "2024-02-10", "total": 7000}}]

Expected Output:
{{
    "type": "bar",
    "title": "Revenue by Month",
    "data": [
        {{"label": "January 2024", "value": 8000}},
        {{"label": "February 2024", "value": 7000}}
    ],
    "config": {{"valuePrefix": "$"}},
    "summary": "Total revenue of $15,000 across 2 months. February shows a decrease from January."
}}

### Example 2: Email Volume (Gmail data)
Query: "Show email volume over time"
Real Data: [{{"date": "2024-01-01", "from": "john@example.com"}}, {{"date": "2024-01-01", "from": "jane@example.com"}}, {{"date": "2024-01-02", "from": "bob@example.com"}}]

Expected Output:
{{
    "type": "line",
    "title": "Daily Email Volume",
    "data": [
        {{"label": "Jan 1", "value": 2}},
        {{"label": "Jan 2", "value": 1}}
    ],
    "summary": "Received 3 emails over 2 days. Peak on January 1 with 2 emails."
}}

## AVAILABLE DATA
{data_context if data_context else "No specific business data available. Generate representative sample data based on the query type."}

## RULES
1. Choose the most appropriate chart type for the query
2. Keep data points between 3-15 items for readability
3. Use meaningful labels and titles based on actual data
4. Include a brief insight summary with specific numbers
5. Suggest 2-3 relevant follow-up queries
6. For financial data, use "$" prefix; for percentages, use "%" suffix
7. Use appropriate date formats (e.g., "Jan 2024", "Q1 2024", "Week of Jan 1")
"""

        user_prompt = f"""Generate a chart for this request: "{query}"

Analyze the available data carefully and transform it into the appropriate chart format. If real data is available, USE IT. Extract actual values, labels, and dates.

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
        """
        Return a fallback chart when generation fails

        This provides a helpful sample chart that guides users to connect integrations
        """
        # Determine chart type based on query keywords
        query_lower = query.lower()
        chart_type = "bar"
        title = "Sample Data"
        data = []
        config = {
            "xAxisLabel": "Category",
            "yAxisLabel": "Value",
            "colors": ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e"],
            "showLegend": False,
            "valuePrefix": "",
            "valueSuffix": ""
        }

        # Customize based on query intent
        if any(keyword in query_lower for keyword in ["revenue", "sales", "income"]):
            chart_type = "line"
            title = "Sample Revenue Trend"
            data = [
                {"label": "Jan", "value": 45000},
                {"label": "Feb", "value": 52000},
                {"label": "Mar", "value": 48000},
                {"label": "Apr", "value": 61000},
                {"label": "May", "value": 58000},
                {"label": "Jun", "value": 67000}
            ]
            config["valuePrefix"] = "$"
            config["xAxisLabel"] = "Month"
            config["yAxisLabel"] = "Revenue"

        elif any(keyword in query_lower for keyword in ["expense", "cost", "spending"]):
            chart_type = "pie"
            title = "Sample Expense Breakdown"
            data = [
                {"label": "Payroll", "value": 45000},
                {"label": "Marketing", "value": 18000},
                {"label": "Operations", "value": 23000},
                {"label": "Software", "value": 12000},
                {"label": "Other", "value": 8000}
            ]
            config["valuePrefix"] = "$"

        elif any(keyword in query_lower for keyword in ["email", "message"]):
            chart_type = "bar"
            title = "Sample Email Volume"
            data = [
                {"label": "Mon", "value": 45},
                {"label": "Tue", "value": 62},
                {"label": "Wed", "value": 58},
                {"label": "Thu", "value": 71},
                {"label": "Fri", "value": 52}
            ]
            config["xAxisLabel"] = "Day"
            config["yAxisLabel"] = "Emails"

        elif any(keyword in query_lower for keyword in ["pipeline", "deal", "opportunity"]):
            chart_type = "bar"
            title = "Sample Sales Pipeline"
            data = [
                {"label": "Prospecting", "value": 125000},
                {"label": "Qualified", "value": 85000},
                {"label": "Proposal", "value": 62000},
                {"label": "Negotiation", "value": 45000},
                {"label": "Closed Won", "value": 32000}
            ]
            config["valuePrefix"] = "$"
            config["xAxisLabel"] = "Stage"
            config["yAxisLabel"] = "Value"

        elif any(keyword in query_lower for keyword in ["customer", "client"]):
            chart_type = "area"
            title = "Sample Customer Growth"
            data = [
                {"label": "Jan", "value": 150},
                {"label": "Feb", "value": 165},
                {"label": "Mar", "value": 182},
                {"label": "Apr", "value": 201},
                {"label": "May", "value": 223},
                {"label": "Jun", "value": 247}
            ]
            config["xAxisLabel"] = "Month"
            config["yAxisLabel"] = "Customers"

        else:
            # Generic quarterly data
            data = [
                {"label": "Q1 2024", "value": 25000},
                {"label": "Q2 2024", "value": 32000},
                {"label": "Q3 2024", "value": 28000},
                {"label": "Q4 2024", "value": 41000}
            ]
            config["valuePrefix"] = "$"

        return {
            "id": str(uuid.uuid4()),
            "type": chart_type,
            "title": title,
            "data": data,
            "config": config,
            "summary": f"This is sample data. Connect your integrations (QuickBooks, Google Workspace, Salesforce, etc.) to see real insights for: {query[:100]}",
            "suggested_queries": [
                "Show monthly revenue trend",
                "Compare expenses by category",
                "Display customer growth over time",
                "Show my sales pipeline by stage"
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
