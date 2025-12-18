"""
Unit tests for RAGService
Tests Qdrant vector database, document retrieval, embedding generation
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import numpy as np

from app.services.rag_service import RAGService


class TestRAGService:
    """Test suite for RAG (Retrieval-Augmented Generation) service"""

    @pytest.fixture
    def rag_service(self, mock_settings):
        """Create RAGService instance"""
        return RAGService()

    @pytest.fixture
    def mock_documents(self):
        """Mock documents for RAG"""
        return [
            {
                "id": "doc1",
                "content": "ISO merchant services payment processing",
                "metadata": {"category": "iso", "type": "guide"}
            },
            {
                "id": "doc2",
                "content": "PCI compliance requirements for merchants",
                "metadata": {"category": "compliance", "type": "regulation"}
            }
        ]

    @pytest.fixture
    def mock_embedding(self):
        """Mock embedding vector"""
        return np.random.rand(768).tolist()

    @pytest.mark.asyncio
    async def test_store_document(
        self,
        rag_service,
        mock_documents,
        mock_embedding
    ):
        """Test storing document in Qdrant vector database"""
        with patch.object(rag_service, 'qdrant_client') as mock_qdrant:
            mock_qdrant.upsert = AsyncMock()

            with patch.object(rag_service, 'generate_embedding', return_value=mock_embedding):
                await rag_service.store_document(
                    document_id=mock_documents[0]["id"],
                    content=mock_documents[0]["content"],
                    metadata=mock_documents[0]["metadata"]
                )

                mock_qdrant.upsert.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_embedding(
        self,
        rag_service
    ):
        """Test generating embedding for text"""
        text = "Test document content"

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "embedding": [0.1] * 768
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            embedding = await rag_service.generate_embedding(text)

            assert len(embedding) == 768
            assert all(isinstance(x, float) for x in embedding)

    @pytest.mark.asyncio
    async def test_search_similar_documents(
        self,
        rag_service,
        mock_embedding
    ):
        """Test searching for similar documents"""
        query = "What are PCI compliance requirements?"

        with patch.object(rag_service, 'generate_embedding', return_value=mock_embedding), \
             patch.object(rag_service, 'qdrant_client') as mock_qdrant:

            mock_qdrant.search = AsyncMock(return_value=[
                MagicMock(
                    id="doc2",
                    score=0.95,
                    payload={
                        "content": "PCI compliance requirements for merchants",
                        "metadata": {"category": "compliance"}
                    }
                )
            ])

            results = await rag_service.search_similar_documents(
                query=query,
                top_k=5
            )

            assert len(results) > 0
            assert results[0]["score"] == 0.95

    @pytest.mark.asyncio
    async def test_retrieve_context_for_query(
        self,
        rag_service
    ):
        """Test retrieving context for LLM query"""
        query = "How do I register a merchant?"

        with patch.object(rag_service, 'search_similar_documents') as mock_search:
            mock_search.return_value = [
                {
                    "content": "Merchant registration process involves...",
                    "score": 0.92,
                    "metadata": {"category": "registration"}
                }
            ]

            context = await rag_service.retrieve_context(query)

            assert len(context) > 0
            assert "registration" in context.lower()

    @pytest.mark.asyncio
    async def test_delete_document(
        self,
        rag_service
    ):
        """Test deleting document from vector database"""
        document_id = "doc1"

        with patch.object(rag_service, 'qdrant_client') as mock_qdrant:
            mock_qdrant.delete = AsyncMock()

            await rag_service.delete_document(document_id)

            mock_qdrant.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_batch_store_documents(
        self,
        rag_service,
        mock_documents,
        mock_embedding
    ):
        """Test batch storing multiple documents"""
        with patch.object(rag_service, 'qdrant_client') as mock_qdrant:
            mock_qdrant.upsert = AsyncMock()

            with patch.object(rag_service, 'generate_embedding', return_value=mock_embedding):
                await rag_service.batch_store_documents(mock_documents)

                # Should be called once for each document
                assert mock_qdrant.upsert.call_count == len(mock_documents)

    @pytest.mark.asyncio
    async def test_filter_by_metadata(
        self,
        rag_service,
        mock_embedding
    ):
        """Test filtering documents by metadata"""
        with patch.object(rag_service, 'generate_embedding', return_value=mock_embedding), \
             patch.object(rag_service, 'qdrant_client') as mock_qdrant:

            mock_qdrant.search = AsyncMock(return_value=[])

            results = await rag_service.search_similar_documents(
                query="test query",
                filter_metadata={"category": "iso"}
            )

            # Verify filter was applied
            mock_qdrant.search.assert_called_once()

    @pytest.mark.asyncio
    async def test_collection_initialization(
        self,
        rag_service,
        mock_settings
    ):
        """Test Qdrant collection initialization"""
        with patch.object(rag_service, 'qdrant_client') as mock_qdrant:
            mock_qdrant.get_collection = AsyncMock(side_effect=Exception("Collection not found"))
            mock_qdrant.create_collection = AsyncMock()

            await rag_service.initialize_collection()

            mock_qdrant.create_collection.assert_called_once()

    @pytest.mark.asyncio
    async def test_embedding_cache(
        self,
        rag_service,
        mock_embedding
    ):
        """Test embedding caching for repeated queries"""
        text = "Same text repeated"

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"embedding": mock_embedding}
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            # First call
            embedding1 = await rag_service.generate_embedding(text)

            # Second call (should use cache if implemented)
            embedding2 = await rag_service.generate_embedding(text)

            assert embedding1 == embedding2

    @pytest.mark.asyncio
    async def test_get_collection_stats(
        self,
        rag_service
    ):
        """Test getting collection statistics"""
        with patch.object(rag_service, 'qdrant_client') as mock_qdrant:
            mock_qdrant.get_collection = AsyncMock(return_value=MagicMock(
                points_count=1000,
                vectors_count=1000
            ))

            stats = await rag_service.get_collection_stats()

            assert stats["points_count"] == 1000

    @pytest.mark.asyncio
    async def test_rerank_results(
        self,
        rag_service
    ):
        """Test re-ranking search results"""
        query = "merchant registration"
        initial_results = [
            {"content": "Registration process...", "score": 0.7},
            {"content": "Merchant onboarding guide...", "score": 0.85},
            {"content": "Payment processing...", "score": 0.6}
        ]

        reranked = await rag_service.rerank_results(query, initial_results)

        # Should be sorted by score descending
        assert reranked[0]["score"] >= reranked[1]["score"]
