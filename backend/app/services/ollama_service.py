import os
import json
import httpx
import logging
from typing import Dict, Any, Optional, List

from .rag_service import BusinessRAGService

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Local Ollama LLM service for AI queries
    100% local - no cloud LLM providers
    """

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://generic-template-ollama:11434")
        self.model = os.getenv("OLLAMA_MODEL", "mistral")

    async def query(
        self,
        prompt: str,
        context: str = "",
        system_prompt: str = "You are a helpful AI assistant analyzing business data.",
        stream: bool = False
    ) -> str:
        """
        Query Ollama LLM with optional context

        Args:
            prompt: User's question
            context: RAG context from Filecoin data
            system_prompt: System instructions
            stream: Enable streaming response

        Returns:
            LLM response
        """
        full_prompt = f"{system_prompt}\n\n"

        if context:
            full_prompt += f"Context:\n{context}\n\n"

        full_prompt += f"Question: {prompt}"

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": stream
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")

    async def health_check(self) -> bool:
        """Check if Ollama is running"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False

    async def list_models(self) -> list:
        """List available models"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            return response.json().get("models", [])


class OllamaBusinessService:
    """
    Multi-tenant Ollama service with business-specific RAG integration

    Architecture:
    - Each business query is scoped to their own RAG collection
    - Business A's data never appears in Business B's AI responses
    - Shared LLM (Ollama) with isolated knowledge base per business
    """

    def __init__(self):
        """Initialize Ollama client and RAG service"""
        self.ollama_url = os.getenv("OLLAMA_URL", "http://generic-template-ollama:11434")
        self.model = os.getenv("OLLAMA_MODEL", "mistral")
        self.rag_service = BusinessRAGService()

        logger.info(
            f"OllamaBusinessService initialized: "
            f"URL={self.ollama_url}, model={self.model}"
        )

    async def query_business_ai(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        max_context_items: int = 5
    ) -> Dict[str, Any]:
        """
        Query AI with business-specific RAG context

        CRITICAL: This method ensures Business A's query only accesses
        Business A's data, never Business B's or C's data

        Args:
            business_wallet: Business wallet address (used for data isolation)
            user_query: User's question
            integration: Optional filter by integration
            data_type: Optional filter by data type
            max_context_items: Maximum RAG results to include

        Returns:
            {
                "answer": "AI-generated response",
                "sources": ["cid1", "cid2", ...],
                "context_used": True/False
            }
        """
        logger.info(
            f"AI query from business {business_wallet[:10]}...: "
            f"'{user_query[:100]}...'"
        )

        # Step 1: Query business-specific RAG
        # This ONLY accesses this business's Qdrant collection
        rag_results = await self.rag_service.query_business_rag(
            business_wallet=business_wallet,
            query=user_query,
            limit=max_context_items,
            integration=integration,
            data_type=data_type
        )

        # Step 2: Build context from RAG results
        context_parts = []
        source_cids = []

        for idx, result in enumerate(rag_results, 1):
            # Extract data and format for LLM
            data = result.get("data", {})
            cid = result.get("cid", "")
            integration_name = result.get("integration", "")
            data_type_name = result.get("data_type", "")

            # Format context entry
            context_entry = f"""
Source {idx} (Integration: {integration_name}, Type: {data_type_name}):
{json.dumps(data, indent=2)}
"""
            context_parts.append(context_entry.strip())
            source_cids.append(cid)

        # Step 3: Build LLM prompt with business context
        if context_parts:
            context = "\n\n".join(context_parts)
            system_prompt = f"""You are an AI assistant for a specific business.
Answer questions based ONLY on this business's data provided below.
Do NOT make up information. If the answer is not in the provided data, say so.

BUSINESS DATA:
{context}
"""
        else:
            system_prompt = """You are an AI assistant for a business.
No relevant business data was found for this query.
Provide a general helpful response and suggest what data might be needed.
"""

        # Step 4: Query Akash-hosted Ollama LLM
        prompt = f"{system_prompt}\n\nUSER QUESTION: {user_query}\n\nASSISTANT:"

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                response.raise_for_status()

                result = response.json()
                answer = result.get("response", "")

                logger.info(
                    f"AI response generated for {business_wallet[:10]}...: "
                    f"{len(answer)} chars, {len(source_cids)} sources"
                )

                return {
                    "answer": answer,
                    "sources": source_cids,
                    "context_used": len(context_parts) > 0,
                    "integration": integration,
                    "data_type": data_type
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama API error: {e.response.text}")
            raise Exception(f"AI query failed: {e.response.text}")

        except Exception as e:
            logger.error(f"AI query error: {str(e)}")
            raise

    async def stream_business_ai(
        self,
        business_wallet: str,
        user_query: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None
    ):
        """
        Stream AI response with business-specific RAG context

        Args:
            business_wallet: Business wallet address
            user_query: User's question
            integration: Optional filter
            data_type: Optional filter

        Yields:
            Chunks of AI response
        """
        # Query RAG (same as non-streaming)
        rag_results = await self.rag_service.query_business_rag(
            business_wallet=business_wallet,
            query=user_query,
            limit=5,
            integration=integration,
            data_type=data_type
        )

        # Build context
        context_parts = []
        for result in rag_results:
            data = result.get("data", {})
            context_parts.append(json.dumps(data, indent=2))

        context = "\n\n".join(context_parts) if context_parts else ""

        # Build prompt
        if context:
            system_prompt = f"""You are an AI assistant for a specific business.
Answer based ONLY on this business's data:

{context}
"""
        else:
            system_prompt = "You are a helpful business AI assistant."

        prompt = f"{system_prompt}\n\nUSER: {user_query}\n\nASSISTANT:"

        # Stream response
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]

    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of Ollama and Qdrant services

        Returns:
            Health status of all components
        """
        health = {
            "ollama": False,
            "qdrant": False,
            "overall": False
        }

        # Check Ollama
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                health["ollama"] = response.status_code == 200
        except:
            pass

        # Check Qdrant
        try:
            health["qdrant"] = await self.rag_service.health_check()
        except:
            pass

        # Overall health
        health["overall"] = health["ollama"] and health["qdrant"]

        logger.info(f"Health check: {health}")

        return health

    async def get_available_models(self) -> Dict[str, Any]:
        """
        Get list of available Ollama models

        Returns:
            Dict with models list
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = []
                    for model in data.get("models", []):
                        models.append({
                            "id": model.get("name", "unknown"),
                            "name": model.get("name", "Unknown Model"),
                            "description": f"Size: {model.get('size', 'N/A')}",
                            "provider": "ollama",
                            "context_window": 2048,
                            "default": model.get("name") == self.model
                        })
                    return {"models": models, "default_model": self.model}
                else:
                    return {"models": [], "error": "Failed to fetch models"}
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
            return {"models": [], "error": str(e)}
