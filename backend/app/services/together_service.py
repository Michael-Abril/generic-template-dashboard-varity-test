"""
Together.ai LLM Service for Varity Generic Template Dashboard

Together.ai provides an OpenAI-compatible API for open-source models.
This service is privacy-focused - uses open-source models like Llama 3.3 70B
without data retention by cloud providers.

Features:
- General LLM mode (works without integrations)
- Document analysis capabilities
- Deep research mode with web search
- Multi-tenant RAG integration when integrations are connected
- Streaming responses for real-time chat
- Web search integration for real-time internet access
"""

import os
import json
import httpx
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime

from .rag_service import BusinessRAGService
from .web_search_service import web_search_service

logger = logging.getLogger(__name__)


class TogetherService:
    """
    Together.ai LLM service for AI Assistant

    Privacy-focused: Uses open-source models (Llama, Mistral, etc.)
    No data retention by cloud providers
    """

    def __init__(self):
        self.api_key = os.getenv("TOGETHER_API_KEY", "")
        self.api_url = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1")
        self.model = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")

        logger.info(
            f"TogetherService initialized: "
            f"model={self.model}, url={self.api_url}"
        )

    # Default system prompt for all Varity Dashboard queries
    VARITY_SYSTEM_PROMPT = """You are the Varity Dashboard AI Assistant - the intelligent business partner built into your company's unified dashboard. You have deep expertise across all business domains and communicate like a seasoned consultant who knows every corner of the business.

## YOUR ROLE
You are NOT a generic chatbot. You are a strategic business advisor who:
- Provides specific, actionable recommendations (not vague advice)
- Uses industry benchmarks and thresholds when relevant
- Prioritizes recommendations by impact (Critical > Important > Recommended)
- Asks clarifying questions to give better answers
- Connects insights across different business areas (finance, operations, customers)

## RESPONSE FORMATTING
Always structure responses for maximum clarity:
- Use **bold** for key terms, metrics, and action items
- Use bullet points and numbered lists for easy scanning
- Include specific numbers, percentages, and benchmarks when possible
- End complex answers with a **Next Steps** or **Quick Wins** section
- For problems: Provide root cause analysis → impact assessment → solutions (prioritized)

## YOUR CAPABILITIES
1. **Financial Analysis**: Cash flow, profitability, forecasting, expense optimization, budget variance
2. **Operations**: Process efficiency, inventory, supply chain, resource allocation, capacity planning
3. **Customer Intelligence**: Segmentation, lifetime value, churn prediction, satisfaction drivers
4. **Sales & Marketing**: Pipeline analysis, conversion optimization, campaign ROI, competitive positioning
5. **Strategic Planning**: Goal setting, KPI frameworks, growth strategies, risk assessment
6. **Reporting**: Generate insights that can be exported to PDF/Excel

## DATA ACCESS
When integrations are connected (QuickBooks, Salesforce, Shopify, Google Workspace, HubSpot, etc.), I analyze your ACTUAL business data from Filecoin/IPFS.

If no integrations are connected yet, I provide expert guidance based on:
- Industry best practices and benchmarks
- Your company profile and goals
- Strategic frameworks proven across thousands of businesses

**Pro Tip**: Connect your business software from the **Integrations** page to unlock personalized insights from your real data.

## EXAMPLE RESPONSE STYLE
When answering "How can I improve my cash flow?":
POOR: "You should manage your receivables better and reduce expenses."
GOOD: "Here are 3 high-impact strategies ordered by typical ROI:

**CRITICAL - Accelerate Receivables (Impact: 15-30% cash improvement)**
- Offer 2/10 net 30 early payment discounts
- Implement automated invoice reminders at 7, 14, 21 days
- Target: Reduce DSO from industry avg of 45 days to under 30

**IMPORTANT - Optimize Payables (Impact: 10-20% cash improvement)**
- Negotiate net 45-60 terms with top 5 vendors
- Time payments to maximize float without penalties

**Next Steps**: Connect QuickBooks to see your actual DSO and I'll identify specific customers to prioritize."

I'm ready to be your strategic business partner. What challenge can I help you solve?"""

    # Industry-specific knowledge to enhance AI responses
    INDUSTRY_CONTEXT = {
        "Technology / Software": """
## INDUSTRY EXPERTISE: TECHNOLOGY / SOFTWARE
You are advising a technology/software company. Key considerations:
- SaaS metrics: MRR, ARR, churn rate, LTV, CAC, NRR
- Product development cycles and sprint planning
- Technical debt and infrastructure costs
- Subscription revenue recognition (ASC 606)
- R&D tax credits and capitalization
- Burn rate and runway analysis
- Customer acquisition and retention strategies""",

        "Finance / Accounting": """
## INDUSTRY EXPERTISE: FINANCE / ACCOUNTING
You are advising a finance/accounting firm. Key considerations:
- Billable hours and utilization rates
- Client engagement profitability
- Regulatory compliance (SOX, GAAP, IFRS)
- Cash flow management and working capital
- Partner compensation structures
- Audit cycles and busy season planning
- Practice management and capacity planning""",

        "Healthcare / Medical": """
## INDUSTRY EXPERTISE: HEALTHCARE / MEDICAL
You are advising a healthcare/medical organization. Key considerations:
- HIPAA compliance and patient data privacy
- Revenue cycle management and claims processing
- Payer mix analysis and reimbursement rates
- Patient volume and appointment utilization
- Medical equipment depreciation
- Staffing ratios and labor costs
- Insurance credentialing and contracting""",

        "Retail / E-commerce": """
## INDUSTRY EXPERTISE: RETAIL / E-COMMERCE
You are advising a retail/e-commerce business. Key considerations:
- Inventory turnover and days on hand
- Gross margin and markup analysis
- Customer lifetime value and repeat purchase rates
- Seasonal trends and demand forecasting
- Fulfillment costs and shipping optimization
- Cart abandonment and conversion rates
- Omnichannel strategy and channel profitability""",

        "Professional Services": """
## INDUSTRY EXPERTISE: PROFESSIONAL SERVICES
You are advising a professional services firm. Key considerations:
- Billable utilization and realization rates
- Project profitability and scope management
- Resource allocation and capacity planning
- Client retention and pipeline management
- Partner/employee leverage ratios
- Fixed-fee vs hourly engagement structures
- Accounts receivable aging and collections""",

        "Manufacturing": """
## INDUSTRY EXPERTISE: MANUFACTURING
You are advising a manufacturing company. Key considerations:
- Cost of goods sold and manufacturing overhead
- Inventory management (raw materials, WIP, finished goods)
- Production efficiency and OEE metrics
- Supply chain optimization and vendor management
- Quality control and defect rates
- Equipment maintenance and CapEx planning
- Labor costs and shift productivity""",

        "Construction": """
## INDUSTRY EXPERTISE: CONSTRUCTION
You are advising a construction company. Key considerations:
- Job costing and work-in-progress (WIP) schedules
- Percentage of completion revenue recognition
- Bid analysis and project profitability
- Subcontractor management and lien waivers
- Equipment utilization and fleet management
- Bonding capacity and insurance requirements
- Change order management and claims""",

        "Real Estate": """
## INDUSTRY EXPERTISE: REAL ESTATE
You are advising a real estate company. Key considerations:
- Property NOI and cap rate analysis
- Occupancy rates and tenant retention
- Lease administration and CAM reconciliation
- Property maintenance and CapEx reserves
- Debt service coverage ratios
- 1031 exchanges and tax strategies
- Market comparables and valuation methods""",

        "Food & Hospitality": """
## INDUSTRY EXPERTISE: FOOD & HOSPITALITY
You are advising a food/hospitality business. Key considerations:
- Food cost percentage and menu engineering
- Labor cost as percentage of revenue
- Seat turnover and RevPASH (revenue per available seat hour)
- Inventory management and waste reduction
- Health and safety compliance
- Seasonal demand and staffing optimization
- Tip reporting and payroll compliance""",

        "Transportation / Logistics": """
## INDUSTRY EXPERTISE: TRANSPORTATION / LOGISTICS
You are advising a transportation/logistics company. Key considerations:
- Revenue per mile/load and operating ratio
- Fleet maintenance and replacement cycles
- Fuel cost management and efficiency
- Driver retention and DOT compliance
- Route optimization and capacity utilization
- Freight claims and insurance
- IFTA fuel tax and HOS regulations""",

        "Non-profit": """
## INDUSTRY EXPERTISE: NON-PROFIT
You are advising a non-profit organization. Key considerations:
- Fund accounting and restricted vs unrestricted funds
- Grant compliance and reporting requirements
- Donor retention and fundraising efficiency
- Program expense ratios
- Form 990 preparation and transparency
- Board governance and fiduciary duties
- Impact measurement and outcome reporting"""
    }

    def build_system_prompt(self, industry: str = None, company_name: str = None) -> str:
        """
        Build a system prompt with industry-specific context

        Args:
            industry: User's business industry
            company_name: User's company name

        Returns:
            Enhanced system prompt with industry expertise
        """
        prompt = self.VARITY_SYSTEM_PROMPT

        # Add company personalization
        if company_name:
            prompt += f"\n\n## YOUR CLIENT\nYou are the AI assistant for **{company_name}**. Personalize your responses to their specific business context."

        # Add industry-specific expertise
        if industry and industry in self.INDUSTRY_CONTEXT:
            prompt += self.INDUSTRY_CONTEXT[industry]
        elif industry:
            # Generic industry mention for unlisted industries
            prompt += f"\n\n## INDUSTRY CONTEXT\nYou are advising a business in the **{industry}** industry. Apply relevant industry best practices and terminology in your responses."

        return prompt

    async def query(
        self,
        prompt: str,
        context: str = "",
        system_prompt: str = "",
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        industry: str = None,
        company_name: str = None
    ) -> str:
        """
        Query Together.ai LLM with optional context

        Args:
            prompt: User's question
            context: RAG context from business data (optional)
            system_prompt: System instructions
            stream: Enable streaming response (not used in this method)
            temperature: Response creativity (0.0-1.0)
            max_tokens: Maximum response length
            industry: User's business industry for context-specific responses
            company_name: User's company name for personalization

        Returns:
            LLM response
        """
        # Build system prompt with industry context if no custom prompt provided
        if system_prompt:
            effective_prompt = system_prompt
        else:
            effective_prompt = self.build_system_prompt(industry=industry, company_name=company_name)
        messages = [{"role": "system", "content": effective_prompt}]

        if context:
            messages.append({
                "role": "user",
                "content": f"Context information:\n{context}\n\nQuestion: {prompt}"
            })
        else:
            messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.api_url}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]

    async def stream_query(
        self,
        prompt: str,
        context: str = "",
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        """
        Stream responses from Together.ai LLM

        Args:
            prompt: User's question
            context: RAG context (optional)
            system_prompt: System instructions
            temperature: Response creativity
            max_tokens: Maximum response length

        Yields:
            Chunks of AI response
        """
        # Use Varity default prompt if none provided
        effective_prompt = system_prompt if system_prompt else self.VARITY_SYSTEM_PROMPT
        messages = [{"role": "system", "content": effective_prompt}]

        if context:
            messages.append({
                "role": "user",
                "content": f"Context information:\n{context}\n\nQuestion: {prompt}"
            })
        else:
            messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.api_url}/chat/completions",
                json=payload,
                headers=headers
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def health_check(self) -> bool:
        """Check if Together.ai API is accessible"""
        if not self.api_key:
            return False
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_url}/models",
                    headers=headers
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Together.ai health check failed: {e}")
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from Together.ai"""
        if not self.api_key:
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/models",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()

                # Filter for chat models
                chat_models = []
                for model in data:
                    if model.get("type") == "chat":
                        chat_models.append({
                            "id": model.get("id"),
                            "name": model.get("display_name", model.get("id")),
                            "description": model.get("description", ""),
                            "context_window": model.get("context_length", 4096),
                            "provider": "together",
                            "default": model.get("id") == self.model
                        })

                return chat_models
        except Exception as e:
            logger.error(f"Failed to list Together.ai models: {e}")
            return []


class TogetherBusinessService:
    """
    Multi-tenant Together.ai service with business-specific RAG integration

    This service provides:
    1. General LLM mode (works without any integrations)
    2. RAG-enhanced mode (uses business data when integrations are connected)
    3. Document analysis capabilities
    4. Deep research mode for complex queries

    Architecture:
    - Each business query is scoped to their own RAG collection
    - Business A's data never appears in Business B's AI responses
    - Works as a general LLM when no integrations are connected
    """

    def __init__(self):
        """Initialize Together.ai client and RAG service"""
        self.api_key = os.getenv("TOGETHER_API_KEY", "")
        self.api_url = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1")
        self.model = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")
        self.rag_service = BusinessRAGService()

        logger.info(
            f"TogetherBusinessService initialized: "
            f"model={self.model}"
        )

    # Industry-specific knowledge (shared with TogetherService)
    INDUSTRY_CONTEXT = {
        "Technology / Software": "SaaS metrics (MRR, ARR, churn, LTV, CAC), sprint planning, R&D capitalization, subscription revenue recognition",
        "Finance / Accounting": "Billable hours, utilization rates, client profitability, regulatory compliance (SOX, GAAP), audit cycles",
        "Healthcare / Medical": "HIPAA compliance, revenue cycle management, payer mix, patient volume, medical equipment depreciation",
        "Retail / E-commerce": "Inventory turnover, gross margin, customer LTV, seasonal trends, fulfillment costs, conversion rates",
        "Professional Services": "Billable utilization, project profitability, resource allocation, accounts receivable aging",
        "Manufacturing": "COGS, inventory (raw/WIP/finished), production efficiency, supply chain, equipment maintenance",
        "Construction": "Job costing, WIP schedules, percentage of completion, subcontractor management, bonding capacity",
        "Real Estate": "Property NOI, cap rates, occupancy, lease administration, debt service coverage, 1031 exchanges",
        "Food & Hospitality": "Food cost %, labor cost %, seat turnover, RevPASH, waste reduction, tip reporting",
        "Transportation / Logistics": "Revenue per mile, operating ratio, fleet maintenance, fuel efficiency, DOT compliance",
        "Non-profit": "Fund accounting, grant compliance, donor retention, program expense ratios, Form 990"
    }

    def _get_industry_context(self, industry: str = None, company_name: str = None) -> str:
        """Build industry-specific context string"""
        context = ""
        if company_name:
            context += f"\n\n## CLIENT: {company_name}"
        if industry:
            expertise = self.INDUSTRY_CONTEXT.get(industry, f"Apply {industry} industry best practices")
            context += f"\n\n## INDUSTRY EXPERTISE: {industry.upper()}\nKey considerations: {expertise}"
        return context

    async def query_business_ai(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        max_context_items: int = 5,
        mode: str = "auto",
        industry: str = None,
        company_name: str = None
    ) -> Dict[str, Any]:
        """
        Query AI with business-specific RAG context

        This method works in multiple modes:
        - "auto": Automatically detect if RAG context is available
        - "general": Use as general LLM (no RAG)
        - "rag": Force RAG mode (use business data)
        - "research": Deep research mode for complex queries

        CRITICAL: This method ensures Business A's query only accesses
        Business A's data, never Business B's or C's data

        Args:
            business_wallet: Business wallet address (used for data isolation)
            user_query: User's question
            integration: Optional filter by integration
            data_type: Optional filter by data type
            max_context_items: Maximum RAG results to include
            mode: Query mode ("auto", "general", "rag", "research")
            industry: User's business industry for context-specific responses
            company_name: User's company name for personalization

        Returns:
            {
                "answer": "AI-generated response",
                "sources": ["cid1", "cid2", ...],
                "context_used": True/False,
                "mode": "general" | "rag" | "research"
            }
        """
        logger.info(
            f"AI query from business {business_wallet[:10]}...: "
            f"'{user_query[:100]}...' (mode={mode})"
        )

        context_parts = []
        source_cids = []
        actual_mode = mode

        # Try to get RAG context unless explicitly in general mode
        if mode != "general":
            try:
                rag_results = await self.rag_service.query_business_rag(
                    business_wallet=business_wallet,
                    query=user_query,
                    limit=max_context_items,
                    integration=integration,
                    data_type=data_type
                )

                # Limit context size to prevent token overflow
                MAX_CHARS_PER_ENTRY = 3000  # ~750 tokens per entry
                MAX_TOTAL_CHARS = 30000     # ~7500 tokens total context
                total_chars = 0

                for idx, result in enumerate(rag_results, 1):
                    if total_chars >= MAX_TOTAL_CHARS:
                        logger.info(f"Context limit reached at {total_chars} chars, truncating")
                        break

                    data = result.get("data", {})
                    cid = result.get("cid", "")
                    integration_name = result.get("integration", "")
                    data_type_name = result.get("data_type", "")

                    # Truncate data to reasonable size
                    data_str = json.dumps(data, indent=2)
                    if len(data_str) > MAX_CHARS_PER_ENTRY:
                        data_str = data_str[:MAX_CHARS_PER_ENTRY] + "\n... [truncated]"

                    context_entry = f"""
