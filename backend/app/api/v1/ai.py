"""
AI Chatbot API Endpoints - RAG-Powered Business Intelligence

This module provides AI-powered chat capabilities with RAG context
from the user's integrated tools (QuickBooks, Salesforce, etc.)

Features:
- General LLM mode (works without any integrations)
- RAG-enhanced mode (uses business data when integrations are connected)
- Document analysis capabilities
- Deep research mode for complex queries
- Multi-provider support (Together.ai, Ollama)
"""
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File  # type: ignore[import]
from pydantic import BaseModel  # type: ignore[import]
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import json
import os

from sqlalchemy.ext.asyncio import AsyncSession  # type: ignore[import]
from sqlalchemy import select, and_  # type: ignore[import]
from sqlalchemy.orm import selectinload  # type: ignore[import]

from app.core.database import get_db
from app.core.config import settings
from app.models.purchase import Purchase, OAuthToken
from app.models.marketplace import Product
from app.models.project import Project, ProjectFile
import httpx

from app.services.ai_query_service import ai_query_service
from app.services.filecoin_service import FilecoinService, FilecoinMultiTenantService
from app.services.encryption_service import EncryptionService
from app.services.ollama_service import OllamaBusinessService
from app.services.together_service import TogetherBusinessService, TogetherService
from app.services.rag_service import BusinessRAGService
from app.services.web_search_service import web_search_service
from app.services.settings_service import SettingsService

# Initialize settings service for fetching industry context
settings_service = SettingsService()

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
filecoin_mt_service = FilecoinMultiTenantService()
encryption_service = EncryptionService()
ollama_business_service = OllamaBusinessService()
together_business_service = TogetherBusinessService()
together_service = TogetherService()

# Initialize RAG service with graceful fallback
try:
    rag_service = BusinessRAGService()
    logger.info("RAG service initialized successfully")
except Exception as e:
    logger.warning(f"Failed to initialize RAG service (Qdrant may not be configured): {e}")
    rag_service = None  # type: ignore


def get_llm_provider() -> str:
    """Get the configured LLM provider (together or ollama)"""
    return getattr(settings, 'llm_provider', 'together')


def get_business_ai_service():
    """Get the appropriate business AI service based on configuration"""
    provider = get_llm_provider()
    if provider == "together" and os.getenv("TOGETHER_API_KEY"):
        return together_business_service
    return ollama_business_service


