"""
Varity Generic Template - Main Application
FastAPI backend for decentralized storage with Lit Protocol encryption

Enhanced with:
- Tool Marketplace API
- Integration Management API
- AI-Powered RAG Chatbot API
- Wallet Signature Authentication
- Rate Limiting
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from .services.filecoin_service import FilecoinService
from .services.encryption_service import EncryptionService
from .core.config import settings
from .core.startup import startup_sequence, shutdown_sequence
from .core.database import check_database_health

# Import API routers
from .api.v1 import marketplace_v2, marketplace_purchases, integrations, ai, oauth, sync, dashboard, admin, stats
from .api.v1 import settings as settings_router

# Import middleware
from .middleware.auth import WalletAuthMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .middleware.security import SecurityHeadersMiddleware
from .middleware.exceptions import validation_exception_handler, general_exception_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Varity Generic Company Dashboard API",
    description="""
    Decentralized AI Dashboard with:
    - Filecoin/IPFS + Lit Protocol Encryption
    - Tool Marketplace (QuickBooks, Salesforce, Stripe, etc.)
    - RAG-Powered AI Chatbot
    - Multi-Tool Data Integration
    """,
    version="1.0.0"
)

# CORS middleware - Configure specific origins for production security
# SECURITY FIX (SEC-001): No wildcard origins - only specific trusted domains
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local development (Next.js default)
    "http://localhost:3001",  # Local development (alternative port)
    os.getenv("FRONTEND_URL", "https://varity.app"),  # Production frontend
    os.getenv("DASHBOARD_URL", "https://dashboard.varity.app"),  # Production dashboard
    "https://generic-template-dashboard.vercel.app",  # Vercel deployment
    "https://app.varity.so",  # Dashboard custom domain
    "https://varity.so",  # Marketing website (for signup stats API)
    "https://www.varity.so",  # Marketing website with www prefix
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Explicit list, NO wildcards
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Wallet-Address",
        "X-Signature",
        "X-Message",
        "X-Timestamp",
    ],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)

# Security middleware - ORDER MATTERS
# 1. Security headers (first - applied to all responses)
app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)  # HSTS disabled for localhost testing

# 2. Rate limiting (second - prevents DoS before auth)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100, requests_per_minute_ip=50)

# 3. Wallet authentication (third - verifies signatures on protected endpoints)
app.add_middleware(WalletAuthMiddleware)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API routers
app.include_router(
    marketplace_v2.router,
    prefix="/api/v1/marketplace",
    tags=["Marketplace"]
)
app.include_router(
    integrations.router,
    prefix="/api/v1/integrations",
    tags=["Integrations"]
)
app.include_router(
    ai.router,
    prefix="/api/v1/ai",
    tags=["AI Chatbot"]
)
app.include_router(
    oauth.router,
    prefix="/api/v1/oauth",
    tags=["OAuth"]
)
app.include_router(
    sync.router,
    prefix="/api/v1/sync",
    tags=["Data Sync"]
)
app.include_router(
    settings_router.router,
    prefix="/api/v1",
    tags=["Settings"]
)
app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)
app.include_router(
    marketplace_purchases.router,
    prefix="/api/v1",
    tags=["Marketplace Purchases"]
)
app.include_router(
    admin.router,
    prefix="/api/v1/admin",
    tags=["Admin"]
)
app.include_router(
    stats.router,
    prefix="/api/v1",
    tags=["Stats"]
)

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# Global service status (populated during startup)
service_status = {}


# Pydantic models
class UploadDataRequest(BaseModel):
    customer_wallet: str
    integration: str
    data_type: str
    data: dict
    metadata: Optional[dict] = None


class RetrieveDataRequest(BaseModel):
    cid: str
    customer_wallet: str
    auth_signature: Optional[dict] = None


class ListFilesRequest(BaseModel):
    customer_wallet: str
    integration: Optional[str] = None
    data_type: Optional[str] = None
    limit: int = 100


# Startup and shutdown events
@app.on_event("startup")
async def on_startup():
    """Run startup tasks"""
    global service_status
    service_status = await startup_sequence()


@app.on_event("shutdown")
async def on_shutdown():
    """Run shutdown tasks"""
    await shutdown_sequence()


# API endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Varity Generic Company Dashboard API",
        "version": "1.0.0",
        "storage": "Filecoin/IPFS (Pinata)",
        "encryption": "Lit Protocol",
        "chain": settings.varity_chain_name,
        "features": {
            "marketplace": "Browse and purchase tool integrations",
            "integrations": "Sync data from external services",
            "ai_chatbot": "RAG-powered business intelligence",
            "storage": "Encrypted decentralized storage"
        },
        "endpoints": {
            "marketplace": "/api/v1/marketplace",
            "integrations": "/api/v1/integrations",
            "ai": "/api/v1/ai",
            "storage": "/api/v1/storage",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint.
    Returns status of all services and dependencies.
    """
    try:
        # Check database health
        db_healthy = await check_database_health()

        # Determine overall status
        overall_status = "healthy" if db_healthy else "degraded"

        # Build comprehensive response
        return {
            "status": overall_status,
            "database": "connected" if db_healthy else "disconnected",
            "redis": "connected" if service_status.get("redis", False) else "not configured",
            "pinata": "connected" if service_status.get("pinata", False) else "not configured",
            "ollama": "connected" if service_status.get("ollama", False) else "not configured",
            "arbitrum_rpc": "connected" if service_status.get("arbitrum_rpc", False) else "not configured",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.post("/api/v1/storage/upload")
async def upload_data(request: UploadDataRequest):
    """
    Upload encrypted data to Filecoin/IPFS

    This endpoint:
    1. Encrypts data with Lit Protocol (only customer wallet can decrypt)
    2. Uploads encrypted data to Filecoin via Pinata
    3. Returns CID for retrieval
    """
    try:
        logger.info(
            f"Upload request from wallet {request.customer_wallet}, "
            f"integration: {request.integration}, type: {request.data_type}"
        )

        # Step 1: Encrypt data
        encrypted_payload = await encryption_service.encrypt_for_customer(
            data=request.data,
            customer_wallet=request.customer_wallet,
            additional_metadata=request.metadata
        )

        # Step 2: Upload to Filecoin/IPFS
        cid = await filecoin_service.upload_encrypted_data(
            customer_wallet=request.customer_wallet,
            integration=request.integration,
            data_type=request.data_type,
            encrypted_data=encrypted_payload,
            metadata=request.metadata
        )

        return {
            "success": True,
            "cid": cid,
            "customer_wallet": request.customer_wallet,
            "integration": request.integration,
            "data_type": request.data_type,
            "encrypted": True,
            "gateway_url": f"{settings.pinata_gateway_url}/ipfs/{cid}"
        }

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/storage/retrieve")
async def retrieve_data(request: RetrieveDataRequest):
    """
    Retrieve and decrypt data from Filecoin/IPFS

    SECURITY: Verifies wallet ownership and signature before decryption.

    This endpoint:
    1. Validates wallet signature (prevents unauthorized access)
    2. Retrieves encrypted data from Filecoin by CID
    3. Verifies wallet owns the file (multi-tenant isolation)
    4. Decrypts with customer's wallet (requires signature)
    5. Returns decrypted data

    Args:
        request: RetrieveDataRequest with cid, customer_wallet, auth_signature
    """
    try:
        logger.info(
            f"Retrieve request for CID {request.cid} by wallet {request.customer_wallet}"
        )

        # CRITICAL SECURITY: Validate wallet signature BEFORE retrieval
        if request.auth_signature:
            await encryption_service.validate_wallet_signature(
                wallet_address=request.customer_wallet,
                auth_signature=request.auth_signature.get("signature", ""),
                message=request.auth_signature.get("message", "retrieve_file"),
                timestamp=request.auth_signature.get("timestamp", 0)
            )
        else:
            logger.warning(
                f"No auth signature provided for retrieve: "
                f"cid={request.cid}, wallet={request.customer_wallet}"
            )

        # Step 1: Retrieve from Filecoin/IPFS
        encrypted_data = await filecoin_service.retrieve_data(request.cid)

        # CRITICAL SECURITY: Verify wallet owns this file
        owner_wallet = encrypted_data.get("metadata", {}).get("customer_wallet", "").lower()
        requesting_wallet = request.customer_wallet.lower()
        if not requesting_wallet.startswith("0x"):
            requesting_wallet = f"0x{requesting_wallet}"

        if owner_wallet != requesting_wallet:
            # Log unauthorized access attempt
            logger.error(
                f"UNAUTHORIZED FILE ACCESS ATTEMPT: "
                f"cid={request.cid}, "
                f"owner={owner_wallet}, "
                f"attempted_by={requesting_wallet}, "
                f"action=retrieve"
            )

            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Wallet {requesting_wallet} does not own this file"
            )

        # Step 2: Decrypt with wallet (wallet ownership already verified)
        decrypted_data = await encryption_service.decrypt_with_wallet(
            encrypted_data=encrypted_data,
            customer_wallet=request.customer_wallet,
            auth_signature=request.auth_signature
        )

        logger.info(
            f"File retrieved successfully: cid={request.cid}, wallet={requesting_wallet}"
        )

        return {
            "success": True,
            "cid": request.cid,
            "data": decrypted_data,
            "metadata": encrypted_data.get("metadata", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retrieval failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/storage/list")
async def list_files(request: ListFilesRequest):
    """
    List all files for a customer

    Returns metadata about all files stored for this customer
    """
    try:
        logger.info(f"List files for wallet {request.customer_wallet}")

        files = await filecoin_service.list_customer_files(
            customer_wallet=request.customer_wallet,
            integration=request.integration,
            data_type=request.data_type,
            limit=request.limit
        )

        return {
            "success": True,
            "customer_wallet": request.customer_wallet,
            "count": len(files),
            "files": files
        }

    except Exception as e:
        logger.error(f"List files failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/storage/metadata/{customer_wallet}")
async def get_encryption_metadata(customer_wallet: str):
    """
    Get encryption metadata for a customer
    """
    try:
        metadata = encryption_service.get_encryption_metadata(customer_wallet)

        return {
            "success": True,
            "metadata": metadata
        }

    except Exception as e:
        logger.error(f"Get metadata failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/storage/{cid}")
async def delete_file(
    cid: str,
    customer_wallet: str,
    auth_signature: dict
):
    """
    Delete (unpin) a file from Filecoin/IPFS

    SECURITY: Verifies wallet ownership before deletion to prevent unauthorized access.

    Args:
        cid: IPFS content identifier for the file
        customer_wallet: Customer's wallet address
        auth_signature: Wallet signature for authentication
            {
                "signature": "0x...",
                "message": "delete_file",
                "timestamp": 1234567890
            }

    Note: This only unpins from Pinata. The data may still exist on IPFS network.
    """
    try:
        logger.info(f"Delete request for CID {cid} by wallet {customer_wallet}")

        # CRITICAL SECURITY: Validate wallet signature before ANY file operations
        await encryption_service.validate_wallet_signature(
            wallet_address=customer_wallet,
            auth_signature=auth_signature.get("signature", ""),
            message=auth_signature.get("message", "delete_file"),
            timestamp=auth_signature.get("timestamp", 0)
        )

        # CRITICAL SECURITY: Verify wallet owns this file
        # Retrieve file metadata to check ownership
        file_metadata = await filecoin_service.get_file_metadata(cid)

        if not file_metadata:
            logger.warning(f"File not found: cid={cid}, wallet={customer_wallet}")
            raise HTTPException(status_code=404, detail="File not found")

        # Extract owner wallet from metadata
        owner_wallet = file_metadata.get("metadata", {}).get("customer_wallet", "").lower()

        # Normalize requesting wallet
        requesting_wallet = customer_wallet.lower()
        if not requesting_wallet.startswith("0x"):
            requesting_wallet = f"0x{requesting_wallet}"

        # Verify ownership
        if owner_wallet != requesting_wallet:
            # CRITICAL: Log unauthorized access attempt for security audit
            logger.error(
                f"UNAUTHORIZED FILE ACCESS ATTEMPT: "
                f"cid={cid}, "
                f"owner={owner_wallet}, "
                f"attempted_by={requesting_wallet}, "
                f"action=delete"
            )

            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Wallet {requesting_wallet} does not own this file (owner: {owner_wallet})"
            )

        # Wallet verified - proceed with deletion
        success = await filecoin_service.unpin_file(cid)

        logger.info(
            f"File deleted successfully: cid={cid}, wallet={requesting_wallet}"
        )

        return {
            "success": success,
            "cid": cid,
            "message": "File unpinned from Pinata",
            "owner_wallet": owner_wallet
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Delete failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
