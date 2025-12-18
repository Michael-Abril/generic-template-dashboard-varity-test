"""
Wallet Authentication API Endpoints

Provides endpoints for wallet-based authentication with session management.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from app.services.wallet_session_service import wallet_session_service
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter()


class AuthMessageRequest(BaseModel):
    """Request to generate authentication message"""

    wallet_address: str = Field(..., description="Ethereum wallet address")


class AuthMessageResponse(BaseModel):
    """Response with authentication message to sign"""

    message: str = Field(..., description="Message to sign with wallet")
    nonce: str = Field(..., description="Unique nonce for this auth attempt")
    expires_in: int = Field(default=300, description="Message expiry in seconds")


class LoginRequest(BaseModel):
    """Request to create session after wallet signature"""

    wallet_address: str = Field(..., description="Ethereum wallet address")
    signature: str = Field(..., description="Signed message (hex-encoded)")
    message: str = Field(..., description="Original message that was signed")
    nonce: str = Field(..., description="Nonce from auth message")
    user_agent: Optional[str] = Field(None, description="User agent (optional)")
    ip_address: Optional[str] = Field(None, description="IP address (optional)")


class LoginResponse(BaseModel):
    """Response after successful login"""

    session_token: str = Field(..., description="Session token for API calls")
    wallet_address: str = Field(..., description="Authenticated wallet address")
    expires_at: int = Field(..., description="Session expiration timestamp")
    expires_in: int = Field(..., description="Seconds until expiration")


class SessionInfo(BaseModel):
    """Information about active session"""

    wallet_address: str
    session_token: str
    created_at: int
    expires_at: int
    metadata: dict


class AddWalletRequest(BaseModel):
    """Request to add additional wallet to session"""

    new_wallet_address: str = Field(..., description="New wallet to add")
    signature: str = Field(..., description="Signature from new wallet")
    message: str = Field(..., description="Signed message")
    nonce: str = Field(..., description="Authentication nonce")


@router.post("/auth/message", response_model=AuthMessageResponse, tags=["Authentication"])
async def get_auth_message(request: AuthMessageRequest):
    """
    Generate authentication message for wallet to sign

    This is step 1 of the authentication flow:
    1. Frontend calls this endpoint with wallet address
    2. Backend returns message + nonce
    3. Frontend prompts user to sign message with their wallet
    4. Frontend calls /auth/login with signature
    5. Backend verifies signature and creates session

    Example:
        POST /api/v1/wallet/auth/message
        {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }

        Response:
        {
            "message": "Sign this message to authenticate with Varity Dashboard.\\n\\nWallet: 0x742...\\nTimestamp: 1234567890\\nNonce: abc123...",
            "nonce": "abc123...",
            "expires_in": 300
        }
    """
    try:
        message, nonce = wallet_session_service.generate_auth_message(request.wallet_address)

        return AuthMessageResponse(message=message, nonce=nonce, expires_in=300)

    except Exception as e:
        logger.error(f"Failed to generate auth message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate authentication message")


@router.post("/auth/login", response_model=LoginResponse, tags=["Authentication"])
async def login_with_wallet(request: LoginRequest, req: Request):
    """
    Authenticate wallet and create session

    This is step 2 of the authentication flow:
    1. Verifies wallet signature
    2. Creates session token
    3. Returns session token for future API calls

    The session token should be sent in X-Session-Token header for protected endpoints.

    Example:
        POST /api/v1/wallet/auth/login
        {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "signature": "0x1234...",
            "message": "Sign this message...",
            "nonce": "abc123..."
        }

        Response:
        {
            "session_token": "abc123def456...",
            "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
            "expires_at": 1234567890,
            "expires_in": 86400
        }
    """
    try:
        # Gather metadata
        metadata = {
            "user_agent": request.user_agent,
            "ip_address": request.ip_address or (req.client.host if req.client else None),
        }

        # Verify signature and create session
        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=request.wallet_address,
            signature=request.signature,
            message=request.message,
            nonce=request.nonce,
            metadata=metadata,
        )

        if not session:
            # Audit log failed login
            await audit_service.log_auth_failure(
                wallet_or_ip=request.wallet_address,
                endpoint="/api/v1/wallet/auth/login",
                reason="Invalid signature or nonce",
            )

            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Authentication failed",
                    "message": "Invalid signature or nonce expired",
                },
            )

        # Audit log successful login
        await audit_service.log_auth_success(
            wallet=session.wallet_address, endpoint="/api/v1/wallet/auth/login"
        )

        logger.info(f"Wallet {session.wallet_address} logged in successfully")

        return LoginResponse(
            session_token=session.session_token,
            wallet_address=session.wallet_address,
            expires_at=session.expires_at,
            expires_in=session.expires_at - session.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/auth/logout", tags=["Authentication"])
async def logout(x_session_token: str = Header(...)):
    """
    Logout and invalidate session

    Example:
        POST /api/v1/wallet/auth/logout
        Headers:
            X-Session-Token: abc123...

        Response:
        {
            "message": "Logged out successfully"
        }
    """
    try:
        wallet_session_service.invalidate_session(x_session_token)
        logger.info(f"Session {x_session_token[:8]}... logged out")

        return {"message": "Logged out successfully"}

    except Exception as e:
        logger.error(f"Logout failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Logout failed")


@router.get("/auth/session", response_model=SessionInfo, tags=["Authentication"])
async def get_session_info(x_session_token: str = Header(...)):
    """
    Get current session information

    Example:
        GET /api/v1/wallet/auth/session
        Headers:
            X-Session-Token: abc123...

        Response:
        {
            "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
            "session_token": "abc123...",
            "created_at": 1234567890,
            "expires_at": 1234654290,
            "metadata": {...}
        }
    """
    try:
        session = wallet_session_service.get_session(x_session_token)

        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        return SessionInfo(
            wallet_address=session.wallet_address,
            session_token=session.session_token,
            created_at=session.created_at,
            expires_at=session.expires_at,
            metadata=session.metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get session information")


@router.get("/auth/sessions", response_model=List[SessionInfo], tags=["Authentication"])
async def get_all_sessions(x_session_token: str = Header(...)):
    """
    Get all active sessions for authenticated wallet

    Supports multi-wallet feature - shows all sessions for all linked wallets.

    Example:
        GET /api/v1/wallet/auth/sessions
        Headers:
            X-Session-Token: abc123...

        Response:
        [
            {
                "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
                "session_token": "abc123...",
                "created_at": 1234567890,
                "expires_at": 1234654290,
                "metadata": {...}
            },
            ...
        ]
    """
    try:
        # Get current session to verify auth
        current_session = wallet_session_service.get_session(x_session_token)

        if not current_session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Get all sessions for this wallet
        sessions = wallet_session_service.get_wallet_sessions(current_session.wallet_address)

        return [
            SessionInfo(
                wallet_address=s.wallet_address,
                session_token=s.session_token,
                created_at=s.created_at,
                expires_at=s.expires_at,
                metadata=s.metadata,
            )
            for s in sessions
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get sessions")


@router.post("/auth/refresh", response_model=LoginResponse, tags=["Authentication"])
async def refresh_session(x_session_token: str = Header(...)):
    """
    Refresh session expiration

    Extends session expiration by another 24 hours.

    Example:
        POST /api/v1/wallet/auth/refresh
        Headers:
            X-Session-Token: abc123...

        Response:
        {
            "session_token": "abc123...",
            "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
            "expires_at": 1234740690,
            "expires_in": 86400
        }
    """
    try:
        session = wallet_session_service.refresh_session(x_session_token)

        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        return LoginResponse(
            session_token=session.session_token,
            wallet_address=session.wallet_address,
            expires_at=session.expires_at,
            expires_in=session.expires_at - session.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to refresh session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to refresh session")


@router.post("/auth/add-wallet", tags=["Authentication"])
async def add_wallet_to_session(request: AddWalletRequest, x_session_token: str = Header(...)):
    """
    Add additional wallet to existing session (multi-wallet support)

    Allows users to link multiple wallets to the same session.
    Each wallet must provide its own signature for verification.

    Example:
        POST /api/v1/wallet/auth/add-wallet
        Headers:
            X-Session-Token: abc123...
        Body:
        {
            "new_wallet_address": "0xabc...",
            "signature": "0x456...",
            "message": "Sign this message...",
            "nonce": "def456..."
        }

        Response:
        {
            "message": "Wallet added successfully",
            "wallets": ["0x742...", "0xabc..."]
        }
    """
    try:
        success = wallet_session_service.add_wallet_to_session(
            session_token=x_session_token,
            new_wallet_address=request.new_wallet_address,
            signature=request.signature,
            message=request.message,
            nonce=request.nonce,
        )

        if not success:
            raise HTTPException(
                status_code=401, detail="Failed to add wallet (invalid signature or session)"
            )

        # Get updated session
        session = wallet_session_service.get_session(x_session_token)
        wallets = session.metadata.get("wallets", [session.wallet_address])

        logger.info(
            f"Added wallet {request.new_wallet_address} to session "
            f"for wallet {session.wallet_address}"
        )

        return {"message": "Wallet added successfully", "wallets": wallets}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add wallet: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to add wallet")


@router.delete("/auth/sessions/{session_token}", tags=["Authentication"])
async def invalidate_specific_session(session_token: str, x_session_token: str = Header(...)):
    """
    Invalidate a specific session

    Allows users to log out from a specific device/session.

    Example:
        DELETE /api/v1/wallet/auth/sessions/abc123...
        Headers:
            X-Session-Token: xyz789...

        Response:
        {
            "message": "Session invalidated successfully"
        }
    """
    try:
        # Verify current session
        current_session = wallet_session_service.get_session(x_session_token)
        if not current_session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Get target session to verify ownership
        target_session = wallet_session_service.get_session(session_token)
        if target_session and target_session.wallet_address != current_session.wallet_address:
            raise HTTPException(
                status_code=403, detail="Cannot invalidate sessions for other wallets"
            )

        # Invalidate target session
        wallet_session_service.invalidate_session(session_token)

        logger.info(
            f"Wallet {current_session.wallet_address} invalidated "
            f"session {session_token[:8]}..."
        )

        return {"message": "Session invalidated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invalidate session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to invalidate session")


@router.delete("/auth/sessions", tags=["Authentication"])
async def invalidate_all_sessions(x_session_token: str = Header(...)):
    """
    Invalidate all sessions for authenticated wallet

    Logs out from all devices.

    Example:
        DELETE /api/v1/wallet/auth/sessions
        Headers:
            X-Session-Token: abc123...

        Response:
        {
            "message": "All sessions invalidated successfully"
        }
    """
    try:
        # Get current session
        current_session = wallet_session_service.get_session(x_session_token)
        if not current_session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Invalidate all sessions for this wallet
        wallet_session_service.invalidate_all_sessions(current_session.wallet_address)

        logger.info(f"Wallet {current_session.wallet_address} invalidated all sessions")

        return {"message": "All sessions invalidated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invalidate all sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to invalidate all sessions")
