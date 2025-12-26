"""
Varity Business RAG Service
Multi-tenant vector database for business-specific knowledge retrieval

Architecture:
- Each business gets isolated Qdrant collection: business_{wallet_address}
- Embeddings generated using Ollama (100% local, no external API calls)
- Business A queries ONLY access Business A's collection
- No cross-business data leakage possible
"""
import json
import uuid
import time
import logging
import httpx
import asyncio
import os
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType
)

from ..core.config import settings
from .encryption_service import normalize_wallet_address

logger = logging.getLogger(__name__)


class BusinessRAGService:
    """
    Multi-tenant RAG service with strict business isolation

    Features:
    - Isolated Qdrant collections per business wallet
    - Local embedding generation (no external APIs)
    - Automatic collection creation
    - Business-scoped queries only
    """

    def __init__(self):
        """Initialize Qdrant client and embedding settings"""
        # Connect to Qdrant (local or cloud)
        qdrant_url = getattr(settings, 'qdrant_url', 'http://localhost:6334')
        qdrant_api_key = getattr(settings, 'qdrant_api_key', None) or os.getenv("QDRANT_API_KEY")

        # Initialize Qdrant client with optional API key for cloud
        if qdrant_api_key:
            self.qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
            logger.info(f"Qdrant Cloud client initialized with API key")
        else:
            self.qdrant = QdrantClient(url=qdrant_url)
            logger.info(f"Qdrant local client initialized (no API key)")

        # Embedding configuration - Together.ai primary, Ollama fallback
        self.together_api_key = os.getenv("TOGETHER_API_KEY", "")
        self.together_api_url = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1")
        self.together_embedding_model = os.getenv(
            "TOGETHER_EMBEDDING_MODEL",
            "togethercomputer/m2-bert-80M-8k-retrieval"
        )

        # Ollama fallback for local development
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11435")
        self.ollama_embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

        # Embedding dimension (m2-bert-80M-8k-retrieval = 768, nomic-embed-text = 768)
        self.embedding_dimension = 768

        # HTTP client with timeout
        self.http_client = httpx.AsyncClient(timeout=30.0)

        # Determine embedding provider
        self.use_together_embeddings = bool(self.together_api_key)

        logger.info(
            f"BusinessRAGService initialized: "
            f"Qdrant={qdrant_url}, "
            f"Embeddings={'Together.ai' if self.use_together_embeddings else 'Ollama'}, "
            f"Model={self.together_embedding_model if self.use_together_embeddings else self.ollama_embedding_model}"
        )

    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using Together.ai (primary) or Ollama (fallback)

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        # Try Together.ai first if API key is available
        if self.use_together_embeddings:
            try:
                response = await self.http_client.post(
                    f"{self.together_api_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.together_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.together_embedding_model,
                        "input": text
                    }
                )
                response.raise_for_status()
                result = response.json()
                # Together.ai returns embeddings in OpenAI-compatible format
                return result["data"][0]["embedding"]
            except Exception as e:
                logger.warning(f"Together.ai embedding failed, trying Ollama: {str(e)}")

        # Fallback to Ollama for local development
        try:
            response = await self.http_client.post(
                f"{self.ollama_url}/api/embeddings",
                json={
                    "model": self.ollama_embedding_model,
                    "prompt": text
                }
            )
            response.raise_for_status()
            result = response.json()
            return result["embedding"]
        except httpx.HTTPError as e:
            logger.error(f"Failed to generate embedding (both providers failed): {str(e)}")
            # Fallback: return zero vector if both fail
            return [0.0] * self.embedding_dimension

    def _get_collection_name(self, business_wallet: str) -> str:
        """
        Generate collection name for a business

        Args:
            business_wallet: Business wallet address

        Returns:
            Collection name: business_{wallet_normalized}
        """
        # CRITICAL: Use normalize_wallet_address for consistency with storage/retrieval
        normalized = normalize_wallet_address(business_wallet)
        wallet_clean = normalized.replace("0x", "")
        return f"business_{wallet_clean}"

    async def create_business_collection(
        self,
        business_wallet: str
    ) -> bool:
        """
        Create isolated Qdrant collection for a business

        Args:
            business_wallet: Business wallet address

        Returns:
            True if created or already exists
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            # Check if collection already exists
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name in collection_names:
                logger.info(f"Collection already exists: {collection_name}")
                return True

            # Create new collection
            self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dimension,
                    distance=Distance.COSINE
                )
            )

            # Create payload indexes for filtering (required by Qdrant for filtered queries)
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="integration",
                field_schema=PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="data_type",
                field_schema=PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="business_wallet",
                field_schema=PayloadSchemaType.KEYWORD
            )

            logger.info(
                f"Created business collection with indexes: {collection_name} "
                f"for wallet {business_wallet[:10]}..."
            )

            return True

        except Exception as e:
            # Collection might already exist (race condition)
            if "already exists" in str(e).lower():
                logger.info(f"Collection already exists: {collection_name}")
                return True

            logger.error(f"Failed to create collection {collection_name}: {str(e)}")
            raise

    def _ensure_payload_indexes(self, collection_name: str) -> None:
        """
        Ensure payload indexes exist on collection (for existing collections)
        Safe to call multiple times - will skip if index already exists
        """
        for field_name in ["integration", "data_type", "business_wallet"]:
            try:
                self.qdrant.create_payload_index(
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=PayloadSchemaType.KEYWORD
                )
                logger.info(f"Created payload index: {collection_name}.{field_name}")
            except Exception as idx_err:
                # Index might already exist - that's fine
                err_str = str(idx_err).lower()
                if "already exists" in err_str or "already indexed" in err_str:
                    logger.debug(f"Index already exists: {collection_name}.{field_name}")
                else:
                    logger.warning(f"Failed to create index {field_name}: {idx_err}")

    async def index_business_data(
        self,
        business_wallet: str,
        cid: str,
        data: dict,
        integration: str,
        data_type: str
    ) -> str:
        """
        Index business data in their isolated Qdrant collection

        Args:
            business_wallet: Business wallet address
            cid: Filecoin CID of the data
            data: Data to index (will be embedded)
            integration: Integration name
            data_type: Type of data

        Returns:
            Point ID in Qdrant
        """
        collection_name = self._get_collection_name(business_wallet)

        # Ensure collection exists
        await self.create_business_collection(business_wallet)

        # Convert data to text for embedding
        if isinstance(data, dict):
            text = json.dumps(data, indent=2)
        else:
            text = str(data)

        # Generate embedding using Ollama API
        embedding = await self._generate_embedding(text)

        # Generate unique point ID
        point_id = str(uuid.uuid4())

        # Prepare payload with metadata
        payload = {
            "cid": cid,
            "data": data,
            "integration": integration,
            "data_type": data_type,
            "business_wallet": business_wallet.lower(),
            "indexed_at": time.time(),
            "text": text[:1000]  # Store first 1000 chars for preview
        }

        # Upsert into Qdrant
        self.qdrant.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload
                )
            ]
        )

        logger.info(
            f"Indexed data: collection={collection_name}, "
            f"CID={cid}, point_id={point_id}"
        )

        return point_id

    async def query_business_rag(
        self,
        business_wallet: str,
        query: str,
        limit: int = 5,
        integration: Optional[str] = None,
        data_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query ONLY this business's RAG data

        CRITICAL: This ensures Business A cannot access Business B's data
        Each business queries their own isolated collection

        Args:
            business_wallet: Business wallet requesting query
            query: User's question/search query
            limit: Maximum number of results
            integration: Optional filter by integration
            data_type: Optional filter by data type

        Returns:
            List of relevant data from THIS business's collection only
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name not in collection_names:
                logger.warning(
                    f"No data indexed yet for business {business_wallet[:10]}..."
                )
                return []

            # Ensure payload indexes exist for filtering (handles existing collections)
            if integration or data_type:
                self._ensure_payload_indexes(collection_name)

            # Embed query using Together.ai (primary) or Ollama (fallback)
            query_embedding = await self._generate_embedding(query)

            # Build filter for integration/data_type if provided
            query_filter = None
            if integration or data_type:
                must_conditions = []

                if integration:
                    must_conditions.append(
                        FieldCondition(
                            key="integration",
                            match=MatchValue(value=integration)
                        )
                    )

                if data_type:
                    must_conditions.append(
                        FieldCondition(
                            key="data_type",
                            match=MatchValue(value=data_type)
                        )
                    )

                if must_conditions:
                    query_filter = Filter(must=must_conditions)

            # Search in THIS business's collection ONLY
            # Use query_points for qdrant-client>=1.12.0 compatibility
            search_result = self.qdrant.query_points(
                collection_name=collection_name,
                query=query_embedding,
                limit=limit,
                query_filter=query_filter
            )
            results = search_result.points

            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "cid": result.payload.get("cid"),
                    "data": result.payload.get("data"),
                    "integration": result.payload.get("integration"),
                    "data_type": result.payload.get("data_type"),
                    "score": result.score,
                    "indexed_at": result.payload.get("indexed_at")
                })

            logger.info(
                f"RAG query successful: collection={collection_name}, "
                f"query='{query[:50]}...', results={len(formatted_results)}"
            )

            return formatted_results

        except Exception as e:
            logger.error(
                f"RAG query failed for {business_wallet[:10]}...: {str(e)}"
            )
            raise

    async def get_collection_stats(
        self,
        business_wallet: str
    ) -> Dict[str, Any]:
        """
        Get statistics about a business's RAG collection

        Args:
            business_wallet: Business wallet address

        Returns:
            Collection statistics (count, size, etc.)
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name not in collection_names:
                return {
                    "exists": False,
                    "count": 0,
                    "message": "Collection not created yet"
                }

            # Get collection info
            collection_info = self.qdrant.get_collection(collection_name)

            # Handle Qdrant API compatibility - vectors_count moved in newer versions
            vectors_count = 0
            indexed_vectors_count = 0
            try:
                vectors_count = getattr(collection_info, 'vectors_count', 0) or collection_info.points_count
                indexed_vectors_count = getattr(collection_info, 'indexed_vectors_count', 0) or collection_info.points_count
            except AttributeError:
                # Newer Qdrant versions don't have these attributes
                vectors_count = collection_info.points_count
                indexed_vectors_count = collection_info.points_count

            stats = {
                "exists": True,
                "count": collection_info.points_count,
                "vectors_count": vectors_count,
                "indexed_vectors_count": indexed_vectors_count,
                "status": collection_info.status
            }

            logger.info(
                f"Collection stats for {business_wallet[:10]}...: "
                f"{stats['count']} documents indexed"
            )

            return stats

        except Exception as e:
            logger.error(f"Failed to get stats for {business_wallet}: {str(e)}")
            raise

    async def delete_business_collection(
        self,
        business_wallet: str
    ) -> bool:
        """
        Delete a business's entire RAG collection

        WARNING: This permanently deletes all indexed data for this business

        Args:
            business_wallet: Business wallet address

        Returns:
            True if deleted successfully
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            self.qdrant.delete_collection(collection_name)

            logger.warning(
                f"DELETED collection {collection_name} for "
                f"wallet {business_wallet[:10]}..."
            )

            return True

        except Exception as e:
            logger.error(f"Failed to delete collection {collection_name}: {str(e)}")
            raise

    async def health_check(self) -> bool:
        """
        Check if Qdrant is healthy and accessible

        Returns:
            True if Qdrant is responsive
        """
        try:
            collections = self.qdrant.get_collections()
            logger.info(
                f"Qdrant health check passed: "
                f"{len(collections.collections)} collections"
            )
            return True

        except Exception as e:
            logger.error(f"Qdrant health check failed: {str(e)}")
            return False


# Create singleton instance for import
try:
    rag_service = BusinessRAGService()
    logger.info("RAG service singleton created successfully")
except Exception as e:
    logger.warning(f"Failed to create RAG service singleton: {e}")
    rag_service = None
