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
        # FIXED Dec 28, 2025: Changed from m2-bert-80M-8k-retrieval (deprecated)
        # to BAAI/bge-base-en-v1.5 which is actively supported and produces 768 dims
        self.together_embedding_model = os.getenv(
            "TOGETHER_EMBEDDING_MODEL",
            "BAAI/bge-base-en-v1.5"
        )

        # Ollama fallback for local development
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

        # Embedding dimension (m2-bert-80M-8k-retrieval = 768, nomic-embed-text = 768)
        self.embedding_dimension = 768

        # NOTE: HTTP client is created fresh for each request to avoid async context issues
        # See _generate_embedding() method

        # Determine embedding provider (may be re-evaluated at request time)
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
        together_error = None
        ollama_error = None

        # FIX: Re-check API key on each call to handle late env var loading
        # The singleton may be created before env vars are fully loaded
        together_api_key = os.getenv("TOGETHER_API_KEY", "") or self.together_api_key
        use_together = bool(together_api_key)

        logger.info(
            f"Embedding generation: use_together={use_together}, "
            f"api_key_len={len(together_api_key) if together_api_key else 0}, "
            f"model={self.together_embedding_model}, "
            f"text_len={len(text)}"
        )

        # Try Together.ai first if API key is available
        if use_together:
            # Retry logic for transient network errors and rate limits
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # FIX: Create fresh HTTP client for each request to avoid async context issues
                    async with httpx.AsyncClient(timeout=60.0) as client:  # Increased timeout
                        response = await client.post(
                            f"{self.together_api_url}/embeddings",
                            headers={
                                "Authorization": f"Bearer {together_api_key}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": self.together_embedding_model,
                                # BAAI/bge-base-en-v1.5 has 512 token limit (~1800 chars)
                                # Truncate to stay under limit
                                "input": text[:1800]
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
                        logger.info(f"Together.ai embedding generated successfully (attempt {attempt + 1})")
                        return embedding
                except httpx.TimeoutException as e:
                    together_error = f"Timeout after 60s (attempt {attempt + 1}/{max_retries})"
                    if attempt < max_retries - 1:
                        logger.warning(f"Together.ai embedding timeout (attempt {attempt + 1}/{max_retries}), retrying...")
                        await asyncio.sleep(2 * (attempt + 1))  # Exponential backoff
                    else:
                        logger.error(f"Together.ai embedding timeout after {max_retries} attempts")
                except httpx.HTTPStatusError as e:
                    together_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
                    # Log detailed error for debugging
                    logger.error(
                        f"Together.ai embedding HTTP error: status={e.response.status_code}, "
                        f"model={self.together_embedding_model}, body={e.response.text[:200]}"
                    )
                    # Handle rate limiting (429) with backoff
                    if e.response.status_code == 429 and attempt < max_retries - 1:
                        wait_time = 5 * (attempt + 1)
                        logger.warning(f"Rate limited by Together.ai, waiting {wait_time}s before retry...")
                        await asyncio.sleep(wait_time)
                        continue
                    break  # Don't retry on other HTTP errors (likely model not found or auth issue)
                except Exception as e:
                    together_error = f"{type(e).__name__}: {str(e)}"
                    logger.warning(f"Together.ai embedding failed (attempt {attempt + 1}): {together_error}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1 * (attempt + 1))
        else:
            together_error = "No API key configured"
            logger.warning("Together.ai embedding skipped: no API key")

        # Fallback to Ollama for local development (skip in production - no Ollama running)
        if os.getenv("ENVIRONMENT", "development") == "production":
            ollama_error = "Skipped in production (no Ollama available)"
            logger.info("Ollama fallback skipped in production environment")
        else:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
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
                    logger.info("Ollama embedding generated successfully")
                    return embedding
            except Exception as e:
                ollama_error = f"{type(e).__name__}: {str(e)}"
                logger.warning(f"Ollama embedding failed: {ollama_error}")

        # Both providers failed - provide detailed error message
        error_details = f"Together.ai: {together_error or 'unknown'}"
        if ollama_error:
            error_details += f" | Ollama: {ollama_error}"

        logger.error(f"Embedding generation failed: {error_details}")
        raise EmbeddingGenerationError(f"Embedding generation failed - {error_details}")

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

    async def _delete_point_by_cid(self, collection_name: str, cid: str) -> bool:
        """
        Delete a point by CID (for force re-indexing)

        Args:
            collection_name: Qdrant collection name
            cid: Filecoin CID to delete

        Returns:
            True if deleted successfully
        """
        try:
            # Delete points matching this CID
            self.qdrant.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="cid",
                            match=MatchValue(value=cid)
                        )
                    ]
                )
            )
            logger.info(f"Deleted point with CID {cid[:20]}... for re-embedding")
            return True
        except Exception as e:
            logger.warning(f"Failed to delete point with CID {cid}: {e}")
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

    async def force_reindex_business_data(
        self,
        business_wallet: str,
        cid: str,
        data: dict,
        integration: str,
        data_type: str
    ) -> str:
        """
        Force re-index business data by deleting existing point and creating new one.

        Use this when the embedding model has changed and old embeddings are incompatible.
        Unlike index_business_data(), this ALWAYS generates new embeddings.

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

        # Delete existing point with this CID if it exists
        await self._delete_point_by_cid(collection_name, cid)

        # Convert data to text for embedding
        if isinstance(data, dict):
            text = json.dumps(data, indent=2)
        else:
            text = str(data)

        # Generate NEW embedding (no cache to ensure fresh embedding with current model)
        embedding = await self._generate_embedding(text)

        # Generate unique point ID
        point_id = str(uuid.uuid4())

        # Store minimal payload
        payload = {
            "cid": cid,
            "preview": text[:500],
            "integration": integration,
            "data_type": data_type,
            "business_wallet": business_wallet.lower(),
            "indexed_at": time.time(),
            "record_count": len(data.get("records", [])) if isinstance(data, dict) else 0,
            "embedding_model": self.together_embedding_model  # Track which model was used
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
            f"Force re-indexed: collection={collection_name}, "
            f"CID={cid}, point_id={point_id}, model={self.together_embedding_model}"
        )

        return point_id

    def get_embedding_model(self) -> str:
        """Return the current embedding model being used"""
        return self.together_embedding_model

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

    async def index_document(
        self,
        cid: str,
        integration: str,
        data_type: str,
        wallet_address: str,
        data: Optional[dict] = None
    ) -> str:
        """
        Alias for index_business_data() with parameter order compatible with MCP ingestion service.

        This method exists for backwards compatibility with the MCP pipeline which calls
        index_document() instead of index_business_data().

        Args:
            cid: Filecoin CID of the data
            integration: Integration name
            data_type: Type of data
            wallet_address: Business wallet address
            data: Optional data to index (if None, will fetch from Pinata)

        Returns:
            Point ID in Qdrant
        """
        # If no data provided, we'll use an empty dict with a note
        # The actual implementation will fetch the preview from the CID metadata
        if data is None:
            data = {"note": f"Data indexed from CID: {cid}"}

        return await self.index_business_data(
            business_wallet=wallet_address,
            cid=cid,
            data=data,
            integration=integration,
            data_type=data_type
        )

    async def delete_point_by_cid(
        self,
        business_wallet: str,
        cid: str
    ) -> bool:
        """
        Delete a point from Qdrant by CID

        Public method for removing indexed data when items are deleted.

        Args:
            business_wallet: Business wallet address
            cid: The CID of the point to delete (e.g., "planning-task-123")

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            collection_name = self._get_collection_name(business_wallet)

            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name not in collection_names:
                logger.info(f"Collection {collection_name} does not exist, nothing to delete")
                return True

            # Use the internal delete method
            result = await self._delete_point_by_cid(collection_name, cid)

            if result:
                logger.info(f"Deleted point with CID {cid} from {collection_name}")
            else:
                logger.warning(f"Failed to delete point with CID {cid} from {collection_name}")

            return result

        except Exception as e:
            logger.error(f"Error deleting point by CID {cid}: {str(e)}")
            return False

    async def get_context_items(
        self,
        business_wallet: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get all indexed context items from Qdrant for display in Context Picker

        This method scrolls through the business's Qdrant collection to get
        all indexed items with their metadata for selection in the AI context picker.

        Args:
            business_wallet: Business wallet address
            integration: Optional filter by integration
            data_type: Optional filter by data type
            limit: Maximum number of items to return

        Returns:
            List of context items with metadata
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name not in collection_names:
                logger.info(f"No collection found for {business_wallet[:10]}...")
                return []

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

            scroll_filter = Filter(must=must_conditions) if must_conditions else None

            # Scroll through collection to get all points
            results = self.qdrant.scroll(
                collection_name=collection_name,
                scroll_filter=scroll_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False  # Don't need vectors, just metadata
            )

            points = results[0]  # scroll returns (points, next_offset)

            # Format results for context picker
            context_items = []
            for point in points:
                payload = point.payload
                context_items.append({
                    "id": payload.get("cid", str(point.id)),
                    "type": payload.get("integration", "unknown"),
                    "category": payload.get("data_type", "unknown"),
                    "title": self._generate_title_from_payload(payload),
                    "description": payload.get("preview", "")[:100],
                    "source": "indexed",
                    "metadata": {
                        "cid": payload.get("cid"),
                        "indexed_at": payload.get("indexed_at"),
                        "record_count": payload.get("record_count", 0)
                    }
                })

            logger.info(
                f"Retrieved {len(context_items)} context items from {collection_name}"
            )

            return context_items

        except Exception as e:
            logger.error(f"Failed to get context items for {business_wallet}: {str(e)}")
            return []

    async def delete_by_integration(
        self,
        business_wallet: str,
        integration: str
    ) -> int:
        """
        Delete all RAG data for a specific integration.

        This method is called when an integration is disconnected to ensure
        the Context Picker and AI Assistant don't show stale data.

        Args:
            business_wallet: Business wallet address
            integration: Integration name (e.g., 'google', 'slack', 'microsoft')

        Returns:
            Number of points deleted
        """
        collection_name = self._get_collection_name(business_wallet)

        try:
            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            collection_names = [c.name for c in collections]

            if collection_name not in collection_names:
                logger.info(f"Collection {collection_name} does not exist, nothing to delete")
                return 0

            # Delete all points matching this integration
            self.qdrant.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="integration",
                            match=MatchValue(value=integration)
                        )
                    ]
                )
            )

            logger.info(f"Deleted all RAG data for integration {integration} in collection {collection_name}")
            return 1  # We don't have an exact count from Qdrant delete operation

        except Exception as e:
            logger.error(f"Error deleting RAG data for integration {integration}: {str(e)}")
            raise

    def _generate_title_from_payload(self, payload: Dict[str, Any]) -> str:
        """
        Generate a human-readable title from payload metadata

        Args:
            payload: Point payload from Qdrant

        Returns:
            Human-readable title string
        """
        integration = payload.get("integration", "unknown")
        data_type = payload.get("data_type", "unknown")
        record_count = payload.get("record_count", 0)

        # Try to extract specific titles based on data type
        if data_type == "drive":
            return f"Google Drive files ({record_count} items)"
        elif data_type == "contacts":
            return f"Google Contacts ({record_count} contacts)"
        elif data_type == "invoices":
            return f"QuickBooks Invoices ({record_count} invoices)"
        elif data_type == "customers":
            return f"QuickBooks Customers ({record_count} customers)"
        elif data_type == "expenses":
            return f"QuickBooks Expenses ({record_count} expenses)"
        elif data_type == "planning":
            # For planning items, use the preview if available
            preview = payload.get("preview", "")
            if preview:
                # Try to extract title from JSON preview
                try:
                    import json
                    data = json.loads(preview)
                    if "title" in data:
                        return data["title"]
                except:
                    pass
            return f"Planning Item"
        else:
            return f"{integration.title()} {data_type.title()} ({record_count} items)"


# Create singleton instance for import
try:
    rag_service = BusinessRAGService()
    logger.info("RAG service singleton created successfully")
except Exception as e:
    logger.warning(f"Failed to create RAG service singleton: {e}")
    rag_service = None
