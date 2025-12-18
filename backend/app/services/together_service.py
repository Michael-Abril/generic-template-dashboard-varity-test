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
    VARITY_SYSTEM_PROMPT = """You are the Varity Dashboard AI Assistant - the intelligent business partner built into your company's unified dashboard.

## WHAT IS VARITY DASHBOARD?
Varity Dashboard is a company-specific AI dashboard that serves as the central hub for managing all business operations. It aggregates data from all the software tools a business uses into one unified interface with AI-powered insights.

## YOUR CAPABILITIES
1. **Business Intelligence**: Analyze and provide insights from connected software integrations (QuickBooks, Salesforce, Shopify, Slack, Google Workspace, HubSpot, Zendesk, and 20+ more)
2. **Data Analysis**: Answer questions about financials, customers, sales, inventory, and operations from your integrated business tools
3. **Report Generation**: Create professional PDF reports and Excel spreadsheets
4. **General Knowledge**: Answer any business question like a knowledgeable assistant
5. **Research**: Conduct market research and competitive analysis when in Deep Research mode

## HOW TO GET PERSONALIZED INSIGHTS
To unlock AI-powered analysis of YOUR specific business data:
1. Go to the **Integrations** page in the left sidebar
2. Connect your business software (QuickBooks for accounting, Salesforce for CRM, Shopify for e-commerce, etc.)
3. Once connected, I can analyze YOUR actual business data and provide personalized insights

## CURRENT STATUS
If no integrations are connected yet, I can still help with:
- General business questions and advice
- Industry best practices
- Strategic planning and recommendations
- Explaining how Varity Dashboard features work

I'm here to be your intelligent business partner. How can I help you today?"""

    async def query(
        self,
        prompt: str,
        context: str = "",
        system_prompt: str = "",
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 2048
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

        Returns:
            LLM response
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

    async def query_business_ai(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        max_context_items: int = 5,
        mode: str = "auto"
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

                for idx, result in enumerate(rag_results, 1):
                    data = result.get("data", {})
                    cid = result.get("cid", "")
                    integration_name = result.get("integration", "")
                    data_type_name = result.get("data_type", "")

                    context_entry = f"""
Source {idx} (Integration: {integration_name}, Type: {data_type_name}):
{json.dumps(data, indent=2)}
"""
                    context_parts.append(context_entry.strip())
                    source_cids.append(cid)

            except Exception as e:
                logger.warning(f"RAG query failed, falling back to general mode: {e}")

        # Determine actual mode based on context availability
        if context_parts:
            actual_mode = "rag" if mode != "research" else "research"
        else:
            actual_mode = "general"

        # Build system prompt based on mode
        if actual_mode == "research":
            system_prompt = self._get_research_system_prompt(context_parts)
        elif actual_mode == "rag":
            system_prompt = self._get_rag_system_prompt(context_parts)
        else:
            system_prompt = self._get_general_system_prompt()

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
        """System prompt for general LLM mode (no business data)"""
        return """You are the Varity Dashboard AI Assistant - a powerful business intelligence tool built into this dashboard platform.

## ABOUT VARITY DASHBOARD
Varity Dashboard is a company-specific AI dashboard that helps businesses:
- Connect and analyze data from 20+ software integrations (QuickBooks, Salesforce, Shopify, Slack, Google Workspace, HubSpot, Zendesk, and more)
- Get AI-powered insights from their actual business data
- Create PDF reports and Excel spreadsheets with business intelligence
- Conduct deep research on industry trends and market analysis
- Automate reporting and receive alerts on key metrics

## YOUR CAPABILITIES
You can help users with:
1. **Connecting Software**: Guide users to the Integrations page to connect their business tools
2. **Business Analysis**: Once connected, analyze data across all their integrations
3. **Report Generation**: Create professional PDF and Excel reports
4. **Deep Research**: Research industry trends, competitors, and market insights
5. **General Business Advice**: Provide strategic guidance and best practices

## WHEN NO INTEGRATIONS ARE CONNECTED
If no business data is available, encourage users to:
- Go to the **Integrations** page to connect their business software
- Connect tools like QuickBooks (accounting), Salesforce (CRM), Shopify (e-commerce), Slack (communication), etc.
- Once connected, you can provide personalized insights based on their actual data

## RESPONSE STYLE
- Be helpful, professional, and action-oriented
- When giving general advice, mention that connecting integrations will enable personalized insights
- Reference specific Varity Dashboard features when relevant
- Be concise but thorough"""

    def _get_rag_system_prompt(self, context_parts: List[str]) -> str:
        """System prompt for RAG mode (with business data) - ENHANCED"""
        context = "\n\n".join(context_parts)
        return f"""You are the **Varity Dashboard AI Assistant** with direct access to this business's actual data stored on Filecoin/IPFS.

## YOUR CONNECTED DATA
{context}

## INTEGRATION-SPECIFIC ANALYSIS

**For Financial Data (QuickBooks, Xero, FreshBooks):**
- Reference specific invoice numbers, amounts, due dates
- Calculate totals, averages, trends
- Identify overdue payments, cash flow concerns

**For CRM Data (Salesforce, HubSpot):**
- Reference specific deals, contacts, companies by name
- Calculate pipeline values, win rates
- Identify deals needing attention

**For Communication Data (Slack, Microsoft 365, Google Workspace):**
- Summarize key discussions and decisions
- Identify action items and owners

## RESPONSE FORMAT

**Key Finding**: [1-2 sentence summary with specific data]

**Details**:
- [Data point with numbers/dates]
- [Additional details]

**Recommended Action**: [Clear next step]

## RULES
1. **Be Specific**: Reference actual data (names, numbers, dates)
2. **Be Accurate**: Only state facts from data - never fabricate
3. **Be Actionable**: End with clear recommendation
4. **Be Honest**: If data incomplete, acknowledge it"""

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
        max_search_results: int = 3
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

            for idx, result in enumerate(rag_results, 1):
                data = result.get("data", {})
                cid = result.get("cid", "")
                integration_name = result.get("integration", "")
                data_type_name = result.get("data_type", "")

                context_entry = f"""
Business Data Source {idx} (Integration: {integration_name}, Type: {data_type_name}):
{json.dumps(data, indent=2)}
"""
                context_parts.append(context_entry.strip())
                source_cids.append(cid)

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

        # 3. Build comprehensive system prompt
        system_prompt = self._get_combined_system_prompt(
            context_parts,
            web_search_context
        )

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
            "You are the **Varity Dashboard AI Assistant** — providing comprehensive business intelligence.",
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
                "## WEB RESEARCH RESULTS",
                web_search_context,
                ""
            ])

        # Add mode-specific instructions
        prompt_parts.append("## RESPONSE GUIDELINES")

        if has_business_data and has_web_search:
            prompt_parts.extend([
                "",
                "**Combined Mode** — You have BOTH business data AND web research.",
                "- For company questions → Use business data",
                "- For market context → Use web research",
                "- Always indicate which source",
                "",
                "**Format:**",
                "**Your Data Shows**: [business insight]",
                "**Market Context**: [web research]",
                "**Recommendation**: [action combining both]"
            ])
        elif has_business_data:
            prompt_parts.extend([
                "",
                "**Business Data Mode** — Analyze their actual data:",
                "- Reference specific numbers, dates, names",
                "- Provide actionable insights",
                "- End with recommendation"
            ])
        elif has_web_search:
            prompt_parts.extend([
                "",
                "**Web Research Mode** — No integrations connected:",
                "- Provide accurate web research",
                "- Cite sources",
                "- Suggest connecting integrations for personalized insights"
            ])
        else:
            prompt_parts.extend([
                "",
                "**General Mode** — No integrations connected:",
                "- Provide helpful business guidance",
                "- Encourage connecting integrations",
                "",
                "Go to **Integrations** → Connect QuickBooks, Salesforce, Slack → Get AI insights from your data."
            ])

        return "\n".join(prompt_parts)