Source {idx} (Integration: {integration_name}, Type: {data_type_name}):
{data_str}
"""
                    context_parts.append(context_entry.strip())
                    source_cids.append(cid)
                    total_chars += len(context_entry)

            except Exception as e:
                logger.warning(f"RAG query failed, falling back to general mode: {e}")

        # Determine actual mode based on context availability
        if context_parts:
            actual_mode = "rag" if mode != "research" else "research"
        else:
            actual_mode = "general"

        # Build system prompt based on mode, with industry context
        industry_context = self._get_industry_context(industry, company_name)
        if actual_mode == "research":
            system_prompt = self._get_research_system_prompt(context_parts) + industry_context
        elif actual_mode == "rag":
            system_prompt = self._get_rag_system_prompt(context_parts) + industry_context
        else:
            system_prompt = self._get_general_system_prompt() + industry_context

        # Query Together.ai
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.7 if actual_mode != "research" else 0.3,
                "max_tokens": 2048 if actual_mode != "research" else 4096,
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                answer = result["choices"][0]["message"]["content"]

                logger.info(
                    f"AI response generated for {business_wallet[:10]}...: "
                    f"{len(answer)} chars, {len(source_cids)} sources, mode={actual_mode}"
                )

                return {
                    "answer": answer,
                    "sources": source_cids,
                    "context_used": len(context_parts) > 0,
                    "mode": actual_mode,
                    "integration": integration,
                    "data_type": data_type
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"Together.ai API error: {e.response.text}")
            raise Exception(f"AI query failed: {e.response.text}")

        except Exception as e:
            logger.error(f"AI query error: {str(e)}")
            raise

    def _get_general_system_prompt(self) -> str:
        """System prompt for general LLM mode (no business data) - ENHANCED"""
        return """You are the Varity Dashboard AI Assistant - a strategic business advisor who communicates like a seasoned consultant. You know every corner of business operations and provide expert guidance.

