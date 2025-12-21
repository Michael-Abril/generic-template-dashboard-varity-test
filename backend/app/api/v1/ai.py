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
from app.models.purchase import Purchase
from app.models.marketplace import Product

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
rag_service = BusinessRAGService()


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


class GeneralChatResponse(BaseModel):
    """General LLM chat response"""
    response: str
    conversation_id: str
    mode: str = "general"
    provider: str
    model: str
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


# ==================== General LLM Chat (Works Without Integrations) ====================

@router.post("/chat/general", response_model=GeneralChatResponse)
async def general_chat(request: GeneralChatRequest, db: AsyncSession = Depends(get_db)):
    """
    General LLM chat that works WITHOUT any software integrations

    This endpoint provides a general-purpose AI assistant that can help with:
    - Business questions and advice
    - Writing and editing documents
    - Analysis and problem-solving
    - Research and information synthesis
    - Planning and strategy discussions

    No data from integrations is used - this is pure LLM capability.
    Industry context from user settings is used to personalize responses.

    Args:
        request: Chat request with message
        db: Database session for fetching user context

    Returns:
        AI-generated response with industry-specific expertise
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

        provider = get_llm_provider()

        if provider == "together" and os.getenv("TOGETHER_API_KEY"):
            # Use Together.ai with industry context
            response = await together_service.query(
                prompt=request.message,
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
                prompt=request.message
            )
            model_used = os.getenv("OLLAMA_MODEL", "mistral")
            provider = "ollama"

        return GeneralChatResponse(
            response=response,
            conversation_id=request.conversation_id or f"general-{datetime.now().timestamp()}",
            mode="general",
            provider=provider,
            model=model_used,
            metadata={
                "wallet_address": request.wallet_address,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
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

        ai_service = get_business_ai_service()

        # Map depth to context items
        depth_mapping = {
            "quick": 3,
            "standard": 5,
            "comprehensive": 10
        }
        max_context = depth_mapping.get(request.depth, 5)

        # Query with research mode and industry context
        result = await ai_service.query_business_ai(
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
                "provider": get_llm_provider(),
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