async def get_user_context(wallet_address: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Fetch user's industry and company context for AI personalization

    Args:
        wallet_address: User's wallet address
        db: Database session

    Returns:
        Dict with industry and company_name (or None values if not set)
    """
    try:
        user_settings = await settings_service.get_user_settings(db, wallet_address)
        return {
            "industry": getattr(user_settings, 'industry', None),
            "company_name": getattr(user_settings, 'company_name', None)
        }
    except Exception as e:
        logger.warning(f"Failed to fetch user context for {wallet_address[:10]}...: {e}")
        return {"industry": None, "company_name": None}


# Pydantic models
class ChatRequest(BaseModel):
    """AI chat request"""
    message: str
    wallet_address: str
    conversation_id: Optional[str] = None
    use_rag: bool = True
    mode: str = "auto"  # "auto", "general", "rag", "research"


class ChatResponse(BaseModel):
    """AI chat response"""
    response: str
    conversation_id: str
    sources: List[Dict[str, Any]] = []
    metadata: Dict[str, Any]
    mode: str = "auto"


class QueryRequest(BaseModel):
    """Advanced RAG query request"""
    query: str
    wallet_address: str
    tools: List[str]  # e.g., ['quickbooks', 'salesforce']
    filters: Optional[Dict[str, Any]] = None


class GeneralChatRequest(BaseModel):
    """General LLM chat request (works without integrations)"""
    message: str
    wallet_address: str
    conversation_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    selected_context_ids: Optional[List[str]] = None  # CIDs of selected context items
    project_id: Optional[int] = None  # Project ID for custom instructions and pinned files


class GeneralChatResponse(BaseModel):
    """General LLM chat response"""
    response: str
    conversation_id: str
    mode: str = "general"
    provider: str
    model: str
    rag_sources: List[str] = []  # CIDs of data used as context
    context_used: bool = False  # Whether business data was used
    metadata: Dict[str, Any]


class DocumentAnalysisRequest(BaseModel):
    """Document analysis request"""
    document_content: str
    wallet_address: str
    analysis_type: str = "summary"  # summary, key_points, sentiment, extraction, action_items


class DocumentAnalysisResponse(BaseModel):
    """Document analysis response"""
    analysis: str
    analysis_type: str
    document_length: int
    timestamp: str
    metadata: Dict[str, Any]


class ResearchQueryRequest(BaseModel):
    """Deep research query request"""
    query: str
    wallet_address: str
    integration: Optional[str] = None
    data_type: Optional[str] = None
    depth: str = "comprehensive"  # "quick", "standard", "comprehensive"


class ResearchQueryResponse(BaseModel):
    """Deep research query response"""
    analysis: str
    sources: List[str]
    context_used: bool
    mode: str = "research"
    depth: str
    metadata: Dict[str, Any]


class WebSearchRequest(BaseModel):
    """Web search query request"""
    query: str
    wallet_address: str
    search_query: Optional[str] = None  # Optional custom search query
    max_results: int = 5


class WebSearchResponse(BaseModel):
    """Web search query response"""
    answer: str
    mode: str = "web_search"
    search_query: str
    sources: List[Dict[str, str]]
    provider: Optional[str]
    metadata: Dict[str, Any]


class CombinedQueryRequest(BaseModel):
    """Combined RAG + Web Search query request"""
    query: str
    wallet_address: str
    integration: Optional[str] = None
    data_type: Optional[str] = None
    enable_web_search: bool = True
    max_rag_results: int = 5
    max_search_results: int = 3


class CombinedQueryResponse(BaseModel):
    """Combined RAG + Web Search query response"""
    answer: str
    mode: str
    rag_sources: List[str]
    web_sources: List[Dict[str, str]]
    context_used: bool
    web_search_used: bool
    metadata: Dict[str, Any]


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    AI chatbot query with RAG context

    This endpoint:
    1. Retrieves user's installed tools from smart contract
    2. Fetches relevant data from Filecoin for each tool
    3. Builds RAG context from the data
    4. Sends query + context to Ollama LLM
    5. Returns AI response with source citations

    Args:
        request: Chat request with message and wallet address

    Returns:
        AI-generated response with sources
    """
    try:
        logger.info(
            f"AI chat request from {request.wallet_address}: "
            f"{request.message[:100]}..."
        )

        # Step 1: Get user's installed tools based on real purchases
        installed_tools = await _get_installed_tools_for_wallet(request.wallet_address, db)

        # Step 2: Build RAG context from tool data
        rag_context = await _build_rag_context(
            wallet_address=request.wallet_address,
            tools=installed_tools,
            query=request.message,
            db=db
        )

        # Step 3: Query AI with context
        ai_response = await ai_query_service.process_query(
            query=request.message,
            wallet=request.wallet_address,
            context=rag_context,
            use_rag=request.use_rag,
            log_to_blockchain=True
        )

        if not ai_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=ai_response.get("error", "AI query failed")
            )

        # Build response
        response = ChatResponse(
            response=ai_response["response"],
            conversation_id=request.conversation_id or f"conv-{datetime.now().timestamp()}",
            sources=rag_context.get("sources", []),
            metadata={
                "wallet": request.wallet_address,
                "tools_used": installed_tools,
                "rag_enabled": request.use_rag,
                "timestamp": datetime.now().isoformat(),
                **ai_response.get("metadata", {})
            }
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def ai_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Advanced RAG query across multiple tools

    This endpoint allows querying specific tools with filters,
    useful for complex business intelligence queries.

    Args:
        request: Query request with tools and filters

    Returns:
        AI-generated insights from specified tools
    """
    try:
        logger.info(
            f"AI query from {request.wallet_address}: {request.query}, "
            f"tools={request.tools}"
        )

        # Build RAG context from specified tools only
        rag_context = await _build_rag_context(
            wallet_address=request.wallet_address,
            tools=request.tools,
            query=request.query,
            filters=request.filters,
            db=db
        )

        # Query AI
        ai_response = await ai_query_service.process_query(
            query=request.query,
            wallet=request.wallet_address,
            context=rag_context,
            use_rag=True,
            log_to_blockchain=True
        )

        if not ai_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=ai_response.get("error", "AI query failed")
            )

        return {
            "success": True,
            "query": request.query,
            "response": ai_response["response"],
            "tools_queried": request.tools,
            "sources": rag_context.get("sources", []),
            "metadata": ai_response.get("metadata", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_query_suggestions(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get suggested queries based on user's data

    Analyzes the user's integrated tools and data to suggest
    relevant business intelligence queries.

    Args:
        wallet_address: User's wallet address

    Returns:
        List of suggested queries
    """
    try:
        # Get installed tools based on real purchases
        installed_tools = await _get_installed_tools_for_wallet(wallet_address, db)

        # Generate suggestions based on tools
        suggestions = []

        if "quickbooks" in installed_tools:
            suggestions.extend([
                {
                    "query": "What invoices are overdue?",
                    "category": "Revenue",
                    "tool": "quickbooks"
                },
                {
                    "query": "Show me my top expenses this month",
                    "category": "Expenses",
                    "tool": "quickbooks"
                },
                {
                    "query": "Who are my top 5 customers by revenue?",
                    "category": "Customers",
                    "tool": "quickbooks"
                },
                {
                    "query": "What's my cash flow looking like?",
                    "category": "Financial",
                    "tool": "quickbooks"
                }
            ])

        if "salesforce" in installed_tools:
            suggestions.extend([
                {
                    "query": "Show my sales pipeline",
                    "category": "Sales",
                    "tool": "salesforce"
                },
                {
                    "query": "Which leads need follow-up?",
                    "category": "Leads",
                    "tool": "salesforce"
                }
            ])

        return {
            "success": True,
            "wallet_address": wallet_address,
            "suggestions": suggestions,
            "count": len(suggestions)
        }

    except Exception as e:
        logger.error(f"Failed to get suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_query_history(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(20, description="Number of queries to return")
):
    """
    Get user's query history

    In production, this would read from ZK rollup logs on blockchain.

    Args:
        wallet_address: User's wallet address
        limit: Maximum queries to return

    Returns:
        Query history
    """
    try:
        # In production, query blockchain for ZK-logged queries
        history = await ai_query_service.get_query_stats(wallet_address)

        return {
            "success": True,
            "wallet_address": wallet_address,
            "history": history,
            "message": "Query history coming from blockchain in production"
        }

    except Exception as e:
        logger.error(f"Failed to get query history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Multi-Tenant AI Query Endpoints ====================

class MultiTenantQueryRequest(BaseModel):
    """Multi-tenant AI query request"""
    query: str
    wallet_address: str
    integration: Optional[str] = None
    data_type: Optional[str] = None
    max_results: int = 5


class MultiTenantQueryResponse(BaseModel):
    """Multi-tenant AI query response"""
    success: bool
    answer: str
    sources: List[str]
    context_used: bool
    wallet_address: str
    metadata: Dict[str, Any]


@router.post("/query/multitenant", response_model=MultiTenantQueryResponse)
async def multi_tenant_ai_query(request: MultiTenantQueryRequest):
    """
    Multi-tenant AI query with strict business isolation

    CRITICAL FEATURE: Business A can ONLY query Business A's data.
    Business B's data is completely isolated and inaccessible.

    Architecture:
    - Each business has isolated Qdrant collection: business_{wallet}
    - RAG queries are wallet-scoped
    - Shared LLM (Together.ai primary, Ollama fallback)
    - Zero cross-business data leakage

    Args:
        request: Query request with wallet address

    Returns:
        AI response with business-specific context ONLY
    """
    try:
        logger.info(
            f"Multi-tenant AI query from {request.wallet_address[:10]}...: "
            f"'{request.query[:100]}...'"
        )

        # MVP: Use Together.ai exclusively for AI queries
        if not os.getenv("TOGETHER_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="AI service not configured. TOGETHER_API_KEY is required."
            )

        # Query AI with business-specific RAG using Together.ai
        result = await together_business_service.query_business_ai(
            business_wallet=request.wallet_address,
            user_query=request.query,
            integration=request.integration,
            data_type=request.data_type,
            max_context_items=request.max_results
        )

        # Build response
        response = MultiTenantQueryResponse(
            success=True,
            answer=result["answer"],
            sources=result["sources"],
            context_used=result["context_used"],
            wallet_address=request.wallet_address,
            metadata={
                "integration": request.integration,
                "data_type": request.data_type,
                "timestamp": datetime.now().isoformat(),
                "rag_enabled": True
            }
        )

        logger.info(
            f"Multi-tenant query successful: "
            f"wallet={request.wallet_address[:10]}..., "
            f"sources={len(result['sources'])}"
        )

        return response

    except Exception as e:
        logger.error(f"Multi-tenant AI query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI query failed: {str(e)}"
        )


async def _get_installed_tools_for_wallet(wallet_address: str, db: AsyncSession) -> List[str]:
    """Return integration slugs for tools this wallet has purchased and can use.

    Uses the marketplace purchases table instead of hard-coded mocks.
    """
    try:
        user_address = wallet_address.lower()

        result = await db.execute(
            select(Purchase)
            .where(
                and_(
                    Purchase.user_address == user_address,
                    Purchase.is_active == True,  # noqa: E712
                )
            )
            .options(
                selectinload(Purchase.product),
            )
        )
        purchases = result.scalars().all()

        slugs: list[str] = []
        for purchase in purchases:
            product: Product = purchase.product
            if not product:
                continue
            if not getattr(product, "active", True):
                continue
            # Only include products that have backend adapters wired
            if not getattr(product, "has_adapter", False):
                continue
            slugs.append(product.slug)

        # De-duplicate and keep deterministic order
        return sorted(set(slugs))
    except Exception as e:
        logger.error(f"Failed to get installed tools for wallet {wallet_address}: {e}")
        return []


@router.get("/rag/stats")
async def get_rag_stats(
    wallet_address: str = Query(..., description="Business wallet address")
):
    """
    Get RAG collection statistics for a business

    Shows how much data has been indexed for this business

    Args:
        wallet_address: Business wallet address

    Returns:
        RAG collection stats
    """
    try:
        stats = await rag_service.get_collection_stats(wallet_address)

        return {
            "success": True,
            "wallet_address": wallet_address,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"Failed to get RAG stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag/index")
async def index_business_data(
    wallet_address: str,
    cid: str,
    data: Dict[str, Any],
    integration: str,
    data_type: str
):
    """
    Index business data into their RAG collection

    This endpoint is called after data is uploaded to Filecoin
    to make it searchable via AI queries

    Args:
        wallet_address: Business wallet address
        cid: Filecoin CID of the data
        data: Data to index
        integration: Integration name
        data_type: Type of data

    Returns:
        Indexing result
    """
    try:
        logger.info(
            f"Indexing data for business {wallet_address[:10]}...: "
            f"CID={cid}, integration={integration}"
        )

        # Index in business's Qdrant collection
        point_id = await rag_service.index_business_data(
            business_wallet=wallet_address,
            cid=cid,
            data=data,
            integration=integration,
            data_type=data_type
        )

        return {
            "success": True,
            "wallet_address": wallet_address,
            "cid": cid,
            "point_id": point_id,
            "message": "Data indexed successfully"
        }

    except Exception as e:
        logger.error(f"Failed to index data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def ai_health_check():
    """
    Check health of AI infrastructure

    Returns status of:
    - Together.ai / Ollama LLM service (based on configuration)
    - Qdrant vector database
    - Overall AI system health
    """
    try:
        ai_service = get_business_ai_service()
        health = await ai_service.health_check()

        # Add provider info
        health["configured_provider"] = get_llm_provider()

        return {
            "success": True,
            "health": health,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rag-health")
async def rag_health_check():
    """
    Check health of RAG (Qdrant) infrastructure

    Returns status of:
    - Qdrant vector database connection
    - Whether RAG is enabled or disabled
    - Number of collections if connected

    This endpoint is critical for diagnosing why AI queries
    don't return integration data.
    """
    try:
        if rag_service is None:
            return {
                "success": True,
                "status": "disabled",
                "reason": "Qdrant not configured - check QDRANT_URL and QDRANT_API_KEY environment variables",
                "rag_enabled": False,
                "collections": 0,
                "timestamp": datetime.now().isoformat(),
                "help": {
                    "message": "RAG queries will not return integration data until Qdrant is configured",
                    "required_env_vars": ["QDRANT_URL", "QDRANT_API_KEY"],
                    "setup_guide": "1. Create free account at cloud.qdrant.io, 2. Create cluster, 3. Add QDRANT_URL and QDRANT_API_KEY to Railway"
                }
            }

        # Try to get collections to verify connection
        collections = rag_service.qdrant.get_collections()
        collection_count = len(collections.collections)
        collection_names = [c.name for c in collections.collections]

        return {
            "success": True,
            "status": "healthy",
            "rag_enabled": True,
            "collections": collection_count,
            "collection_names": collection_names[:10],  # Limit to first 10 for readability
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"RAG health check failed: {e}")
        return {
            "success": False,
            "status": "error",
            "reason": str(e),
            "rag_enabled": False,
            "collections": 0,
            "timestamp": datetime.now().isoformat(),
            "help": {
                "message": "Qdrant connection failed - check URL and API key",
                "common_issues": [
                    "QDRANT_URL not set or incorrect",
                    "QDRANT_API_KEY not set or invalid",
                    "Qdrant service not running"
                ]
            }
        }


@router.get("/debug/pipeline")
async def debug_data_pipeline(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Debug endpoint to verify the entire data pipeline for a user.

    This endpoint is critical for troubleshooting why the AI Assistant
    might not be returning business-specific answers. It checks:

    1. Files stored in Pinata (Filecoin/IPFS)
    2. Documents indexed in Qdrant (RAG)
    3. Data availability per integration

    Use this when:
    - AI responses seem generic (not using business data)
    - User reports their data isn't showing up
    - After sync to verify data was properly indexed

    Args:
        wallet_address: User's wallet address

    Returns:
        Comprehensive pipeline status including files, collections, and sample data
    """
    result = {
        "wallet_address": wallet_address,
        "timestamp": datetime.now().isoformat(),
        "pinata": {
            "status": "unknown",
            "files": [],
            "file_count": 0,
            "integrations": []
        },
        "qdrant": {
            "status": "unknown",
            "collection_exists": False,
            "document_count": 0,
            "sample_query_results": 0,
            "embedding_model": rag_service.get_embedding_model() if rag_service else None
        },
        "summary": {
            "data_available": False,
            "issues": [],
            "recommendations": []
        }
    }

    # Check Pinata files
    try:
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            limit=50
        )
        integrations_found = set()

        file_list = []
        for f in files:
            metadata = f.get("metadata", {})
            integration = metadata.get("integration", "unknown")
            data_type = metadata.get("data_type", "unknown")
            integrations_found.add(integration)

            file_list.append({
                "cid": f.get("cid"),
                "integration": integration,
                "data_type": data_type,
                "timestamp": f.get("timestamp"),
                "size": f.get("size")
            })

        result["pinata"]["status"] = "healthy"
        result["pinata"]["files"] = file_list[:20]  # Limit to 20 for response size
        result["pinata"]["file_count"] = len(files)
        result["pinata"]["integrations"] = list(integrations_found)

        if len(files) == 0:
            result["summary"]["issues"].append("No files found in Pinata for this wallet")
            result["summary"]["recommendations"].append(
                "Connect an integration and sync data from the Marketplace page"
            )

    except Exception as e:
        result["pinata"]["status"] = "error"
        result["pinata"]["error"] = str(e)
        result["summary"]["issues"].append(f"Pinata query failed: {str(e)}")

    # Check Qdrant collection
    if rag_service is not None:
        try:
            stats = await rag_service.get_collection_stats(wallet_address)
            result["qdrant"]["status"] = "healthy"
            result["qdrant"]["collection_exists"] = stats.get("exists", False)
            result["qdrant"]["document_count"] = stats.get("count", 0)

            if stats.get("exists"):
                # Try a sample query to verify RAG is working
                sample_results = await rag_service.query_business_rag(
                    business_wallet=wallet_address,
                    query="summary of my business data",
                    limit=3,
                    score_threshold=0.3  # Lower threshold for diagnostic query
                )
                result["qdrant"]["sample_query_results"] = len(sample_results)

                if len(sample_results) == 0:
                    result["summary"]["issues"].append(
                        "Qdrant collection exists but sample query returned no results - likely EMBEDDING MODEL MISMATCH"
                    )
                    result["summary"]["issues"].append(
                        f"Current model: {rag_service.get_embedding_model()}. Documents indexed with old model need re-embedding."
                    )
                    result["summary"]["recommendations"].append(
                        f"Run force-reindex-all to re-embed all documents with current model: POST /api/v1/integrations/force-reindex-all?wallet_address={wallet_address}"
                    )
            else:
                result["summary"]["issues"].append(
                    "No Qdrant collection found for this wallet"
                )
                result["summary"]["recommendations"].append(
                    "Sync your connected integrations to index data for AI queries"
                )

        except Exception as e:
            result["qdrant"]["status"] = "error"
            result["qdrant"]["error"] = str(e)
            result["summary"]["issues"].append(f"Qdrant query failed: {str(e)}")
    else:
        result["qdrant"]["status"] = "disabled"
        result["summary"]["issues"].append("RAG service not configured (Qdrant unavailable)")
        result["summary"]["recommendations"].append(
            "Configure QDRANT_URL and QDRANT_API_KEY in Railway"
        )

    # Determine overall data availability
    pinata_ok = result["pinata"]["file_count"] > 0
    qdrant_ok = result["qdrant"]["document_count"] > 0

    result["summary"]["data_available"] = pinata_ok and qdrant_ok

    if pinata_ok and not qdrant_ok:
        result["summary"]["issues"].append(
            "Data in Pinata but not indexed in Qdrant - RAG queries won't work"
        )
        result["summary"]["recommendations"].append(
            "Re-sync your integrations to re-index data in Qdrant"
        )

    if not result["summary"]["issues"]:
        result["summary"]["recommendations"].append(
            "Pipeline looks healthy! AI Assistant should use your business data."
        )

    return result


# ==================== Suggested Prompts ====================

class SuggestedPrompt(BaseModel):
    """A suggested prompt based on connected integrations"""
    text: str
    category: str
    integration: str
    icon: str


class SuggestedPromptsResponse(BaseModel):
    """Response with suggested prompts"""
    prompts: List[SuggestedPrompt]
    integrations: List[str]


# Prompt templates per integration
INTEGRATION_PROMPTS = {
    "google": [
        {"text": "Summarize my recent emails about {topic}", "category": "email", "icon": "mail"},
        {"text": "What meetings do I have this week?", "category": "calendar", "icon": "calendar"},
        {"text": "Find documents related to {topic}", "category": "drive", "icon": "file"},
        {"text": "Who have I been emailing most frequently?", "category": "email", "icon": "users"},
        {"text": "What are the key action items from my recent emails?", "category": "email", "icon": "check"},
    ],
    "quickbooks": [
        {"text": "Show me overdue invoices", "category": "invoices", "icon": "alert"},
        {"text": "What's my total revenue this month?", "category": "invoices", "icon": "dollar"},
        {"text": "List my top customers by revenue", "category": "customers", "icon": "users"},
        {"text": "Summarize my expenses by category", "category": "expenses", "icon": "chart"},
        {"text": "Which invoices are unpaid?", "category": "invoices", "icon": "clock"},
    ],
    "salesforce": [
        {"text": "What deals are closing this month?", "category": "opportunities", "icon": "target"},
        {"text": "Show me my pipeline value", "category": "opportunities", "icon": "dollar"},
        {"text": "List my most recent leads", "category": "leads", "icon": "users"},
        {"text": "What accounts need follow-up?", "category": "accounts", "icon": "building"},
    ],
    "hubspot": [
        {"text": "Show me recent deal activity", "category": "deals", "icon": "activity"},
        {"text": "Who are my top contacts?", "category": "contacts", "icon": "users"},
        {"text": "What companies have I been working with?", "category": "companies", "icon": "building"},
    ],
    "microsoft": [
        {"text": "Summarize my Outlook inbox", "category": "mail", "icon": "mail"},
        {"text": "What's on my calendar today?", "category": "calendar", "icon": "calendar"},
        {"text": "Find files in OneDrive about {topic}", "category": "onedrive", "icon": "file"},
    ],
    "slack": [
        {"text": "Summarize recent Slack conversations", "category": "messages", "icon": "message"},
        {"text": "What files have been shared recently?", "category": "files", "icon": "file"},
    ],
}


@router.get("/suggested-prompts", response_model=SuggestedPromptsResponse)
async def get_suggested_prompts(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(6, description="Maximum number of prompts to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get suggested prompts based on user's connected integrations.

    Returns context-aware prompts that users can click to start a conversation.
    Only includes prompts for integrations the user has connected.

    Args:
        wallet_address: User's wallet address
        limit: Maximum prompts to return
        db: Database session

    Returns:
        List of suggested prompts with metadata
    """
    prompts = []
    connected_integrations = []

    try:
        # Get connected integrations from OAuthToken table
        tokens_result = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == wallet_address.lower(),
                    OAuthToken.is_active == True  # noqa: E712
                )
            )
        )
        tokens = tokens_result.scalars().all()

        for token in tokens:
            provider = token.provider.lower()
            connected_integrations.append(provider)

            # Get prompts for this integration
            if provider in INTEGRATION_PROMPTS:
                for prompt_template in INTEGRATION_PROMPTS[provider]:
                    prompts.append(SuggestedPrompt(
                        text=prompt_template["text"],
                        category=prompt_template["category"],
                        integration=provider,
                        icon=prompt_template["icon"]
                    ))

        # Shuffle and limit prompts for variety
        import random
        random.shuffle(prompts)
        prompts = prompts[:limit]

    except Exception as e:
        logger.error(f"Failed to get suggested prompts: {e}")

    return SuggestedPromptsResponse(
        prompts=prompts,
        integrations=connected_integrations
    )


# ==================== Live Email Helpers (OAuth-based, NOT stored in Pinata) ====================

async def fetch_live_gmail_emails(
    access_token: str,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Fetch recent Gmail emails via OAuth (ephemeral, not stored in Pinata).

    These emails are fetched live and used as context for AI queries,
    but are NOT indexed into Qdrant or stored in Filecoin.

    Args:
        access_token: Google OAuth access token
        limit: Maximum number of emails to fetch

    Returns:
        List of email summaries with id, subject, from, snippet
    """
    emails = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get list of recent messages
            list_resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"maxResults": limit, "labelIds": "INBOX"}
            )

            if list_resp.status_code != 200:
                logger.warning(f"Gmail list failed: {list_resp.status_code}")
                return []

            message_refs = list_resp.json().get("messages", [])

            # Fetch metadata for each message (limited to avoid slow API calls)
            for msg_ref in message_refs[:limit]:
                try:
                    msg_resp = await client.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}",
                        headers={"Authorization": f"Bearer {access_token}"},
                        params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]}
                    )

                    if msg_resp.status_code == 200:
                        msg_data = msg_resp.json()
                        headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}

                        emails.append({
                            "id": msg_ref["id"],
                            "subject": headers.get("Subject", "(No Subject)"),
                            "from": headers.get("From", "Unknown"),
                            "date": headers.get("Date", ""),
                            "snippet": msg_data.get("snippet", "")[:200]
                        })
                except Exception as e:
                    logger.warning(f"Failed to fetch Gmail message {msg_ref['id']}: {e}")

    except Exception as e:
        logger.error(f"Gmail fetch failed: {e}")

    return emails


async def fetch_live_outlook_emails(
    access_token: str,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Fetch recent Outlook emails via Microsoft Graph API (ephemeral, not stored).

    Args:
        access_token: Microsoft OAuth access token
        limit: Maximum number of emails to fetch

    Returns:
        List of email summaries with id, subject, from, snippet
    """
    emails = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                "https://graph.microsoft.com/v1.0/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "$top": limit,
                    "$select": "id,subject,from,receivedDateTime,bodyPreview",
                    "$orderby": "receivedDateTime desc"
                }
            )

            if resp.status_code != 200:
                logger.warning(f"Outlook fetch failed: {resp.status_code}")
                return []

            messages = resp.json().get("value", [])

            for msg in messages:
                from_info = msg.get("from", {}).get("emailAddress", {})
                emails.append({
                    "id": msg["id"],
                    "subject": msg.get("subject", "(No Subject)"),
                    "from": f"{from_info.get('name', '')} <{from_info.get('address', '')}>",
                    "date": msg.get("receivedDateTime", ""),
                    "snippet": msg.get("bodyPreview", "")[:200]
                })

    except Exception as e:
        logger.error(f"Outlook fetch failed: {e}")

    return emails


async def fetch_live_email_content(
    provider: str,
    email_id: str,
    access_token: str
) -> Optional[Dict[str, Any]]:
    """
    Fetch full content of a specific email for AI context.

    Args:
        provider: "google" or "microsoft"
        email_id: The email's unique ID
        access_token: OAuth access token

    Returns:
        Full email content including body
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if provider == "google":
                resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{email_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"format": "full"}
                )

                if resp.status_code == 200:
                    msg = resp.json()
                    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}

                    # Extract body (simplified - just get snippet for now)
                    body = msg.get("snippet", "")

                    # Try to get full body from parts
                    payload = msg.get("payload", {})
                    if "body" in payload and payload["body"].get("data"):
                        import base64
                        body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
                    elif "parts" in payload:
                        for part in payload["parts"]:
                            if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                                import base64
                                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                                break

                    return {
                        "id": email_id,
                        "subject": headers.get("Subject", "(No Subject)"),
                        "from": headers.get("From", "Unknown"),
                        "to": headers.get("To", ""),
                        "date": headers.get("Date", ""),
                        "body": body[:5000]  # Limit body size for context
                    }

            elif provider == "microsoft":
                resp = await client.get(
                    f"https://graph.microsoft.com/v1.0/me/messages/{email_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"$select": "id,subject,from,toRecipients,receivedDateTime,body"}
                )

                if resp.status_code == 200:
                    msg = resp.json()
                    from_info = msg.get("from", {}).get("emailAddress", {})

                    return {
                        "id": email_id,
                        "subject": msg.get("subject", "(No Subject)"),
                        "from": f"{from_info.get('name', '')} <{from_info.get('address', '')}>",
                        "to": ", ".join([r["emailAddress"]["address"] for r in msg.get("toRecipients", [])]),
                        "date": msg.get("receivedDateTime", ""),
                        "body": msg.get("body", {}).get("content", "")[:5000]
                    }

    except Exception as e:
        logger.error(f"Failed to fetch email content: {e}")

    return None


# ==================== Context Selection ====================

class ContextItem(BaseModel):
    """A selectable context item for AI queries"""
    id: str  # Unique identifier (CID for indexed, API ID for live)
    type: str  # Integration type (google, quickbooks, etc.)
    category: str  # Data category (drive, gmail, invoices, etc.)
    title: str  # Display title
    description: Optional[str] = None  # Brief description
    source: str = "indexed"  # "indexed" or "live"
    metadata: Dict[str, Any] = {}


class ContextItemsResponse(BaseModel):
    """Response with available context items"""
    items: List[ContextItem]
    total: int
    integrations: List[str]


@router.get("/context/items", response_model=ContextItemsResponse)
async def get_context_items(
    wallet_address: str = Query(..., description="User's wallet address"),
    integration: Optional[str] = Query(None, description="Filter by integration"),
    category: Optional[str] = Query(None, description="Filter by category (drive, gmail, invoices, etc.)"),
    search: Optional[str] = Query(None, description="Search query to filter items"),
    limit: int = Query(50, description="Maximum number of items to return"),
    include_live: bool = Query(True, description="Include live emails from Gmail/Outlook"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get available context items for selection.

    Like Cursor AI's context picker, this returns items the user can select
    to include as context for their AI query.

    Items are returned from:
    1. Indexed data (Pinata/Qdrant) - Drive files, Contacts, Invoices, etc.
    2. Live API (future) - Recent Gmail emails, Calendar events

    Args:
        wallet_address: User's wallet address
        integration: Optional filter by integration (google, quickbooks, etc.)
        category: Optional filter by category (drive, gmail, invoices, etc.)
        search: Optional search query
        limit: Maximum items to return

    Returns:
        List of selectable context items grouped by integration
    """
    items: List[ContextItem] = []
    integrations_found: set = set()

    # Get indexed items from Qdrant (primary source - has all indexed data)
    qdrant_failed = False
    try:
        if rag_service:
            qdrant_items = await rag_service.get_context_items(
                business_wallet=wallet_address,
                integration=integration,
                data_type=category,
                limit=limit
            )

            for qdrant_item in qdrant_items:
                # Apply search filter if provided
                if search:
                    search_lower = search.lower()
                    if (search_lower not in qdrant_item["title"].lower() and
                        search_lower not in qdrant_item["category"].lower() and
                        search_lower not in qdrant_item.get("description", "").lower()):
                        continue

                items.append(ContextItem(
                    id=qdrant_item["id"],
                    type=qdrant_item["type"],
                    category=qdrant_item["category"],
                    title=qdrant_item["title"],
                    description=qdrant_item.get("description", ""),
                    source=qdrant_item["source"],
                    metadata=qdrant_item["metadata"]
                ))
                integrations_found.add(qdrant_item["type"])

            logger.info(f"Retrieved {len(items)} indexed items from Qdrant for {wallet_address[:10]}...")
        else:
            logger.warning("RAG service not available, will use Pinata fallback")
            qdrant_failed = True

    except Exception as e:
        logger.error(f"Failed to get indexed items from Qdrant: {e}, using Pinata fallback")
        qdrant_failed = True

    # CRITICAL FIX (Jan 5, 2026): ALWAYS try Pinata fallback when Qdrant fails or returns empty
    # This ensures context picker shows data even when Qdrant indexing is incomplete
    if not items or qdrant_failed:
        try:
            files = await filecoin_service.list_customer_files(
                customer_wallet=wallet_address,
                integration=integration,
                data_type=category,
                limit=limit * 2  # Get more to allow for filtering
            )

            for f in files:
                metadata = f.get("metadata", {})
                file_integration = metadata.get("integration", "unknown")
                file_category = metadata.get("data_type", "unknown")
                integrations_found.add(file_integration)

                # Try to get a meaningful title
                cid = f.get("cid", "")
                title = f"{file_category.title()} data from {file_integration}"

                # For Drive files, try to get better metadata
                if file_category == "drive":
                    title = f"Google Drive files ({metadata.get('chunk_id', 'latest')})"
                elif file_category == "contacts":
                    title = f"Google Contacts"
                elif file_category == "invoices":
                    title = f"QuickBooks Invoices"
                elif file_category == "customers":
                    title = f"QuickBooks Customers"
                elif file_category == "expenses":
                    title = f"QuickBooks Expenses"

                # Apply search filter if provided
                if search:
                    search_lower = search.lower()
                    if search_lower not in title.lower() and search_lower not in file_category.lower():
                        continue

                items.append(ContextItem(
                    id=cid,
                    type=file_integration,
                    category=file_category,
                    title=title,
                    description=f"Last synced: {f.get('timestamp', 'unknown')}",
                    source="indexed",
                    metadata={
                        "size": f.get("size"),
                        "chunk_id": metadata.get("chunk_id"),
                        "timestamp": f.get("timestamp")
                    }
                ))

                if len(items) >= limit:
                    break

            logger.info(f"Retrieved {len(items)} indexed items from Pinata (fallback) for {wallet_address[:10]}...")

        except Exception as e:
            logger.error(f"Failed to get indexed items from Pinata: {e}")

    # Add live emails from Gmail/Outlook (ephemeral, not stored in Pinata)
    if include_live and (integration is None or integration in ["google", "microsoft"]):
        # Check for Google OAuth token
        if integration is None or integration == "google":
            try:
                google_token = await db.execute(
                    select(OAuthToken).where(
                        and_(
                            OAuthToken.user_address == wallet_address.lower(),
                            OAuthToken.provider == "google",
                            OAuthToken.is_active == True  # noqa: E712
                        )
                    )
                )
                google_token = google_token.scalar_one_or_none()

                # YELLOW-001 FIX: Use auth context to access tokens securely
                if google_token:
                    with OAuthToken.auth_context(wallet_address.lower()):
                        if google_token.access_token:
                            # Fetch live Gmail emails
                            gmail_emails = await fetch_live_gmail_emails(
                                access_token=google_token.access_token,
                                limit=min(10, limit)  # Limit live emails to avoid slow API
                            )

                            for email in gmail_emails:
                                # Apply search filter if provided
                                if search:
                                    search_lower = search.lower()
                                    if (search_lower not in email["subject"].lower() and
                                        search_lower not in email["from"].lower() and
                                        search_lower not in email.get("snippet", "").lower()):
                                        continue

                                items.append(ContextItem(
                                    id=f"live:google:gmail:{email['id']}",
                                    type="google",
                                    category="gmail",
                                    title=email["subject"],
                                    description=f"From: {email['from'][:50]}",
                                    source="live",
                                    metadata={
                                        "from": email["from"],
                                        "date": email["date"],
                                        "snippet": email.get("snippet", "")
                                    }
                                ))
                                integrations_found.add("google")

            except Exception as e:
                logger.warning(f"Failed to fetch live Gmail emails: {e}")

        # Check for Microsoft OAuth token
        if integration is None or integration == "microsoft":
            try:
                ms_token = await db.execute(
                    select(OAuthToken).where(
                        and_(
                            OAuthToken.user_address == wallet_address.lower(),
                            OAuthToken.provider == "microsoft",
                            OAuthToken.is_active == True  # noqa: E712
                        )
                    )
                )
                ms_token = ms_token.scalar_one_or_none()

                # YELLOW-001 FIX: Use auth context to access tokens securely
                if ms_token:
                    with OAuthToken.auth_context(wallet_address.lower()):
                        if ms_token.access_token:
                            # Fetch live Outlook emails
                            outlook_emails = await fetch_live_outlook_emails(
                                access_token=ms_token.access_token,
                                limit=min(10, limit)
                            )

                            for email in outlook_emails:
                                # Apply search filter if provided
                                if search:
                                    search_lower = search.lower()
                                    if (search_lower not in email["subject"].lower() and
                                        search_lower not in email["from"].lower() and
                                        search_lower not in email.get("snippet", "").lower()):
                                        continue

                                items.append(ContextItem(
                                    id=f"live:microsoft:outlook:{email['id']}",
                                    type="microsoft",
                                    category="outlook",
                                    title=email["subject"],
                                    description=f"From: {email['from'][:50]}",
                                    source="live",
                                    metadata={
                                        "from": email["from"],
                                        "date": email["date"],
                                        "snippet": email.get("snippet", "")
                                    }
                                ))
                                integrations_found.add("microsoft")

            except Exception as e:
                logger.warning(f"Failed to fetch live Outlook emails: {e}")

    return ContextItemsResponse(
        items=items[:limit],
        total=len(items),
        integrations=list(integrations_found)
    )


@router.delete("/context/clear-all")
async def clear_all_rag_data(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Clear ALL RAG data for a wallet address.

    This endpoint deletes the entire Qdrant collection for the wallet,
    removing all indexed data from integrations. This is useful for:
    - Testing/development cleanup
    - User-requested data deletion
    - Resetting RAG index after token expiration

    WARNING: This is a destructive operation and cannot be undone.
    Only Qdrant data is deleted - Pinata files remain encrypted in storage.

    Args:
        wallet_address: User's wallet address

    Returns:
        Success status and count of items deleted
    """
    try:
        if not rag_service:
            raise HTTPException(
                status_code=503,
                detail="RAG service not available"
            )

        # Get current count before deletion
        stats = await rag_service.get_collection_stats(wallet_address)
        items_count = stats.get("count", 0)

        # Delete the entire collection
        await rag_service.delete_business_collection(wallet_address)

        logger.warning(
            f"Deleted entire RAG collection for wallet {wallet_address[:10]}... "
            f"({items_count} items removed)"
        )

        return {
            "success": True,
            "items_deleted": items_count,
            "message": f"Successfully deleted {items_count} RAG items for wallet {wallet_address[:10]}..."
        }

    except Exception as e:
        logger.error(f"Failed to clear RAG data for {wallet_address}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear RAG data: {str(e)}"
        )


@router.post("/context/fetch")
async def fetch_context_by_ids(
    wallet_address: str = Query(..., description="User's wallet address"),
    item_ids: List[str] = Query(..., description="List of context item IDs to fetch"),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch full content for selected context items.

    Given a list of item IDs, retrieve the full content to be used as AI context.
    Supports both:
    - Indexed items (CIDs) - Retrieved and decrypted from Pinata
    - Live items (live:provider:category:id) - Fetched via OAuth API

    Args:
        wallet_address: User's wallet address
        item_ids: List of item IDs (CIDs or live:* format)
        db: Database session for OAuth token lookup

    Returns:
        Full content for each item, ready for AI context
    """
    context_data = []

    # Cache OAuth tokens to avoid repeated DB queries
    oauth_tokens = {}

    for item_id in item_ids:
        try:
            # Check if this is a live item (format: live:provider:category:id)
            if item_id.startswith("live:"):
                parts = item_id.split(":", 3)  # Split into max 4 parts
                if len(parts) < 4:
                    logger.warning(f"Invalid live item ID format: {item_id}")
                    context_data.append({
                        "id": item_id,
                        "data": None,
                        "success": False,
                        "error": "Invalid live item ID format"
                    })
                    continue

                _, provider, category, email_id = parts

                # Get OAuth token (cached)
                if provider not in oauth_tokens:
                    token_result = await db.execute(
                        select(OAuthToken).where(
                            and_(
                                OAuthToken.user_address == wallet_address.lower(),
                                OAuthToken.provider == provider,
                                OAuthToken.is_active == True  # noqa: E712
                            )
                        )
                    )
                    oauth_tokens[provider] = token_result.scalar_one_or_none()

                token = oauth_tokens.get(provider)
                # YELLOW-001 FIX: Use auth context to access tokens securely
                with OAuthToken.auth_context(wallet_address.lower()):
                    if not token or not token.access_token:
                        context_data.append({
                            "id": item_id,
                            "data": None,
                            "success": False,
                            "error": f"No OAuth token for {provider}"
                        })
                        continue

                    # Fetch live email content
                    email_content = await fetch_live_email_content(
                        provider=provider,
                        email_id=email_id,
                        access_token=token.access_token
                    )

                    if email_content:
                        context_data.append({
                            "id": item_id,
                            "data": {
                                "type": "email",
                                "provider": provider,
                                "category": category,
                                "content": email_content
                            },
                            "source": "live",
                            "success": True
                        })
                    else:
                        context_data.append({
                            "id": item_id,
                            "data": None,
                            "success": False,
                            "error": "Failed to fetch email content"
                        })

            else:
                # This is an indexed item (CID) - retrieve from Pinata
                encrypted = await filecoin_service.retrieve_data(item_id)
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=wallet_address
                )

                if isinstance(decrypted, str):
                    data = json.loads(decrypted)
                else:
                    data = decrypted

                context_data.append({
                    "id": item_id,
                    "data": data,
                    "source": "indexed",
                    "success": True
                })

        except Exception as e:
            logger.warning(f"Failed to fetch context for {item_id}: {e}")
            context_data.append({
                "id": item_id,
                "data": None,
                "success": False,
                "error": str(e)
            })

    return {
        "items": context_data,
        "fetched": len([c for c in context_data if c["success"]]),
        "failed": len([c for c in context_data if not c["success"]])
    }


# ==================== General LLM Chat (Works Without Integrations) ====================

@router.post("/chat/general", response_model=GeneralChatResponse)
async def general_chat(request: GeneralChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Smart LLM chat that automatically uses business data when available

    This endpoint provides an AI assistant that:
    - Uses RAG context from connected integrations when available
    - Falls back to general LLM mode when no integrations are connected
    - Personalizes responses based on industry and company profile

    The AI automatically includes relevant business data context without
    the user needing to switch modes.

    Args:
        request: Chat request with message
        db: Database session for fetching user context

    Returns:
        AI-generated response with business context when available
    """
    try:
        logger.info(
            f"General chat request from {request.wallet_address}: "
            f"'{request.message[:100]}...'"
        )

        # Fetch user's industry context for personalized responses
        user_context = await get_user_context(request.wallet_address, db)
        industry = user_context.get("industry")
        company_name = user_context.get("company_name")

        # Fetch project context if project_id is provided
        project_instructions = ""
        project_files_context = ""
        project_name = None

        if request.project_id:
            try:
                # Get project with files
                project_result = await db.execute(
                    select(Project)
                    .where(
                        and_(
                            Project.id == request.project_id,
                            Project.wallet_address == request.wallet_address.lower()
                        )
                    )
                    .options(selectinload(Project.files))
                )
                project = project_result.scalar_one_or_none()

                if project:
                    project_name = project.name
                    logger.info(f"Using project '{project_name}' context for chat")

                    # Get custom instructions
                    if project.custom_instructions:
                        project_instructions = project.custom_instructions
                        logger.info(f"Loaded custom instructions for project {project.id}")

                    # Get pinned files content
                    if project.files:
                        file_contents = []
                        for pf in project.files:
                            try:
                                if pf.cid:
                                    # Retrieve file content from Pinata
                                    encrypted = await filecoin_service.retrieve_data(pf.cid)
                                    decrypted = await encryption_service.decrypt_with_wallet(
                                        encrypted_data=encrypted,
                                        customer_wallet=request.wallet_address
                                    )

                                    if isinstance(decrypted, str):
                                        content = decrypted[:2000]  # Limit per file
                                    elif isinstance(decrypted, dict):
                                        content = json.dumps(decrypted, indent=2, default=str)[:2000]
                                    else:
                                        content = str(decrypted)[:2000]

                                    file_contents.append(
                                        f"--- Pinned File: {pf.file_name} ---\n{content}"
                                    )
                                elif pf.content_preview:
                                    # Use content preview if no CID
                                    file_contents.append(
                                        f"--- Pinned File: {pf.file_name} ---\n{pf.content_preview}"
                                    )
                            except Exception as e:
                                logger.warning(f"Failed to load project file {pf.file_name}: {e}")

                        if file_contents:
                            project_files_context = "\n\n".join(file_contents)
                            logger.info(f"Loaded {len(file_contents)} pinned files for project")
                else:
                    logger.warning(f"Project {request.project_id} not found for wallet {request.wallet_address[:10]}...")
            except Exception as e:
                logger.warning(f"Failed to load project context: {e}")

        # Get RAG context - either from selected items or auto-query
        rag_context = ""
        rag_sources = []
        context_used = False

        # Context building settings
        MAX_CHARS_PER_ENTRY = 2000
        MAX_TOTAL_CHARS = 15000

        # Check if user selected specific context items
        if request.selected_context_ids and len(request.selected_context_ids) > 0:
            # User selected specific items - fetch from Pinata (indexed) or OAuth API (live)
            logger.info(
                f"Using {len(request.selected_context_ids)} selected context items "
                f"for {request.wallet_address[:10]}..."
            )

            context_parts = []
            total_chars = 0

            # Cache OAuth tokens for live items
            oauth_tokens = {}

            for idx, item_id in enumerate(request.selected_context_ids, 1):
                if total_chars >= MAX_TOTAL_CHARS:
                    logger.info(f"Selected context limit reached at {total_chars} chars")
                    break

                try:
                    # Check if this is a live item (format: live:provider:category:id)
                    if item_id.startswith("live:"):
                        parts = item_id.split(":", 3)
                        if len(parts) < 4:
                            logger.warning(f"Invalid live item ID format: {item_id}")
                            continue

                        _, provider, category, email_id = parts

                        # Get OAuth token (cached)
                        if provider not in oauth_tokens:
                            token_result = await db.execute(
                                select(OAuthToken).where(
                                    and_(
                                        OAuthToken.user_address == request.wallet_address.lower(),
                                        OAuthToken.provider == provider,
                                        OAuthToken.is_active == True  # noqa: E712
                                    )
                                )
                            )
                            oauth_tokens[provider] = token_result.scalar_one_or_none()

                        token = oauth_tokens.get(provider)
                        # YELLOW-001 FIX: Use auth context to access tokens securely
                        with OAuthToken.auth_context(request.wallet_address.lower()):
                            if not token or not token.access_token:
                                logger.warning(f"No OAuth token for {provider}")
                                continue

                            # Fetch live email content
                            email_content = await fetch_live_email_content(
                                provider=provider,
                                email_id=email_id,
                                access_token=token.access_token
                            )

                            if email_content:
                                # Format email for context
                                email_str = f"""Subject: {email_content.get('subject', 'No Subject')}
From: {email_content.get('from', 'Unknown')}
To: {email_content.get('to', '')}
Date: {email_content.get('date', '')}

{email_content.get('body', '')[:MAX_CHARS_PER_ENTRY]}"""

                                context_entry = f"""
--- Selected Email (from {provider} - {category}) ---
{email_str}
"""
                                context_parts.append(context_entry.strip())
                                rag_sources.append(item_id)
                                total_chars += len(context_entry)
                                context_used = True

                    else:
                        # This is an indexed item (CID) - retrieve from Pinata
                        encrypted = await filecoin_service.retrieve_data(item_id)
                        decrypted = await encryption_service.decrypt_with_wallet(
                            encrypted_data=encrypted,
                            customer_wallet=request.wallet_address
                        )

                        if isinstance(decrypted, str):
                            data = json.loads(decrypted)
                        else:
                            data = decrypted

                        # Extract metadata
                        integration = data.get("integration", "unknown")
                        data_type = data.get("data_type", "unknown")

                        # Truncate data if too large
                        data_str = json.dumps(data, indent=2, default=str)
                        if len(data_str) > MAX_CHARS_PER_ENTRY:
                            data_str = data_str[:MAX_CHARS_PER_ENTRY] + "\n... [truncated]"

                        context_entry = f"""
--- Selected Context {idx} (from {integration} - {data_type}) ---
{data_str}
"""
                        context_parts.append(context_entry.strip())
                        rag_sources.append(item_id)
                        total_chars += len(context_entry)
                        context_used = True

                except Exception as e:
                    logger.warning(f"Failed to fetch selected context {item_id}: {e}")

            rag_context = "\n\n".join(context_parts)

        elif rag_service is not None:
            # Auto-query Qdrant for relevant business data
            try:
                rag_results = await rag_service.query_business_rag(
                    business_wallet=request.wallet_address,
                    query=request.message,
                    limit=5  # Get top 5 relevant documents
                )

                if rag_results:
                    context_used = True
                    context_parts = []
                    total_chars = 0

                    for idx, result in enumerate(rag_results, 1):
                        if total_chars >= MAX_TOTAL_CHARS:
                            logger.info(f"RAG context limit reached at {total_chars} chars")
                            break

                        data = result.get("data", {})
                        cid = result.get("cid", "")
                        integration = result.get("integration", "unknown")
                        data_type = result.get("data_type", "unknown")

                        # Truncate data if too large
                        data_str = json.dumps(data, indent=2, default=str)
                        if len(data_str) > MAX_CHARS_PER_ENTRY:
                            data_str = data_str[:MAX_CHARS_PER_ENTRY] + "\n... [truncated]"

                        context_entry = f"""
--- Business Data Source {idx} (from {integration} - {data_type}) ---
{data_str}
"""
                        context_parts.append(context_entry.strip())
                        if cid:
                            rag_sources.append(cid)
                        total_chars += len(context_entry)

                    rag_context = "\n\n".join(context_parts)
                    logger.info(
                        f"RAG context built for {request.wallet_address[:10]}...: "
                        f"{len(rag_results)} sources, {total_chars} chars"
                    )

            except Exception as e:
                logger.warning(f"RAG query failed, continuing without context: {e}")
                # Continue without RAG context - don't fail the request

        # Combine all context: project files + RAG sources
        combined_context_parts = []

        # Add project files context first (highest priority)
        if project_files_context:
            combined_context_parts.append(
                f"=== PROJECT PINNED FILES ===\n{project_files_context}"
            )
            context_used = True

        # Add RAG context
        if rag_context:
            combined_context_parts.append(
                f"=== BUSINESS DATA CONTEXT ===\n{rag_context}"
            )

        combined_context = "\n\n".join(combined_context_parts)

        # Add project instructions to the prompt if available
        enhanced_prompt = request.message
        if project_instructions:
            enhanced_prompt = f"""[PROJECT INSTRUCTIONS]
{project_instructions}

[USER MESSAGE]
{request.message}"""
            logger.info(f"Enhanced prompt with project instructions")

        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Use Together.ai with industry context, project context, AND RAG context
            response = await together_service.query(
                prompt=enhanced_prompt,
                context=combined_context,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                industry=industry,
                company_name=company_name
            )
            model_used = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")
        else:
            # Fallback to Ollama
            from app.services.ollama_service import OllamaService
            ollama_service = OllamaService()
            response = await ollama_service.query(
                prompt=enhanced_prompt
            )
            model_used = os.getenv("OLLAMA_MODEL", "mistral")
            provider = "ollama"

        # Determine actual mode based on context usage
        actual_mode = "project" if request.project_id else ("rag" if context_used else "general")

        return GeneralChatResponse(
            response=response,
            conversation_id=request.conversation_id or f"general-{datetime.now().timestamp()}",
            mode=actual_mode,
            provider=provider,
            model=model_used,
            rag_sources=rag_sources,
            context_used=context_used,
            metadata={
                "wallet_address": request.wallet_address,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "sources_count": len(rag_sources),
                "context_chars": len(combined_context),
                "project_id": request.project_id,
                "project_name": project_name,
                "has_project_instructions": bool(project_instructions),
                "timestamp": datetime.now().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"General chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Document Analysis ====================

@router.post("/analyze/document", response_model=DocumentAnalysisResponse)
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Analyze a document with AI

    This endpoint provides document analysis capabilities similar to Gemini:
    - summary: Executive summary of the document
    - key_points: Extract key points in bullet format
    - sentiment: Analyze sentiment and tone
    - extraction: Extract data points, numbers, dates, names
    - action_items: Identify action items and next steps

    Args:
        request: Document analysis request

    Returns:
        Analysis results
    """
    try:
        logger.info(
            f"Document analysis request from {request.wallet_address}: "
            f"type={request.analysis_type}, length={len(request.document_content)}"
        )

        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Use Together.ai document analysis
            result = await together_business_service.analyze_document(
                business_wallet=request.wallet_address,
                document_content=request.document_content,
                analysis_type=request.analysis_type
            )
        else:
            # Fallback to Ollama-based analysis
            analysis_prompts = {
                "summary": "Provide a concise executive summary of this document.",
                "key_points": "Extract and list the key points from this document.",
                "sentiment": "Analyze the sentiment and tone of this document.",
                "extraction": "Extract all important data points from this document.",
                "action_items": "Identify any action items mentioned in this document."
            }

            from app.services.ollama_service import OllamaService
            ollama_service = OllamaService()

            prompt = f"{analysis_prompts.get(request.analysis_type, analysis_prompts['summary'])}\n\nDocument:\n{request.document_content}"
            response = await ollama_service.query(prompt=prompt)

            result = {
                "analysis": response,
                "analysis_type": request.analysis_type,
                "document_length": len(request.document_content),
                "timestamp": datetime.now().isoformat()
            }

        return DocumentAnalysisResponse(
            analysis=result["analysis"],
            analysis_type=result["analysis_type"],
            document_length=result["document_length"],
            timestamp=result["timestamp"],
            metadata={
                "wallet_address": request.wallet_address,
                "provider": provider,
                "model": os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo") if provider == "together" else os.getenv("OLLAMA_MODEL", "mistral")
            }
        )

    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== File Upload & PDF Extraction ====================

class FileUploadResponse(BaseModel):
    """File upload response with extracted content"""
    success: bool
    filename: str
    content: str
    content_type: str
    file_size: int
    extraction_method: str
    metadata: Dict[str, Any]


@router.post("/upload/document", response_model=FileUploadResponse)
async def upload_document_for_analysis(
    file: UploadFile = File(...),
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Upload a document file and extract its text content for AI analysis.

    Supports:
    - PDF files (.pdf) - extracts text using PyMuPDF
    - Text files (.txt, .md) - reads directly
    - CSV files (.csv) - reads as text
    - Word documents (.docx) - extracts text using python-docx

    Args:
        file: The file to upload
        wallet_address: User's wallet address

    Returns:
        Extracted text content ready for analysis
    """
    try:
        logger.info(
            f"Document upload from {wallet_address[:10]}...: "
            f"filename={file.filename}, content_type={file.content_type}"
        )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Check file size (max 10MB)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")

        # Determine file type and extract text
        filename = file.filename or "document"
        file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        extracted_text = ""
        extraction_method = "direct"

        if file_ext == "pdf" or file.content_type == "application/pdf":
            # Extract text from PDF
            extraction_method = "pdf_extraction"
            try:
                import io
                # Try PyMuPDF (fitz) first
                try:
                    import fitz  # PyMuPDF
                    pdf_doc = fitz.open(stream=file_content, filetype="pdf")
                    text_parts = []
                    for page_num, page in enumerate(pdf_doc):
                        page_text = page.get_text()
                        if page_text.strip():
                            text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    extracted_text = "\n\n".join(text_parts)
                    extraction_method = "pymupdf"
                    logger.info(f"PDF extracted with PyMuPDF: {len(extracted_text)} chars, {len(pdf_doc)} pages")
                except ImportError:
                    # Fallback to pdfplumber
                    try:
                        import pdfplumber
                        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                            text_parts = []
                            for page_num, page in enumerate(pdf.pages):
                                page_text = page.extract_text() or ""
                                if page_text.strip():
                                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                            extracted_text = "\n\n".join(text_parts)
                            extraction_method = "pdfplumber"
                            logger.info(f"PDF extracted with pdfplumber: {len(extracted_text)} chars")
                    except ImportError:
                        # Basic fallback - indicate PDF needs processing
                        logger.warning("No PDF library available, returning placeholder")
                        extracted_text = f"[PDF Document: {filename}]\n\nThe document contains {file_size} bytes. PDF text extraction requires PyMuPDF or pdfplumber library to be installed."
                        extraction_method = "placeholder"

                if not extracted_text.strip():
                    extracted_text = f"[PDF Document: {filename}]\n\nThis PDF appears to contain images or scanned content that requires OCR to extract text. The document is {file_size} bytes."
                    extraction_method = "ocr_required"

            except Exception as e:
                logger.error(f"PDF extraction failed: {e}")
                extracted_text = f"[PDF Document: {filename}]\n\nFailed to extract text from PDF: {str(e)}"
                extraction_method = "error"

        elif file_ext == "docx" or file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # Extract text from Word document
            extraction_method = "docx_extraction"
            try:
                import io
                from docx import Document
                doc = Document(io.BytesIO(file_content))
                paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
                extracted_text = "\n\n".join(paragraphs)
                logger.info(f"DOCX extracted: {len(extracted_text)} chars, {len(paragraphs)} paragraphs")
            except ImportError:
                extracted_text = f"[Word Document: {filename}]\n\nWord document extraction requires python-docx library to be installed."
                extraction_method = "placeholder"
            except Exception as e:
                logger.error(f"DOCX extraction failed: {e}")
                extracted_text = f"[Word Document: {filename}]\n\nFailed to extract text: {str(e)}"
                extraction_method = "error"

        elif file_ext in ["txt", "md", "csv", "json", "xml", "html"]:
            # Read text files directly
            try:
                extracted_text = file_content.decode("utf-8")
            except UnicodeDecodeError:
                extracted_text = file_content.decode("latin-1")
            extraction_method = "text_read"
            logger.info(f"Text file read: {len(extracted_text)} chars")

        else:
            # Unknown file type
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Supported: pdf, docx, txt, md, csv, json, xml, html"
            )

        return FileUploadResponse(
            success=True,
            filename=filename,
            content=extracted_text,
            content_type=file.content_type or "unknown",
            file_size=file_size,
            extraction_method=extraction_method,
            metadata={
                "wallet_address": wallet_address,
                "original_filename": filename,
                "char_count": len(extracted_text),
                "timestamp": datetime.now().isoformat()
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Deep Research Mode ====================

@router.post("/research", response_model=ResearchQueryResponse)
async def deep_research(request: ResearchQueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Deep research mode for complex business intelligence queries

    This endpoint provides comprehensive analysis similar to Gemini's Deep Research:
    - Analyzes business data thoroughly
    - Identifies patterns, trends, and anomalies
    - Synthesizes information from multiple sources
    - Provides actionable recommendations
    - Executive-level analysis for decision-making
    - Industry-specific expertise based on user's business profile

    If integrations are connected, uses business-specific data.
    If no integrations, provides general research and analysis.

    Args:
        request: Research query request
        db: Database session for fetching user context

    Returns:
        Comprehensive research analysis with industry expertise
    """
    try:
        logger.info(
            f"Deep research request from {request.wallet_address}: "
            f"'{request.query[:100]}...' depth={request.depth}"
        )

        # Fetch user's industry context for personalized research
        user_context = await get_user_context(request.wallet_address, db)
        industry = user_context.get("industry")
        company_name = user_context.get("company_name")

        # MVP: Use Together.ai exclusively
        if not os.getenv("TOGETHER_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="AI service not configured. TOGETHER_API_KEY is required."
            )

        # Map depth to context items
        depth_mapping = {
            "quick": 3,
            "standard": 5,
            "comprehensive": 10
        }
        max_context = depth_mapping.get(request.depth, 5)

        # Query with research mode and industry context using Together.ai
        result = await together_business_service.query_business_ai(
            business_wallet=request.wallet_address,
            user_query=request.query,
            integration=request.integration,
            data_type=request.data_type,
            max_context_items=max_context,
            mode="research",
            industry=industry,
            company_name=company_name
        )

        return ResearchQueryResponse(
            analysis=result["answer"],
            sources=result.get("sources", []),
            context_used=result.get("context_used", False),
            mode="research",
            depth=request.depth,
            metadata={
                "wallet_address": request.wallet_address,
                "integration": request.integration,
                "data_type": request.data_type,
                "provider": "together",
                "timestamp": datetime.now().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Deep research failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Web Search Mode ====================

@router.post("/search", response_model=WebSearchResponse)
async def web_search_query(request: WebSearchRequest):
    """
    AI query with web search for real-time internet information

    This endpoint provides AI responses powered by live web search results.
    Perfect for questions about:
    - Current events and news
    - Market trends and financial data
    - Regulations and compliance updates
    - Industry benchmarks and statistics
    - Any information that requires up-to-date sources

    Args:
        request: Web search query request

    Returns:
        AI response with web sources
    """
    try:
        logger.info(
            f"Web search request from {request.wallet_address}: "
            f"'{request.query[:100]}...'"
        )

        # Check if web search is available
        if not web_search_service.is_available():
            raise HTTPException(
                status_code=503,
                detail="Web search is not configured. Please add TAVILY_API_KEY or SERPER_API_KEY to enable web search."
            )

        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Use Together.ai with web search
            result = await together_business_service.web_search_query(
                business_wallet=request.wallet_address,
                user_query=request.query,
                search_query=request.search_query,
                max_search_results=request.max_results
            )
        else:
            # Fallback: Direct web search without LLM enhancement
            search_result = await web_search_service.search(
                request.search_query or request.query,
                max_results=request.max_results
            )

            if not search_result["success"]:
                raise HTTPException(status_code=500, detail=search_result.get("error", "Web search failed"))

            # Build simple response from search results
            answer_parts = []
            if search_result.get("answer"):
                answer_parts.append(search_result["answer"])
            for r in search_result.get("results", [])[:3]:
                answer_parts.append(f"- {r['title']}: {r['content'][:200]}")

            result = {
                "answer": "\n\n".join(answer_parts) or "No relevant results found.",
                "mode": "web_search",
                "search_query": request.search_query or request.query,
                "sources": [{"title": r["title"], "url": r["url"]} for r in search_result.get("results", [])],
                "web_search_provider": search_result.get("provider"),
                "timestamp": datetime.now().isoformat()
            }

        return WebSearchResponse(
            answer=result["answer"],
            mode="web_search",
            search_query=result.get("search_query", request.query),
            sources=result.get("sources", []),
            provider=result.get("web_search_provider"),
            metadata={
                "wallet_address": request.wallet_address,
                "llm_provider": provider,
                "timestamp": datetime.now().isoformat()
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Web search query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/combined", response_model=CombinedQueryResponse)
async def combined_query(request: CombinedQueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Combined AI query with both RAG and Web Search

    This is the most powerful query mode - combines:
    1. Business-specific RAG data (from connected integrations)
    2. Real-time web search results (for external information)
    3. Industry-specific expertise based on user's business profile

    Use this for questions that need both your business data AND
    external context, like:
    - "How do my sales compare to industry benchmarks?"
    - "What regulations affect my overdue invoices?"
    - "How are my competitors pricing similar products?"

    Args:
        request: Combined query request
        db: Database session for fetching user context

    Returns:
        AI response with both RAG and web sources, personalized for industry
    """
    try:
        logger.info(
            f"Combined query from {request.wallet_address}: "
            f"'{request.query[:100]}...' (web_search={request.enable_web_search})"
        )

        # Fetch user's industry context for personalized responses
        user_context = await get_user_context(request.wallet_address, db)
        industry = user_context.get("industry")
        company_name = user_context.get("company_name")

        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Use Together.ai combined query with industry context
            result = await together_business_service.query_with_web_search(
                business_wallet=request.wallet_address,
                user_query=request.query,
                integration=request.integration,
                data_type=request.data_type,
                enable_web_search=request.enable_web_search,
                max_context_items=request.max_rag_results,
                max_search_results=request.max_search_results,
                industry=industry,
                company_name=company_name
            )
        else:
            # Fallback: Use Ollama for RAG only (no web search in fallback)
            result = await ollama_business_service.query_business_ai(
                business_wallet=request.wallet_address,
                user_query=request.query,
                integration=request.integration,
                data_type=request.data_type,
                max_context_items=request.max_rag_results
            )
            result["web_sources"] = []
            result["web_search_used"] = False
            result["rag_sources"] = result.get("sources", [])

        return CombinedQueryResponse(
            answer=result["answer"],
            mode=result.get("mode", "general"),
            rag_sources=result.get("rag_sources", result.get("sources", [])),
            web_sources=result.get("web_sources", []),
            context_used=result.get("context_used", False),
            web_search_used=result.get("web_search_used", False),
            metadata={
                "wallet_address": request.wallet_address,
                "integration": request.integration,
                "data_type": request.data_type,
                "llm_provider": provider,
                "web_search_enabled": request.enable_web_search,
                "timestamp": datetime.now().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Combined query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/health")
async def web_search_health():
    """
    Check health of web search service

    Returns status of web search configuration and availability.
    """
    try:
        health = await web_search_service.health_check()

        return {
            "success": True,
            "web_search": health,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Web search health check failed: {e}")
        return {
            "success": False,
            "web_search": {
                "available": False,
                "operational": False,
                "error": str(e)
            },
            "timestamp": datetime.now().isoformat()
        }


@router.get("/models")
async def get_available_models():
    """
    Get available AI models

    Returns list of available models for AI chat and query.
    Uses Together.ai models (Llama 3.3 70B) or Ollama based on configuration.
    """
    try:
        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Get models from Together.ai service
            models_info = await together_business_service.get_available_models()
            default_model = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")
        else:
            # Get models from Ollama service
            models_info = await ollama_business_service.get_available_models()
            default_model = os.getenv("OLLAMA_MODEL", "mistral")

        # Build response with available models
        models = models_info.get("models", [])

        # Add Together.ai flagship models if using Together
        if provider == "together" and not models:
            models = [
                {
                    "id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                    "name": "Llama 3.3 70B Instruct Turbo",
                    "description": "Meta's most capable open-source model - fast and intelligent",
                    "provider": "together",
                    "context_window": 131072,
                    "default": True
                },
                {
                    "id": "meta-llama/Llama-3.1-8B-Instruct-Turbo",
                    "name": "Llama 3.1 8B Instruct Turbo",
                    "description": "Fast, efficient model for quick tasks",
                    "provider": "together",
                    "context_window": 131072,
                    "default": False
                },
                {
                    "id": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    "name": "Mixtral 8x7B Instruct",
                    "description": "High-quality mixture-of-experts model",
                    "provider": "together",
                    "context_window": 32768,
                    "default": False
                },
                {
                    "id": "Qwen/Qwen2.5-72B-Instruct-Turbo",
                    "name": "Qwen 2.5 72B Instruct Turbo",
                    "description": "Alibaba's powerful multilingual model",
                    "provider": "together",
                    "context_window": 32768,
                    "default": False
                }
            ]

        # Add fallback if no models found
        if not models:
            models = [
                {
                    "id": "tinyllama",
                    "name": "TinyLlama",
                    "description": "Lightweight LLM for fast responses",
                    "provider": "ollama",
                    "context_window": 2048,
                    "default": True
                }
            ]
            default_model = "tinyllama"

        return {
            "success": True,
            "provider": provider,
            "models": models,
            "default_model": default_model,
            "timestamp": datetime.now().isoformat(),
            "capabilities": {
                "general_chat": True,
                "document_analysis": True,
                "deep_research": True,
                "rag_enabled": True,
                "streaming": True
            }
        }

    except Exception as e:
        logger.error(f"Failed to get models: {e}")
        # Return fallback response instead of error
        return {
            "success": True,
            "provider": "ollama",
            "models": [
                {
                    "id": "tinyllama",
                    "name": "TinyLlama",
                    "description": "Lightweight LLM for fast responses",
                    "provider": "ollama",
                    "context_window": 2048,
                    "default": True
                }
            ],
            "default_model": "tinyllama",
            "timestamp": datetime.now().isoformat(),
            "capabilities": {
                "general_chat": True,
                "document_analysis": True,
                "deep_research": True,
                "rag_enabled": True,
                "streaming": True
            },
            "note": "Using fallback model list"
        }


@router.get("/capabilities")
async def get_ai_capabilities():
    """
    Get AI assistant capabilities

    Returns information about what the AI assistant can do,
    including which features work without integrations.
    """
    provider = get_llm_provider()
    has_together_key = bool(os.getenv("TOGETHER_API_KEY"))
    web_search_available = web_search_service.is_available()

    return {
        "success": True,
        "provider": provider if has_together_key or provider == "ollama" else "none",
        "capabilities": {
            "general_chat": {
                "enabled": True,
                "requires_integrations": False,
                "description": "Chat with AI about any topic - works without any integrations",
                "endpoint": "/api/v1/ai/chat/general"
            },
            "document_analysis": {
                "enabled": True,
                "requires_integrations": False,
                "description": "Analyze documents for summaries, key points, sentiment, and more",
                "endpoint": "/api/v1/ai/analyze/document",
                "analysis_types": ["summary", "key_points", "sentiment", "extraction", "action_items"]
            },
            "deep_research": {
                "enabled": True,
                "requires_integrations": False,
                "description": "Comprehensive research and analysis - uses business data when available",
                "endpoint": "/api/v1/ai/research",
                "depth_options": ["quick", "standard", "comprehensive"]
            },
            "web_search": {
                "enabled": web_search_available,
                "requires_integrations": False,
                "description": "AI with real-time internet access - search the web for current information",
                "endpoint": "/api/v1/ai/search",
                "provider": web_search_service.provider if web_search_available else None,
                "note": "Requires TAVILY_API_KEY or SERPER_API_KEY" if not web_search_available else "Web search enabled"
            },
            "combined_query": {
                "enabled": True,
                "requires_integrations": False,
                "description": "Combine business data (RAG) with web search for comprehensive answers",
                "endpoint": "/api/v1/ai/query/combined",
                "note": "Best of both worlds - your business data + live internet information"
            },
            "rag_chat": {
                "enabled": True,
                "requires_integrations": True,
                "description": "AI chat with context from your connected business tools",
                "endpoint": "/api/v1/ai/chat"
            },
            "business_query": {
                "enabled": True,
                "requires_integrations": True,
                "description": "Query your business data across all connected integrations",
                "endpoint": "/api/v1/ai/query/multitenant"
            }
        },
        "model_info": {
            "provider": "Together.ai" if provider == "together" and has_together_key else "Ollama (self-hosted)",
            "model": os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo") if provider == "together" else os.getenv("OLLAMA_MODEL", "mistral"),
            "privacy": "Open-source models - your data is never used for training"
        },
        "web_search_info": {
            "available": web_search_available,
            "provider": web_search_service.provider if web_search_available else None,
            "tavily_configured": bool(os.getenv("TAVILY_API_KEY")),
            "serper_configured": bool(os.getenv("SERPER_API_KEY"))
        },
        "timestamp": datetime.now().isoformat()
    }


# ==================== Helper Functions ====================

async def _fetch_live_data_for_ai(
    wallet_address: str,
    integration: str,
    data_type: str,
    db: AsyncSession
) -> Optional[Dict[str, Any]]:
    """
    Fetch live data from integration endpoints as AI context fallback.

    Used when RAG is empty to provide AI with fresh business context.

    Args:
        wallet_address: User's wallet address
        integration: Integration name (google, slack, quickbooks, microsoft)
        data_type: Type of data to fetch (emails, channels, invoices, etc.)
        db: Database session for OAuth token retrieval

    Returns:
        Dict with 'data' key containing list of items, or None if failed
    """
    try:
        # Get OAuth token for integration
        result = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == wallet_address,
                    OAuthToken.provider == integration
                )
            )
        )
        oauth_token = result.scalar_one_or_none()

        if not oauth_token:
            logger.warning(f"No OAuth token found for {integration}")
            return None

        # Map integration + data_type to API endpoint
        endpoint_map = {
            "google": {
                "emails": f"/api/v1/integrations/google/emails?wallet_address={wallet_address}&max_results=10",
                "calendar": f"/api/v1/integrations/google/events?wallet_address={wallet_address}&max_results=10",
                "files": f"/api/v1/integrations/google/files?wallet_address={wallet_address}&page_size=10",
                "contacts": f"/api/v1/integrations/google/contacts?wallet_address={wallet_address}&page_size=10",
            },
            "microsoft": {
                "mail": f"/api/v1/integrations/microsoft/mail/messages?wallet_address={wallet_address}&top=10",
                "calendar": f"/api/v1/integrations/microsoft/calendar/events?wallet_address={wallet_address}&top=10",
                "files": f"/api/v1/integrations/microsoft/onedrive/files?wallet_address={wallet_address}",
                "contacts": f"/api/v1/integrations/microsoft/contacts?wallet_address={wallet_address}&top=10",
            },
            "slack": {
                "channels": f"/api/v1/integrations/slack/channels?wallet_address={wallet_address}",
                "messages": f"/api/v1/integrations/slack/messages?wallet_address={wallet_address}&limit=10",
            },
            "quickbooks": {
                "invoices": f"/api/v1/quickbooks/invoices?wallet_address={wallet_address}&maxresults=10",
                "customers": f"/api/v1/quickbooks/customers?wallet_address={wallet_address}&maxresults=10",
                "expenses": f"/api/v1/quickbooks/expenses?wallet_address={wallet_address}&maxresults=10",
                "payments": f"/api/v1/quickbooks/payments?wallet_address={wallet_address}&maxresults=10",
            },
        }

        if integration not in endpoint_map or data_type not in endpoint_map[integration]:
            return None

        endpoint = endpoint_map[integration][data_type]

        # Make internal API call
        base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}{endpoint}",
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()

                # Normalize response format across different integrations
                if isinstance(data, dict):
                    # Extract actual data array from response
                    if "items" in data:
                        items = data["items"]
                    elif "data" in data:
                        items = data["data"]
                    elif "messages" in data:
                        items = data["messages"]
                    elif "channels" in data:
                        items = data["channels"]
                    elif "events" in data:
                        items = data["events"]
                    else:
                        # Assume the whole dict is a single item
                        items = [data]
                else:
                    items = data if isinstance(data, list) else []

                return {
                    "data": items[:10],  # Limit to 10 items max
                    "count": len(items),
                    "source": "live_api"
                }
            else:
                logger.warning(f"Live API call failed: {response.status_code} - {response.text[:200]}")
                return None

    except Exception as e:
        logger.warning(f"Failed to fetch live data for {integration}/{data_type}: {e}")
        return None


async def _build_rag_context(
    wallet_address: str,
    tools: List[str],
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None
) -> Dict[str, Any]:
    """
    Build RAG context from user's tool data using Qdrant vector search

    UPDATED (Jan 12, 2026): Added Live API fallback when RAG is empty.
    When Qdrant returns no results, fetches fresh data from live integration
    endpoints to provide AI with business context even without RAG indexing.

    UPDATED (Dec 26, 2025): Now uses Qdrant for semantic search instead of
    fetching all files from Pinata. This is faster and more accurate.

    Args:
        wallet_address: User's wallet address
        tools: List of tools to query
        query: User's query
        filters: Optional filters for data (supports 'data_type')
        db: Database session for Live API fallback (optional)

    Returns:
        RAG context dictionary with relevant data from RAG or Live API
    """
    context = {
        "wallet_address": wallet_address,
        "tools": tools,
        "query": query,
        "data": {},
        "sources": []
    }

    # Check if RAG service is available
    if rag_service is None:
        logger.warning("RAG service not available, returning empty context")
        context["summary"] = (
            "RAG service not available. Please ensure your integrations "
            "are connected and synced from the Marketplace."
        )
        return context

    # Use Qdrant vector search for each tool
    for tool in tools:
        try:
            # Query Qdrant for semantically relevant documents
            # This replaces the old Pinata file listing + keyword matching approach
            rag_results = await rag_service.query_business_rag(
                business_wallet=wallet_address,
                query=query,
                limit=10,  # Get top 10 per tool for comprehensive context
                integration=tool,
                data_type=filters.get("data_type") if filters else None
            )

            if rag_results:
                tool_data = []
                for result in rag_results:
                    # FIX: Use preview when data is None (minimal payload optimization)
                    # RAG service stores only preview (500 chars) to reduce Qdrant memory
                    data = result.get("data")
                    preview = result.get("preview", "")
                    cid = result.get("cid", "")
                    data_type = result.get("data_type", "unknown")
                    score = result.get("score", 0)
                    indexed_at = result.get("indexed_at", "")

                    # Use data if available, otherwise use preview as context
                    if data:
                        tool_data.append(data)
                    elif preview:
                        # Wrap preview in a dict for consistency
                        tool_data.append({"preview": preview, "cid": cid})

                    # Add source with relevance score (new field)
                    context["sources"].append({
                        "tool": tool,
                        "data_type": data_type,
                        "cid": cid,
                        "relevance_score": score,
                        "indexed_at": indexed_at
                    })

                # Add tool data to context
                if tool_data:
                    context["data"][tool] = tool_data

                logger.info(
                    f"RAG context: found {len(tool_data)} relevant items for "
                    f"tool={tool}, wallet={wallet_address[:10]}..."
                )

        except Exception as e:
            logger.warning(f"Qdrant query failed for tool {tool}: {e}")
            continue

    # LIVE API FALLBACK (Jan 12, 2026): If RAG is empty, try fetching live data
    if not context["sources"] and db is not None:
        logger.info("RAG empty, attempting Live API fallback for AI context")

        # Define which data types should use Live API per integration
        LIVE_DATA_TYPES = {
            "google": ["emails", "calendar", "files", "contacts"],
            "microsoft": ["mail", "calendar", "files", "contacts"],
            "slack": ["channels", "messages"],
            "quickbooks": ["invoices", "customers", "expenses", "payments"],
        }

        # Try fetching live data for each tool
        for tool in tools:
            if tool in LIVE_DATA_TYPES:
                for data_type in LIVE_DATA_TYPES[tool]:
                    try:
                        # Call the live API endpoint
                        result = await _fetch_live_data_for_ai(wallet_address, tool, data_type, db)

                        if result and result.get("data"):
                            # Add to context (limited to 10 items in helper function)
                            context["data"][f"{tool}_{data_type}"] = result["data"]
                            context["sources"].append({
                                "tool": tool,
                                "data_type": data_type,
                                "source": "live_api",
                                "record_count": result.get("count", len(result["data"]))
                            })
                            logger.info(
                                f"Live API fallback: Got {result.get('count', 0)} records "
                                f"for {tool}/{data_type}"
                            )
                    except Exception as e:
                        logger.warning(f"Live API fallback failed for {tool}/{data_type}: {e}")
                        continue

    # Add helpful message if no data found (after Live API fallback)
    if not context["sources"]:
        context["summary"] = (
            "I don't have access to your business data yet. To help you better:\n\n"
            "1. Connect your integrations in the Marketplace\n"
            "2. Make sure your OAuth tokens are active (not expired)\n"
            "3. Click 'Sync Data' on your integration pages\n\n"
            "I can still help with general questions and web searches!"
        )
        context["needs_sync"] = True
    else:
        # Build context summary for LLM
        context["summary"] = _summarize_context(context)

    return context


def _is_relevant_to_query(file: Dict, query: str) -> bool:
    """
    DEPRECATED (Dec 26, 2025): This function is no longer used.

    The _build_rag_context() function now uses Qdrant vector search
    for semantic relevance scoring instead of this keyword matching approach.

    This function is kept for backward compatibility but always returns True.
    It will be removed in a future version.

    Args:
        file: File metadata
        query: User's query

    Returns:
        True always (deprecated behavior)
    """
    # Log deprecation warning (throttled to avoid spam)
    logger.debug("_is_relevant_to_query is deprecated - using Qdrant for relevance")
    return True  # Always return True since Qdrant handles relevance now


def _summarize_context(context: Dict) -> str:
    """
    Create a summary of the RAG context for the LLM

    Args:
        context: Full context dictionary

    Returns:
        Human-readable summary
    """
    summary_parts = []

    for tool, data in context.get("data", {}).items():
        if isinstance(data, list):
            summary_parts.append(f"- {tool.title()}: {len(data)} records")
        else:
            summary_parts.append(f"- {tool.title()}: data available")

    if summary_parts:
        return "Available data:\n" + "\n".join(summary_parts)
    else:
        return "No data available yet. Run sync on your integrations first."