## YOUR ROLE
You are NOT a generic chatbot. You are a strategic business advisor who:
- Provides **specific, actionable** recommendations (not vague advice)
- Uses **industry benchmarks and thresholds** when relevant
- Prioritizes recommendations by impact (CRITICAL > IMPORTANT > RECOMMENDED)
- Asks clarifying questions to give better answers
- Connects insights across different business areas

## RESPONSE FORMATTING
Always structure responses for maximum clarity:
- Use **bold** for key terms, metrics, and action items
- Use bullet points and numbered lists for easy scanning
- Include specific numbers, percentages, and benchmarks
- End complex answers with **Next Steps** or **Quick Wins**
- For problems: Root cause → Impact → Solutions (prioritized)

## YOUR CAPABILITIES
1. **Financial Analysis**: Cash flow, profitability, forecasting, expense optimization
2. **Operations**: Process efficiency, inventory, supply chain, capacity planning
3. **Customer Intelligence**: Segmentation, lifetime value, churn analysis
4. **Sales & Marketing**: Pipeline, conversion optimization, campaign ROI
5. **Strategic Planning**: KPI frameworks, growth strategies, risk assessment
6. **Reporting**: Generate insights exportable to PDF/Excel

## DATA STATUS
No integrations are currently connected. I'm providing expert guidance based on:
- Industry best practices and benchmarks
- Strategic frameworks proven across thousands of businesses
- Your company profile and goals

