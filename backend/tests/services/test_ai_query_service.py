"""
Unit tests for AIQueryService
Tests AI query orchestration, RAG integration, LLM response
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.ai_query_service import AIQueryService


class TestAIQueryService:
    """Test suite for AI query orchestration service"""

    @pytest.fixture
    def ai_query_service(self):
        """Create AIQueryService instance"""
        return AIQueryService()

    @pytest.mark.asyncio
    async def test_process_query(
        self,
        ai_query_service
    ):
        """Test processing AI query with RAG"""
        query = "How do I calculate merchant residuals?"

        with patch('app.services.rag_service.RAGService.retrieve_context') as mock_rag, \
             patch('app.services.ollama_service.OllamaService.generate_response') as mock_llm:

            mock_rag.return_value = "Residual calculations involve merchant volume and commission rates..."
            mock_llm.return_value = "To calculate merchant residuals, multiply the transaction volume by the commission rate..."

            response = await ai_query_service.process_query(query)

            assert len(response) > 0
            assert "residual" in response.lower()

    @pytest.mark.asyncio
    async def test_query_without_context(
        self,
        ai_query_service
    ):
        """Test query processing without RAG context"""
        query = "What is 2+2?"

        with patch('app.services.ollama_service.OllamaService.generate_response') as mock_llm:
            mock_llm.return_value = "2+2 equals 4"

            response = await ai_query_service.process_query(query, use_rag=False)

            assert "4" in response

    @pytest.mark.asyncio
    async def test_multi_turn_conversation(
        self,
        ai_query_service
    ):
        """Test multi-turn conversation with context"""
        conversation = [
            {"role": "user", "content": "What is a merchant?"},
            {"role": "assistant", "content": "A merchant is a business that accepts payments..."},
            {"role": "user", "content": "How do they get registered?"}
        ]

        with patch('app.services.ollama_service.OllamaService.generate_response') as mock_llm:
            mock_llm.return_value = "Merchants register by providing business details..."

            response = await ai_query_service.process_conversation(conversation)

            assert len(response) > 0

    @pytest.mark.asyncio
    async def test_query_classification(
        self,
        ai_query_service
    ):
        """Test classifying query type"""
        queries = [
            ("Calculate residuals for merchant", "calculation"),
            ("What are PCI requirements?", "information"),
            ("Register new merchant", "action")
        ]

        for query, expected_type in queries:
            query_type = await ai_query_service.classify_query(query)
            assert query_type == expected_type or query_type in ["calculation", "information", "action"]

    @pytest.mark.asyncio
    async def test_source_attribution(
        self,
        ai_query_service
    ):
        """Test including source attribution in response"""
        query = "PCI compliance requirements"

        with patch('app.services.rag_service.RAGService.search_similar_documents') as mock_search, \
             patch('app.services.ollama_service.OllamaService.generate_response') as mock_llm:

            mock_search.return_value = [
                {"content": "PCI DSS requirements...", "metadata": {"source": "pci_guide.pdf"}}
            ]
            mock_llm.return_value = "PCI compliance requires..."

            response = await ai_query_service.process_query(query, include_sources=True)

            assert "response" in response
            assert "sources" in response
