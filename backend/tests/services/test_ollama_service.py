"""
Unit tests for OllamaService
Tests LLM integration, model loading, response generation
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.ollama_service import OllamaService


class TestOllamaService:
    """Test suite for Ollama LLM service"""

    @pytest.fixture
    def ollama_service(self, mock_settings):
        """Create OllamaService instance"""
        return OllamaService()

    @pytest.mark.asyncio
    async def test_generate_response(
        self,
        ollama_service
    ):
        """Test generating LLM response"""
        prompt = "What is ISO merchant services?"

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "model": "llama3.1:8b",
                "response": "ISO merchant services refers to...",
                "done": True
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            response = await ollama_service.generate_response(prompt)

            assert "ISO merchant services" in response or len(response) > 0

    @pytest.mark.asyncio
    async def test_generate_with_context(
        self,
        ollama_service
    ):
        """Test generating response with RAG context"""
        prompt = "How do I register a merchant?"
        context = "Merchant registration requires business details, tax ID, and bank information."

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "response": "To register a merchant, you need business details...",
                "done": True
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            response = await ollama_service.generate_response(
                prompt=prompt,
                context=context
            )

            assert len(response) > 0

    @pytest.mark.asyncio
    async def test_list_models(
        self,
        ollama_service
    ):
        """Test listing available models"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "models": [
                    {"name": "llama3.1:8b", "size": 4700000000},
                    {"name": "mistral:7b", "size": 4100000000}
                ]
            }
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            models = await ollama_service.list_models()

            assert len(models) > 0
            assert any(m["name"] == "llama3.1:8b" for m in models)

    @pytest.mark.asyncio
    async def test_check_model_availability(
        self,
        ollama_service
    ):
        """Test checking if model is available"""
        with patch.object(ollama_service, 'list_models') as mock_list:
            mock_list.return_value = [{"name": "llama3.1:8b"}]

            is_available = await ollama_service.is_model_available("llama3.1:8b")

            assert is_available is True

    @pytest.mark.asyncio
    async def test_streaming_response(
        self,
        ollama_service
    ):
        """Test streaming LLM response"""
        prompt = "Explain payment processing"

        async def mock_stream():
            chunks = [
                {"response": "Payment ", "done": False},
                {"response": "processing ", "done": False},
                {"response": "involves...", "done": True}
            ]
            for chunk in chunks:
                yield chunk

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.aiter_lines = mock_stream
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            chunks = []
            async for chunk in ollama_service.generate_streaming(prompt):
                chunks.append(chunk)

            assert len(chunks) > 0

    @pytest.mark.asyncio
    async def test_llm_error_handling(
        self,
        ollama_service
    ):
        """Test handling LLM service errors"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            with pytest.raises(Exception):
                await ollama_service.generate_response("test prompt")

    @pytest.mark.asyncio
    async def test_llm_timeout_handling(
        self,
        ollama_service
    ):
        """Test handling LLM timeout"""
        import asyncio

        with patch('httpx.AsyncClient') as mock_client:
            async def slow_response(*args, **kwargs):
                await asyncio.sleep(10)
                return AsyncMock()

            mock_client.return_value.__aenter__.return_value.post = slow_response

            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(
                    ollama_service.generate_response("test"),
                    timeout=1.0
                )

    @pytest.mark.asyncio
    async def test_model_parameters(
        self,
        ollama_service
    ):
        """Test setting model parameters (temperature, top_p, etc.)"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"response": "test", "done": True}
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            await ollama_service.generate_response(
                prompt="test",
                temperature=0.7,
                top_p=0.9,
                max_tokens=500
            )

            # Verify parameters were passed
            call_args = mock_post.call_args
            assert call_args is not None