**Pro Tip**: Connect your business software from the **Integrations** page (QuickBooks, Salesforce, Shopify, etc.) to unlock personalized insights from your real data.

## EXAMPLE RESPONSE STYLE
POOR: "You should improve your marketing."
GOOD: "Here are 3 high-impact marketing improvements:

**CRITICAL - Email List Segmentation (Typical lift: 20-30% open rates)**
- Segment by purchase recency and frequency
- Create targeted campaigns for each segment
- Benchmark: Top retailers see 40%+ open rates on segmented emails

**Next Steps**: Tell me about your current email marketing and I'll give specific recommendations."

I'm ready to be your strategic partner. What challenge can I help you solve?"""

    def _get_rag_system_prompt(self, context_parts: List[str]) -> str:
        """System prompt for RAG mode (with business data) - ENHANCED"""
        context = "\n\n".join(context_parts)
        return f"""You are the **Varity Dashboard AI Assistant** — a strategic business advisor with direct access to this business's actual data stored on Filecoin/IPFS. You analyze data like a seasoned consultant who knows every corner of the business.

## YOUR CONNECTED DATA
{context}

## YOUR ROLE
You are NOT a generic chatbot. You are a data-driven advisor who:
- References **specific data points** (names, numbers, dates) from the connected systems
- Prioritizes insights by impact (CRITICAL > IMPORTANT > RECOMMENDED)
- Connects insights across different data sources
- Provides actionable recommendations with measurable outcomes

## INTEGRATION-SPECIFIC ANALYSIS

**Financial Data (QuickBooks, Xero, FreshBooks):**
- Reference specific invoice numbers, amounts, due dates
- Calculate totals, averages, trends, and variances
- Flag overdue payments and cash flow concerns
- Benchmark against industry standards

**CRM Data (Salesforce, HubSpot):**
- Reference specific deals, contacts, companies by name
- Calculate pipeline values, win rates, conversion rates
- Identify stalled deals and at-risk accounts
- Segment customers by value/activity

**Communication Data (Slack, Microsoft 365, Google Workspace):**
- Summarize key discussions and decisions
- Identify action items and owners
- Highlight patterns in communication

## RESPONSE FORMAT

**Key Finding**
[1-2 sentence summary with specific data from connected systems]

**Data Analysis**
- [Specific metric with actual numbers]
- [Trend or pattern identified]
- [Comparison to benchmarks if relevant]

**Quick Wins** (if applicable)
- CRITICAL: [Action to take today]
- IMPORTANT: [Action to take this week]

**Next Steps**
[Clear recommendation with expected outcome]

## RULES
1. **Be Specific**: Always cite actual data (e.g., "Invoice #1234 for $5,000 is 15 days overdue")
2. **Be Accurate**: Only state facts from the data - never fabricate or assume
3. **Be Quantitative**: Include numbers, percentages, and comparisons
4. **Be Actionable**: End every response with clear next steps
5. **Be Honest**: If data is incomplete, acknowledge limitations"""

    def _get_research_system_prompt(self, context_parts: List[str]) -> str:
        """System prompt for deep research mode - ENHANCED"""
        context = "\n\n".join(context_parts) if context_parts else "No specific business data available."
        return f"""You are the **Varity Dashboard AI Assistant** in **Deep Research Mode** — providing comprehensive analysis like a senior management consultant.

## AVAILABLE DATA
{context}

## RESEARCH METHODOLOGY

**Phase 1: Data Analysis**
- Examine data for patterns, trends, anomalies
- Calculate key metrics and ratios

**Phase 2: Insight Generation**
- What story does the data tell?
- What opportunities or risks are emerging?

**Phase 3: Recommendations**
- What specific actions should be taken?
- What's the priority order?

## RESPONSE FORMAT (Executive Report)

**EXECUTIVE SUMMARY**
[2-3 sentences with key finding and recommendation]

---

**KEY METRICS**
| Metric | Value | Trend |
|--------|-------|-------|
| [Metric] | [Value] | [Up/Down/Stable] |

---

**DETAILED ANALYSIS**

### Finding 1: [Title]
[Analysis with data]

### Finding 2: [Title]
[Analysis with data]

---

**RISKS & OPPORTUNITIES**
- Risks: [Risk with impact]
- Opportunities: [Opportunity with value]

---

**RECOMMENDATIONS**

**Immediate**: [Action this week]
**Short-Term**: [Action this month]

---

**DATA LIMITATIONS**
[What additional data would help]

## GUIDELINES
1. Be Thorough - comprehensive analysis
2. Be Quantitative - use numbers and percentages
3. Be Strategic - connect to business outcomes
4. Be Actionable - support decision-making"""

    async def analyze_document(
        self,
        business_wallet: str,
        document_content: str,
        analysis_type: str = "summary"
    ) -> Dict[str, Any]:
        """
        Analyze a document with AI - ENHANCED

        Args:
            business_wallet: Business wallet address
            document_content: The document text to analyze
            analysis_type: Type of analysis (summary, key_points, sentiment, extraction, action_items)

        Returns:
            Analysis results with structured output
        """
        # Enhanced analysis prompts with structured output
        analysis_configs = {
            "summary": {
                "instruction": "Create an executive summary.",
                "format": """**EXECUTIVE SUMMARY**

**Purpose**: [Document purpose]

**Key Points**:
- [Point 1]
- [Point 2]
- [Point 3]

**Conclusion**: [Main takeaway]

**Business Relevance**: [Why this matters]"""
            },
            "key_points": {
                "instruction": "Extract key points in structured format.",
                "format": """**KEY POINTS**

**Critical (Must Know)**:
1. [Most important]
2. [Second important]

**Supporting Details**:
- [Detail 1]
- [Detail 2]

**Implications**: [What this means]"""
            },
            "sentiment": {
                "instruction": "Analyze sentiment and tone.",
                "format": """**SENTIMENT ANALYSIS**

**Overall Tone**: [Positive/Negative/Neutral/Mixed]

**Positive Indicators**:
- [Positive 1]

**Concerns/Risks**:
- [Concern 1]

**Recommendation**: [How to respond]"""
            },
            "extraction": {
                "instruction": "Extract all data points and entities.",
                "format": """**DATA EXTRACTION**

**Numbers & Metrics**:
| Metric | Value | Context |
|--------|-------|---------|
| [Metric] | [Value] | [Context] |

**Dates**: [Date]: [Event]

**People/Orgs**: [Name]: [Role]

**Key Terms**: [Term]: [Definition]"""
            },
            "action_items": {
                "instruction": "Identify action items and next steps.",
                "format": """**ACTION ITEMS**

**Immediate (This Week)**:
| Action | Owner | Priority |
|--------|-------|----------|
| [Task] | [Who] | [High/Med/Low] |

**Follow-Up Required**:
- [Item]

**Decisions Needed**:
- [Decision point]"""
            }
        }

        config = analysis_configs.get(analysis_type, analysis_configs["summary"])

        system_prompt = f"""You are the **Varity Dashboard AI Assistant** in **Document Analysis Mode**.

## TASK
{config["instruction"]}

## OUTPUT FORMAT
{config["format"]}

## GUIDELINES
1. Be thorough but concise
2. Focus on business-relevant information
3. Use exact format above
4. If info not found, note "Not in document"
5. Prioritize accuracy"""

        user_prompt = f"""Analyze this document:

---
{document_content}
---

Provide analysis in the specified format."""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.3,  # Lower temperature for analysis
                "max_tokens": 2048,
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                analysis = result["choices"][0]["message"]["content"]

                return {
                    "analysis": analysis,
                    "analysis_type": analysis_type,
                    "document_length": len(document_content),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            logger.error(f"Document analysis error: {str(e)}")
            raise

    async def stream_business_ai(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        mode: str = "auto"
    ) -> AsyncGenerator[str, None]:
        """
        Stream AI response with business-specific RAG context

        Args:
            business_wallet: Business wallet address
            user_query: User's question
            integration: Optional filter
            data_type: Optional filter
            mode: Query mode

        Yields:
            Chunks of AI response
        """
        context_parts = []

        # Try to get RAG context unless in general mode
        if mode != "general":
            try:
                rag_results = await self.rag_service.query_business_rag(
                    business_wallet=business_wallet,
                    query=user_query,
                    limit=5,
                    integration=integration,
                    data_type=data_type
                )

                for result in rag_results:
                    data = result.get("data", {})
                    context_parts.append(json.dumps(data, indent=2))
            except Exception as e:
                logger.warning(f"RAG query failed for streaming: {e}")

        # Build system prompt
        if context_parts:
            system_prompt = self._get_rag_system_prompt(context_parts)
        else:
            system_prompt = self._get_general_system_prompt()

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048,
            "stream": True,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.api_url}/chat/completions",
                json=payload,
                headers=headers
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of Together.ai and Qdrant services

        Returns:
            Health status of all components
        """
        health = {
            "together_ai": False,
            "qdrant": False,
            "overall": False,
            "provider": "together"
        }

        # Check Together.ai
        if self.api_key:
            try:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{self.api_url}/models",
                        headers=headers
                    )
                    health["together_ai"] = response.status_code == 200
            except Exception as e:
                logger.warning(f"Together.ai health check failed: {e}")
        else:
            health["together_ai"] = False
            health["together_ai_error"] = "API key not configured"

        # Check Qdrant
        try:
            health["qdrant"] = await self.rag_service.health_check()
        except Exception as e:
            logger.warning(f"Qdrant health check failed: {e}")

        # Overall health
        health["overall"] = health["together_ai"] and health["qdrant"]

        logger.info(f"Health check: {health}")

        return health

    async def get_available_models(self) -> Dict[str, Any]:
        """
        Get list of available Together.ai models

        Returns:
            Dict with models list
        """
        if not self.api_key:
            return {"models": [], "error": "API key not configured"}

        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/models",
                    headers=headers
                )
                if response.status_code == 200:
                    data = response.json()
                    models = []

                    # Filter for chat/instruct models
                    for model in data:
                        model_type = model.get("type", "")
                        if model_type == "chat" or "instruct" in model.get("id", "").lower():
                            models.append({
                                "id": model.get("id"),
                                "name": model.get("display_name", model.get("id")),
                                "description": model.get("description", ""),
                                "context_window": model.get("context_length", 4096),
                                "provider": "together",
                                "default": model.get("id") == self.model
                            })

                    return {"models": models, "default_model": self.model}
                else:
                    return {"models": [], "error": "Failed to fetch models"}
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
            return {"models": [], "error": str(e)}

    async def web_search_query(
        self,
        business_wallet: str,
        user_query: str,
        search_query: Optional[str] = None,
        max_search_results: int = 5
    ) -> Dict[str, Any]:
        """
        Answer a question using web search results.

        This method searches the web for relevant information and uses it
        to generate an informed response. Perfect for questions about
        current events, market data, regulations, or any real-time information.

        Args:
            business_wallet: Business wallet address (for logging/tracking)
            user_query: User's question
            search_query: Optional custom search query (defaults to user_query)
            max_search_results: Maximum search results to use

        Returns:
            Dict with AI answer and web sources
        """
        logger.info(f"Web search query from {business_wallet[:10]}...: '{user_query[:50]}...'")

        # Use provided search query or derive from user query
        actual_search_query = search_query or user_query

        # Perform web search
        search_context = await web_search_service.search_and_summarize(
            actual_search_query,
            max_results=max_search_results
        )

        # Build system prompt with web search context
        system_prompt = f"""You are an AI assistant with access to real-time web search results.
