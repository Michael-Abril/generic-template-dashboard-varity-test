"""
Together.ai LLM Service for Varity Generic Template Dashboard

Together.ai provides an OpenAI-compatible API for open-source models.
This service is privacy-focused - uses open-source models like Llama 3.3 70B
without data retention by cloud providers.

Features:
- General LLM mode (works without integrations)
- Document analysis capabilities
- Deep research mode
- Multi-tenant RAG integration when integrations are connected
- Streaming responses for real-time chat
"""

import os
import json
import httpx
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime

from .rag_service import BusinessRAGService

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

    async def query(
        self,
        prompt: str,
        context: str = "",
        system_prompt: str = "You are a helpful AI assistant for business intelligence.",
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
        messages = [{"role": "system", "content": system_prompt}]

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
        system_prompt: str = "You are a helpful AI assistant for business intelligence.",
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
        messages = [{"role": "system", "content": system_prompt}]

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
        return """You are an intelligent AI assistant for business professionals.

You are helpful, accurate, and professional. You can assist with:
- General business questions and advice
- Writing and editing documents
- Analysis and problem-solving
- Research and information synthesis
- Planning and strategy discussions
- Technical questions and explanations

When you don't have specific business data to reference, provide general best practices
and helpful guidance. Be clear when you're giving general advice vs. specific information.

Always be professional, concise, and actionable in your responses."""

    def _get_rag_system_prompt(self, context_parts: List[str]) -> str:
        """System prompt for RAG mode (with business data)"""
        context = "\n\n".join(context_parts)
        return f"""You are an AI assistant for a specific business, with access to their actual data.

Answer questions based on the business data provided below. Be specific and reference
the actual data when possible. If the answer is not in the provided data, say so clearly
and offer to help with general guidance instead.

BUSINESS DATA:
{context}

Guidelines:
- Reference specific numbers, dates, and details from the data
- Be accurate and don't make up information
- If data seems incomplete, mention what additional information might be helpful
- Provide actionable insights when relevant"""

    def _get_research_system_prompt(self, context_parts: List[str]) -> str:
        """System prompt for deep research mode"""
        context = "\n\n".join(context_parts) if context_parts else "No specific business data available."
        return f"""You are an expert business analyst conducting deep research.

Your task is to provide comprehensive, well-researched analysis. Consider multiple angles,
identify patterns, and provide actionable recommendations.

AVAILABLE BUSINESS DATA:
{context}

Research Guidelines:
1. ANALYZE the data thoroughly - look for patterns, trends, and anomalies
2. SYNTHESIZE information from multiple sources when available
3. IDENTIFY key insights and their business implications
4. RECOMMEND specific actions based on your analysis
5. ACKNOWLEDGE limitations and suggest additional data that would help
6. STRUCTURE your response clearly with sections when appropriate

Provide a thorough, executive-level analysis that would be valuable for decision-making."""

    async def analyze_document(
        self,
        business_wallet: str,
        document_content: str,
        analysis_type: str = "summary"
    ) -> Dict[str, Any]:
        """
        Analyze a document with AI

        Args:
            business_wallet: Business wallet address
            document_content: The document text to analyze
            analysis_type: Type of analysis (summary, key_points, sentiment, extraction)

        Returns:
            Analysis results
        """
        analysis_prompts = {
            "summary": "Provide a concise executive summary of this document, highlighting the key points and conclusions.",
            "key_points": "Extract and list the key points from this document in bullet format.",
            "sentiment": "Analyze the sentiment and tone of this document. Identify any concerns, positive aspects, or neutral observations.",
            "extraction": "Extract all important data points, numbers, dates, names, and entities mentioned in this document.",
            "action_items": "Identify any action items, next steps, or recommendations mentioned in this document."
        }

        prompt_instruction = analysis_prompts.get(analysis_type, analysis_prompts["summary"])

        system_prompt = f"""You are a document analysis expert. {prompt_instruction}

Be thorough but concise. Focus on information that would be valuable for business decision-making."""

        user_prompt = f"""Please analyze the following document:

---
{document_content}
---

{prompt_instruction}"""

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
