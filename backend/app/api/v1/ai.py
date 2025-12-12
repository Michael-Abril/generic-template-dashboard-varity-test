"""
AI Chatbot API Endpoints - RAG-Powered Business Intelligence

This module provides AI-powered chat capabilities with RAG context
from the user's integrated tools (QuickBooks, Salesforce, etc.)
"""
from fastapi import APIRouter, HTTPException, Query, Depends  # type: ignore[import]
from pydantic import BaseModel  # type: ignore[import]
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import json

from sqlalchemy.ext.asyncio import AsyncSession  # type: ignore[import]
from sqlalchemy import select, and_  # type: ignore[import]
from sqlalchemy.orm import selectinload  # type: ignore[import]

from app.core.database import get_db
from app.models.purchase import Purchase
from app.models.marketplace import Product

from app.services.ai_query_service import ai_query_service
from app.services.filecoin_service import FilecoinService, FilecoinMultiTenantService
from app.services.encryption_service import EncryptionService
from app.services.ollama_service import OllamaBusinessService
from app.services.rag_service import BusinessRAGService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
filecoin_mt_service = FilecoinMultiTenantService()
encryption_service = EncryptionService()
ollama_business_service = OllamaBusinessService()
rag_service = BusinessRAGService()


# Pydantic models
class ChatRequest(BaseModel):
    """AI chat request"""
    message: str
    wallet_address: str
    conversation_id: Optional[str] = None
    use_rag: bool = True


class ChatResponse(BaseModel):
    """AI chat response"""
    response: str
    conversation_id: str
    sources: List[Dict[str, Any]] = []
    metadata: Dict[str, Any]


class QueryRequest(BaseModel):
    """Advanced RAG query request"""
    query: str
    wallet_address: str
    tools: List[str]  # e.g., ['quickbooks', 'salesforce']
    filters: Optional[Dict[str, Any]] = None


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
            query=request.message
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
async def ai_query(request: QueryRequest):
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
            filters=request.filters
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
    - Shared LLM on Akash Network
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

        # Query AI with business-specific RAG
        result = await ollama_business_service.query_business_ai(
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
    - Ollama LLM service
    - Qdrant vector database
    - Overall AI system health
    """
    try:
        health = await ollama_business_service.health_check()

        return {
            "success": True,
            "health": health,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def get_available_models():
    """
    Get available AI models

    Returns list of available models for AI chat and query.
    Currently uses Ollama models deployed on Akash Network.
    """
    try:
        # Get models from Ollama service
        models_info = await ollama_business_service.get_available_models()

        return {
            "success": True,
            "models": models_info.get("models", [
                {
                    "id": "tinyllama",
                    "name": "TinyLlama",
                    "description": "Lightweight LLM for fast responses",
                    "provider": "ollama",
                    "context_window": 2048,
                    "default": True
                }
            ]),
            "default_model": "tinyllama",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get models: {e}")
        # Return fallback response instead of error
        return {
            "success": True,
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
            "note": "Using fallback model list"
        }


# ==================== Helper Functions ====================

async def _build_rag_context(
    wallet_address: str,
    tools: List[str],
    query: str,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Build RAG context from user's tool data

    Args:
        wallet_address: User's wallet address
        tools: List of tools to query
        query: User's query
        filters: Optional filters for data

    Returns:
        RAG context dictionary with relevant data
    """
    context = {
        "wallet_address": wallet_address,
        "tools": tools,
        "query": query,
        "data": {},
        "sources": []
    }

    # Fetch data from each tool
    for tool in tools:
        try:
            # List files for this integration
            files = await filecoin_service.list_customer_files(
                customer_wallet=wallet_address,
                integration=tool,
                limit=50
            )

            tool_data = []

            # Retrieve and decrypt files
            for file in files:
                try:
                    # Check if file matches query context
                    if not _is_relevant_to_query(file, query):
                        continue

                    # Retrieve encrypted data
                    encrypted = await filecoin_service.retrieve_data(file["cid"])

                    # Decrypt
                    decrypted = await encryption_service.decrypt_with_wallet(
                        encrypted_data=encrypted,
                        customer_wallet=wallet_address
                    )

                    # Parse JSON
                    if isinstance(decrypted, str):
                        data = json.loads(decrypted)
                    else:
                        data = decrypted

                    tool_data.append(data)

                    # Add source
                    context["sources"].append({
                        "tool": tool,
                        "data_type": file.get("data_type", "unknown"),
                        "cid": file["cid"],
                        "uploaded_at": file.get("uploaded_at", "")
                    })

                except Exception as e:
                    logger.warning(f"Failed to process file {file.get('cid')}: {e}")
                    continue

            # Add tool data to context
            if tool_data:
                context["data"][tool] = tool_data

        except Exception as e:
            logger.error(f"Failed to fetch data for tool {tool}: {e}")
            continue

    # Build context summary for LLM
    context["summary"] = _summarize_context(context)

    return context


def _is_relevant_to_query(file: Dict, query: str) -> bool:
    """
    Check if a file is relevant to the query

    Simple keyword matching for MVP. In production, use embeddings.

    Args:
        file: File metadata
        query: User's query

    Returns:
        True if file seems relevant
    """
    query_lower = query.lower()
    data_type = file.get("data_type", "").lower()
    integration = file.get("integration", "").lower()

    # Keyword matching
    keywords = {
        "invoices": ["invoice", "bill", "revenue", "payment", "due", "overdue"],
        "expenses": ["expense", "cost", "spend", "vendor"],
        "customers": ["customer", "client"],
        "leads": ["lead", "prospect"],
        "opportunities": ["deal", "opportunity", "sale", "pipeline"]
    }

    # Check if query mentions this data type
    for dt, kws in keywords.items():
        if dt in data_type and any(kw in query_lower for kw in kws):
            return True

    # Default: include all for broad queries
    if len(query_lower.split()) < 5:  # Short query, include everything
        return True

    return False


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