Use the following web search information to answer the user's question accurately and helpfully.

{search_context}

Guidelines:
- Cite specific sources when possible (mention "According to [source]...")
- If the search results don't fully answer the question, say so
- Provide accurate, factual information based on the search results
- Be helpful and comprehensive in your response
- If information conflicts between sources, mention the discrepancy"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.5,  # Lower temperature for factual responses
                "max_tokens": 2048,
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                answer = result["choices"][0]["message"]["content"]

                # Get search results for source attribution
                search_result = await web_search_service.search(actual_search_query, max_search_results)
                sources = [
                    {"title": r["title"], "url": r["url"]}
                    for r in search_result.get("results", [])
                ]

                return {
                    "answer": answer,
                    "mode": "web_search",
                    "search_query": actual_search_query,
                    "sources": sources,
                    "web_search_provider": search_result.get("provider"),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            logger.error(f"Web search query error: {str(e)}")
            raise

    async def query_with_web_search(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        enable_web_search: bool = True,
        max_context_items: int = 5,
        max_search_results: int = 3,
        industry: str = None,
        company_name: str = None
    ) -> Dict[str, Any]:
        """
        Query AI with both RAG context AND web search results.

        This is the most powerful query mode - combines:
        1. Business-specific RAG data (if available)
        2. Real-time web search results (if enabled)

        Args:
            business_wallet: Business wallet address
            user_query: User's question
            integration: Optional filter by integration
            data_type: Optional filter by data type
            enable_web_search: Whether to include web search
            max_context_items: Maximum RAG results
            max_search_results: Maximum web search results

        Returns:
            Dict with answer, sources, and metadata
        """
        logger.info(
            f"Combined query from {business_wallet[:10]}...: "
            f"'{user_query[:50]}...' (web_search={enable_web_search})"
        )

        context_parts = []
        source_cids = []
        web_sources = []

        # 1. Try to get RAG context from business data
        try:
            rag_results = await self.rag_service.query_business_rag(
                business_wallet=business_wallet,
                query=user_query,
                limit=max_context_items,
                integration=integration,
                data_type=data_type
            )

            # Limit context size to prevent token overflow
            MAX_CHARS_PER_ENTRY = 3000
            MAX_TOTAL_CHARS = 30000
            total_chars = 0

            for idx, result in enumerate(rag_results, 1):
                if total_chars >= MAX_TOTAL_CHARS:
                    break

                data = result.get("data", {})
                cid = result.get("cid", "")
                integration_name = result.get("integration", "")
                data_type_name = result.get("data_type", "")

                # Truncate data to reasonable size
                data_str = json.dumps(data, indent=2)
                if len(data_str) > MAX_CHARS_PER_ENTRY:
                    data_str = data_str[:MAX_CHARS_PER_ENTRY] + "\n... [truncated]"

                context_entry = f"""
Business Data Source {idx} (Integration: {integration_name}, Type: {data_type_name}):
{data_str}
"""
                context_parts.append(context_entry.strip())
                source_cids.append(cid)
                total_chars += len(context_entry)

        except Exception as e:
            logger.warning(f"RAG query failed: {e}")

        # 2. Get web search results if enabled
        web_search_context = ""
        if enable_web_search and web_search_service.is_available():
            try:
                web_search_context = await web_search_service.search_and_summarize(
                    user_query,
                    max_results=max_search_results
                )
                search_result = await web_search_service.search(user_query, max_search_results)
                web_sources = [
                    {"title": r["title"], "url": r["url"]}
                    for r in search_result.get("results", [])
                ]
            except Exception as e:
                logger.warning(f"Web search failed: {e}")

        # 3. Build comprehensive system prompt with industry context
        industry_context = self._get_industry_context(industry, company_name)
        system_prompt = self._get_combined_system_prompt(
            context_parts,
            web_search_context
        ) + industry_context

        # 4. Query Together.ai
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 3072,
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                answer = result["choices"][0]["message"]["content"]

                # Determine mode based on what context was used
                mode = "general"
                if context_parts and web_search_context:
                    mode = "combined"
                elif context_parts:
                    mode = "rag"
                elif web_search_context:
                    mode = "web_search"

                return {
                    "answer": answer,
                    "mode": mode,
                    "rag_sources": source_cids,
                    "web_sources": web_sources,
                    "context_used": bool(context_parts),
                    "web_search_used": bool(web_search_context),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            logger.error(f"Combined query error: {str(e)}")
            raise

    def _get_combined_system_prompt(
        self,
        rag_context_parts: List[str],
        web_search_context: str
    ) -> str:
        """Build system prompt combining RAG and web search context - ENHANCED"""

        has_business_data = bool(rag_context_parts)
        has_web_search = bool(web_search_context)

        prompt_parts = [
            "You are the **Varity Dashboard AI Assistant** — a strategic business advisor providing comprehensive intelligence by combining your business data with real-time market research.",
            "",
            "## YOUR ROLE",
            "You are NOT a generic chatbot. You are a data-driven strategic advisor who:",
            "- Combines internal business data with external market intelligence",
            "- Provides specific, actionable recommendations (not vague advice)",
            "- Prioritizes recommendations by impact (CRITICAL > IMPORTANT > RECOMMENDED)",
            "- Uses industry benchmarks and specific metrics",
            "- Cites sources for web research findings",
            ""
        ]

        # Add business data if available
        if has_business_data:
            rag_context = "\n\n".join(rag_context_parts)
            prompt_parts.extend([
                "## YOUR BUSINESS DATA (from Filecoin/IPFS)",
                rag_context,
                ""
            ])

        # Add web search if available
        if has_web_search:
            prompt_parts.extend([
                "## WEB RESEARCH RESULTS (Real-time Internet Data)",
                web_search_context,
                ""
            ])

        # Add mode-specific instructions
        prompt_parts.append("## RESPONSE FORMAT")

        if has_business_data and has_web_search:
            prompt_parts.extend([
                "",
                "**Combined Intelligence Mode** — You have BOTH business data AND web research.",
                "",
                "Structure your response as:",
                "",
                "**Executive Summary**",
                "[2-3 sentences combining internal data with market context]",
                "",
                "**Your Business Data Shows**",
                "- [Specific insight from connected integrations with numbers]",
                "- [Trend or pattern from your data]",
                "",
                "**Market Intelligence**",
                "- [Relevant finding from web research with source]",
                "- [Industry benchmark or trend]",
                "",
                "**Recommendations**",
                "- CRITICAL: [Highest impact action based on combined analysis]",
                "- IMPORTANT: [Secondary priority action]",
                "- RECOMMENDED: [Additional optimization opportunity]",
                "",
                "**Next Steps**",
                "[Clear action items with expected outcomes]"
            ])
        elif has_business_data:
            prompt_parts.extend([
                "",
                "**Business Data Mode** — Analyze their actual data:",
                "- Reference specific numbers, dates, names from the data",
                "- Prioritize recommendations: CRITICAL > IMPORTANT > RECOMMENDED",
                "- Include specific impact estimates (e.g., '15-20% improvement')",
                "- End with actionable Next Steps"
            ])
        elif has_web_search:
            prompt_parts.extend([
                "",
                "**Web Research Mode** — Providing market intelligence:",
                "- Cite sources for all claims (e.g., 'According to [Source]...')",
                "- Include industry benchmarks and statistics",
                "- Prioritize recommendations: CRITICAL > IMPORTANT > RECOMMENDED",
                "- End with Next Steps including suggestion to connect integrations",
                "",
                "**Pro Tip**: Connect your business software from the **Integrations** page to get personalized insights combining your data with this market research."
            ])
        else:
            prompt_parts.extend([
                "",
                "**General Mode** — No data sources available:",
                "- Provide helpful business guidance based on industry best practices",
                "- Prioritize recommendations: CRITICAL > IMPORTANT > RECOMMENDED",
                "- Encourage connecting integrations for personalized insights",
                "",
                "**Next Step**: Go to **Integrations** to connect QuickBooks, Salesforce, Shopify, etc. for AI-powered analysis of your actual business data."
            ])

        return "\n".join(prompt_parts)
