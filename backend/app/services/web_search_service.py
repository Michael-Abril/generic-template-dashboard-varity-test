"""
Web Search Service for AI Assistant Internet Access

This service provides web search capabilities for the AI Assistant,
allowing it to access real-time information from the internet.

Supports two search providers:
1. Tavily - LLM-optimized search results (recommended)
2. Serper - Google Search results

Privacy-focused: Search queries are not logged or stored.
"""

import os
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSearchService:
    """
    Web search service for AI Assistant internet access.

    Supports multiple search providers with automatic fallback:
    1. Tavily (preferred) - LLM-optimized results
    2. Serper - Google Search results
    """

    def __init__(self):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY", "")
        self.serper_api_key = os.getenv("SERPER_API_KEY", "")

        # Determine which provider to use
        if self.tavily_api_key:
            self.provider = "tavily"
        elif self.serper_api_key:
            self.provider = "serper"
        else:
            self.provider = None

        logger.info(f"WebSearchService initialized: provider={self.provider}")

    def is_available(self) -> bool:
        """Check if web search is available"""
        return self.provider is not None

    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic"
    ) -> Dict[str, Any]:
        """
        Search the web for information.

        Args:
            query: Search query
            max_results: Maximum number of results to return
            search_depth: "basic" or "advanced" (Tavily only)

        Returns:
            Dict with search results and metadata
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "No web search provider configured",
                "results": [],
                "provider": None
            }

        try:
            if self.provider == "tavily":
                return await self._search_tavily(query, max_results, search_depth)
            elif self.provider == "serper":
                return await self._search_serper(query, max_results)
            else:
                return {
                    "success": False,
                    "error": "Unknown search provider",
                    "results": [],
                    "provider": None
                }
        except Exception as e:
            logger.error(f"Web search error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "provider": self.provider
            }

    async def _search_tavily(
        self,
        query: str,
        max_results: int,
        search_depth: str
    ) -> Dict[str, Any]:
        """
        Search using Tavily API (LLM-optimized results)

        Tavily provides search results specifically formatted for LLMs,
        with relevant content extracted and summarized.
        """
        url = "https://api.tavily.com/search"

        payload = {
            "api_key": self.tavily_api_key,
            "query": query,
            "search_depth": search_depth,
            "max_results": max_results,
            "include_answer": True,
            "include_raw_content": False,
            "include_images": False
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            # Extract results
            results = []
            for item in data.get("results", []):
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "content": item.get("content", ""),
                    "score": item.get("score", 0)
                })

            return {
                "success": True,
                "query": query,
                "provider": "tavily",
                "answer": data.get("answer", ""),  # Tavily provides a summary answer
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }

    async def _search_serper(
        self,
        query: str,
        max_results: int
    ) -> Dict[str, Any]:
        """
        Search using Serper API (Google Search results)

        Serper provides Google Search results via API.
        """
        url = "https://google.serper.dev/search"

        payload = {
            "q": query,
            "num": max_results
        }

        headers = {
            "X-API-KEY": self.serper_api_key,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            # Extract organic results
            results = []
            for item in data.get("organic", []):
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "content": item.get("snippet", ""),
                    "score": item.get("position", 0)
                })

            # Build answer from knowledge graph or answer box if available
            answer = ""
            if "answerBox" in data:
                answer = data["answerBox"].get("answer", "") or data["answerBox"].get("snippet", "")
            elif "knowledgeGraph" in data:
                kg = data["knowledgeGraph"]
                answer = kg.get("description", "")

            return {
                "success": True,
                "query": query,
                "provider": "serper",
                "answer": answer,
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }

    async def search_and_summarize(
        self,
        query: str,
        max_results: int = 5
    ) -> str:
        """
        Search the web and return a formatted summary for LLM context.

        This method returns a text string ready to be injected into
        the LLM prompt as context.

        Args:
            query: Search query
            max_results: Maximum results to include

        Returns:
            Formatted string with search results
        """
        search_result = await self.search(query, max_results)

        if not search_result["success"]:
            return f"Web search failed: {search_result.get('error', 'Unknown error')}"

        # Build context string
        parts = [
            f"Web Search Results for: \"{query}\"",
            f"Search performed at: {search_result['timestamp']}",
            ""
        ]

        # Add direct answer if available
        if search_result.get("answer"):
            parts.append(f"Quick Answer: {search_result['answer']}")
            parts.append("")

        # Add individual results
        for i, result in enumerate(search_result["results"], 1):
            parts.append(f"Source {i}: {result['title']}")
            parts.append(f"URL: {result['url']}")
            parts.append(f"Content: {result['content']}")
            parts.append("")

        return "\n".join(parts)

    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of web search service

        Returns:
            Health status dictionary
        """
        health = {
            "available": self.is_available(),
            "provider": self.provider,
            "tavily_configured": bool(self.tavily_api_key),
            "serper_configured": bool(self.serper_api_key)
        }

        # Test actual search if available
        if self.is_available():
            try:
                test_result = await self.search("test query", max_results=1)
                health["operational"] = test_result["success"]
            except Exception as e:
                health["operational"] = False
                health["error"] = str(e)
        else:
            health["operational"] = False
            health["error"] = "No search provider configured"

        return health


# Global instance
web_search_service = WebSearchService()
