"""
Varity Business RAG Service
Multi-tenant vector database for business-specific knowledge retrieval

Architecture:
- Each business gets isolated Qdrant collection: business_{wallet_address}
- Embeddings generated using Together.ai (primary) or Ollama (fallback)
- Business A queries ONLY access Business A's collection
- No cross-business data leakage possible

Optimizations (Dec 26, 2025):
- Embedding caching with TTL to reduce API calls
- CID-based deduplication to prevent duplicate indexing
- Score threshold filtering for relevance
- Date range filtering for time-based queries
"""
import json
import uuid
import time
import logging
import httpx
import asyncio
import os
import hashlib
from typing import List, Dict, Any, Optional, Tuple

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
    Range
)


class EmbeddingGenerationError(Exception):
    """Raised when embedding generation fails"""
    pass

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

        # Embedding cache for performance (reduce API calls)
        # Format: {cache_key: (timestamp, embedding)}
        self._embedding_cache: Dict[str, Tuple[float, List[float]]] = {}
        self._cache_ttl = 300  # 5 minutes TTL
        self._cache_max_size = 1000  # Max cached embeddings

        logger.info(
            f"BusinessRAGService initialized: "
            f"Qdrant={qdrant_url}, "
            f"Embeddings={'Together.ai' if self.use_together_embeddings else 'Ollama'}, "
            f"Model={self.together_embedding_model if self.use_together_embeddings else self.ollama_embedding_model}, "
            f"Cache=5min TTL, max 1000 entries"
        )

    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using Together.ai (primary) or Ollama (fallback)

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector

        Raises:
            EmbeddingGenerationError: If both providers fail
        """
        last_error = None

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
                embedding = result["data"][0]["embedding"]
                # Validate embedding
                if len(embedding) != self.embedding_dimension:
                    raise EmbeddingGenerationError(
                        f"Invalid embedding dimension: {len(embedding)} != {self.embedding_dimension}"
                    )
                return embedding
            except Exception as e:
                last_error = e
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
            embedding = result["embedding"]
            # Validate embedding
            if len(embedding) != self.embedding_dimension:
                raise EmbeddingGenerationError(
                    f"Invalid embedding dimension: {len(embedding)} != {self.embedding_dimension}"
                )
            return embedding
        except Exception as e:
            last_error = e
            logger.error(f"Failed to generate embedding (both providers failed): {str(e)}")
            # FIX 1.3: Raise exception instead of returning zero vector
            # Zero vectors pollute the index with meaningless entries
            raise EmbeddingGenerationError(
                f"Embedding generation failed for both providers: {last_error}"
            )

    async def _generate_embedding_cached(self, text: str) -> List[float]:
        """
        Generate embedding with caching to reduce API calls

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector (may be cached)
        """
        # Generate cache key from text hash
        cache_key = hashlib.md5(text.encode()).hexdigest()

        # Check cache
        if cache_key in self._embedding_cache:
            cached_time, embedding = self._embedding_cache[cache_key]
            if time.time() - cached_time < self._cache_ttl:
                logger.debug(f"Embedding cache hit for key {cache_key[:8]}...")
                return embedding
            else:
                # Cache expired, remove
                del self._embedding_cache[cache_key]

        # Generate new embedding
        embedding = await self._generate_embedding(text)

        # Clean cache if too large
        if len(self._embedding_cache) >= self._cache_max_size:
            # Remove oldest entries
            sorted_keys = sorted(
                self._embedding_cache.keys(),
                key=lambda k: self._embedding_cache[k][0]
            )
            for key in sorted_keys[:100]:  # Remove oldest 100
                del self._embedding_cache[key]
            logger.info(f"Embedding cache cleaned, removed 100 oldest entries")

        # Cache the embedding
        self._embedding_cache[cache_key] = (time.time(), embedding)
        return embedding

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
            # FIX 2.3: Add indexed_at index for date range filtering
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="indexed_at",
                field_schema=PayloadSchemaType.FLOAT
            )
            # FIX 3.1: Add cid index for deduplication lookups
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="cid",
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
        # Keyword indexes
        for field_name in ["integration", "data_type", "business_wallet", "cid"]:
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

        # Float index for date range queries
        try:
            self.qdrant.create_payload_index(
                collection_name=collection_name,
                field_name="indexed_at",
                field_schema=PayloadSchemaType.FLOAT
            )
            logger.info(f"Created payload index: {collection_name}.indexed_at")
        except Exception as idx_err:
            err_str = str(idx_err).lower()
            if "already exists" not in err_str and "already indexed" not in err_str:
                logger.warning(f"Failed to create indexed_at index: {idx_err}")

    async def _find_by_cid(self, collection_name: str, cid: str) -> Optional[str]:
        """
        Find a point by CID (for deduplication)

        Args:
            collection_name: Qdrant collection name
            cid: Filecoin CID to search for

        Returns:
            Point ID if found, None otherwise
        """
        try:
            # Scroll with CID filter
            results = self.qdrant.scroll(
                collection_name=collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="cid",
                            match=MatchValue(value=cid)
                        )
                    ]
                ),
                limit=1
            )

            points = results[0]  # scroll returns (points, next_offset)
            if points:
                return str(points[0].id)
            return None
        except Exception as e:
            logger.warning(f"CID lookup failed for {cid}: {e}")
            return None

    async def _update_point_timestamp(self, collection_name: str, point_id: str) -> bool:
        """
        Update the indexed_at timestamp of an existing point

        Args:
            collection_name: Qdrant collection name
            point_id: Point ID to update

        Returns:
            True if updated successfully
        """
        try:
            self.qdrant.set_payload(
                collection_name=collection_name,
                payload={"indexed_at": time.time()},
                points=[point_id]
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to update timestamp for {point_id}: {e}")
            return False

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

        Optimizations:
        - FIX 2.1: Uses cached embeddings to reduce API calls
        - FIX 3.1: Checks for existing CID to prevent duplicates
        - FIX 3.2: Stores minimal payload (preview only, not full data)

        Args:
            business_wallet: Business wallet address
            cid: Filecoin CID of the data
            data: Data to index (will be embedded)
            integration: Integration name
            data_type: Type of data

        Returns:
            Point ID in Qdrant (existing or new)
        """
        collection_name = self._get_collection_name(business_wallet)

        # Ensure collection exists
        await self.create_business_collection(business_wallet)

        # FIX 3.1: Check for existing CID (deduplication)
        existing_id = await self._find_by_cid(collection_name, cid)
        if existing_id:
            # Update timestamp but don't re-index
            await self._update_point_timestamp(collection_name, existing_id)
            logger.info(
                f"Dedup: CID {cid[:20]}... already indexed as {existing_id}, updated timestamp"
            )
            return existing_id

        # Convert data to text for embedding
        if isinstance(data, dict):
            text = json.dumps(data, indent=2)
        else:
            text = str(data)

        # FIX 2.1: Generate embedding using cached method
        embedding = await self._generate_embedding_cached(text)

        # Generate unique point ID
        point_id = str(uuid.uuid4())

        # FIX 3.2: Store minimal payload (preview only, not full data)
        # Full data should be retrieved from Pinata when needed
        # This reduces Qdrant memory usage and potential data exposure
        payload = {
            "cid": cid,
            "preview": text[:500],  # Short preview for display
            "integration": integration,
            "data_type": data_type,
            "business_wallet": business_wallet.lower(),
            "indexed_at": time.time(),
            "record_count": len(data.get("records", [])) if isinstance(data, dict) else 0
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
            f"CID={cid}, point_id={point_id}, records={payload['record_count']}"
        )

        return point_id

    async def query_business_rag(
        self,
        business_wallet: str,
        query: str,
        limit: int = 10,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        date_from: Optional[float] = None,
        date_to: Optional[float] = None,
        score_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Query ONLY this business's RAG data

        CRITICAL: This ensures Business A cannot access Business B's data
        Each business queries their own isolated collection

        Optimizations:
        - FIX 2.1: Uses cached embeddings for queries
        - FIX 2.2: Increased default limit and score threshold filtering
        - FIX 2.3: Date range filtering support

        Args:
            business_wallet: Business wallet requesting query
            query: User's question/search query
            limit: Maximum number of results (default 10, was 5)
            integration: Optional filter by integration
            data_type: Optional filter by data type
            date_from: Optional filter - only results indexed after this timestamp
            date_to: Optional filter - only results indexed before this timestamp
            score_threshold: Minimum relevance score (0-1, default 0.5)

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
            self._ensure_payload_indexes(collection_name)

            # FIX 2.1: Embed query using cached method
            query_embedding = await self._generate_embedding_cached(query)

            # Build filter conditions
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

            # FIX 2.3: Add date range filtering
            if date_from is not None or date_to is not None:
                range_params = {}
                if date_from is not None:
                    range_params["gte"] = date_from
                if date_to is not None:
                    range_params["lte"] = date_to
                must_conditions.append(
                    FieldCondition(
                        key="indexed_at",
                        range=Range(**range_params)
                    )
                )

            query_filter = Filter(must=must_conditions) if must_conditions else None

            # Search in THIS business's collection ONLY
            # Use query_points for qdrant-client>=1.12.0 compatibility
            # Request more results for score filtering
            search_result = self.qdrant.query_points(
                collection_name=collection_name,
                query=query_embedding,
                limit=limit * 2,  # Get extra for score filtering
                query_filter=query_filter,
                score_threshold=score_threshold  # FIX 2.2: Filter by relevance
            )
            results = search_result.points

            # Format results - limit to requested amount after score filtering
            formatted_results = []
            for result in results[:limit]:
                # Handle both new format (preview only) and legacy format (full data)
                preview = result.payload.get("preview") or result.payload.get("text", "")
                data = result.payload.get("data")  # May be None for new format

                formatted_results.append({
                    "cid": result.payload.get("cid"),
                    "preview": preview[:500] if preview else "",
                    "data": data,  # Will be None for minimal payload - caller should fetch from Pinata
                    "integration": result.payload.get("integration"),
                    "data_type": result.payload.get("data_type"),
                    "score": result.score,
                    "indexed_at": result.payload.get("indexed_at"),
                    "record_count": result.payload.get("record_count", 0)
                })

            logger.info(
                f"RAG query successful: collection={collection_name}, "
                f"query='{query[:50]}...', results={len(formatted_results)}, "
                f"score_threshold={score_threshold}"
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
