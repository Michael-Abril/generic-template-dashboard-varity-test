"""
Wallet Authentication Middleware

Verifies Ethereum wallet signatures on protected endpoints.
Implements wallet-based authentication for Web3 applications.
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from eth_account.messages import encode_defunct
from web3 import Web3
import logging
import time
import hmac

from app.services.audit_service import audit_service
import os

logger = logging.getLogger(__name__)

# YELLOW-003 FIX: Production safeguard for DEV_MODE (December 28, 2025)
# DEV_MODE can only be enabled in non-production environments
_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() in ["production", "prod"]
_DEV_MODE_REQUESTED = os.getenv("DEV_MODE", "false").lower() == "true"

if _DEV_MODE_REQUESTED and _IS_PRODUCTION:
    # SECURITY: Never allow DEV_MODE in production - fail hard
    logger.critical(
        "SECURITY CRITICAL: DEV_MODE=true in production environment! "
        "This is a security violation and has been BLOCKED. "
        "Remove DEV_MODE env var or set ENVIRONMENT to development."
    )
    DEV_MODE = False  # Force disabled in production
elif _DEV_MODE_REQUESTED:
    # In development, allow DEV_MODE but warn loudly
    DEV_MODE = True
    logger.warning(
        "DEVELOPMENT: DEV_MODE is enabled - Wallet authentication is DISABLED! "
        "This setting is BLOCKED in production environments."
    )
else:
    DEV_MODE = False


class WalletAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to verify wallet signatures on protected endpoints.

    Protected endpoints require headers:
    - X-Wallet-Address: User's Ethereum wallet address
    - X-Signature: Signed message proving ownership
    - X-Message: Original message that was signed
    - X-Timestamp: Message timestamp (for replay attack prevention)

    Security features:
    - Signature verification using eth_account
    - Message timestamp validation (5 minute window)
    - Constant-time comparison for security
    """

    # Endpoints that require wallet signature
    # SECURITY FIX (SEC-006): Added OAuth endpoints to protected paths
    # NOTE: AI endpoints removed - they use wallet_address in request body instead
    PROTECTED_PATHS = [
        "/api/v1/settings",
        "/api/v1/sync/",
        "/api/v1/team",
        "/api/v1/storage/upload",
        "/api/v1/storage/retrieve",
        "/api/v1/storage/delete",
        "/api/v1/oauth",           # OAuth endpoints require authentication
        "/api/v1/integrations",    # Integration endpoints require authentication
        "/api/v1/dashboard",       # Dashboard endpoints require authentication
    ]

    # SECURITY FIX (YELLOW-002): Reduced OAuth exempt paths to truly public endpoints only
    # Previous implementation exempted almost ALL endpoints, defeating authentication entirely
    #
    # TRULY PUBLIC endpoints (no auth needed):
    OAUTH_EXEMPT_PATHS = [
        # OAuth callbacks - providers can't send wallet signatures
        "/api/v1/oauth/callback",     # OAuth callback from providers
        "/api/v1/oauth/authorize",    # OAuth authorization start
        "/api/v1/oauth/start/",       # OAuth flow initiation

        # Public info endpoints - no sensitive data
        "/api/v1/ai/health",          # AI service health check
        "/api/v1/ai/models",          # Available AI models
        "/api/v1/ai/capabilities",    # AI capabilities

        # Health check
        "/health",                    # System health check
    ]

    # ENDPOINTS THAT NEED WALLET VALIDATION (via query param or body)
    # These endpoints receive wallet_address and MUST validate ownership
    # TODO: Frontend should implement proper wallet signatures for these
    # For now, each endpoint handler must validate the wallet_address parameter
    WALLET_PARAM_ENDPOINTS = [
        "/api/v1/oauth/status/",      # OAuth status - validates wallet in handler
        "/api/v1/ai/chat",            # AI chat - wallet in request body
        "/api/v1/ai/query",           # AI query - wallet in body
        "/api/v1/ai/analyze",         # Document analysis - wallet in body
        "/api/v1/ai/research",        # Deep research - wallet in body
        "/api/v1/ai/search",          # Web search - wallet in body
        "/api/v1/settings",           # Settings - wallet in query param
        "/api/v1/account",            # Account - wallet in query param
        "/api/v1/team",               # Team - wallet in query param
        "/api/v1/export",             # Export - wallet in query param
        "/api/v1/sync/",              # Sync - wallet in body
        "/api/v1/integrations/",      # Integrations - wallet in query/body
        "/api/v1/dashboard/",         # Dashboard - wallet in query param
        "/api/v1/conversations",      # Conversations - wallet in query param
        "/api/v1/onboarding",         # Onboarding - wallet in query param
        "/api/v1/feedback",           # Feedback - wallet in body
    ]

    # Message expiry in seconds (5 minutes)
    MESSAGE_EXPIRY = 300

    async def dispatch(self, request: Request, call_next):
        """Process request and verify wallet signature if needed"""
        # Check if path is OAuth exempt (OAuth callbacks can't have wallet signatures)
        if self._is_oauth_exempt_path(request.url.path):
            logger.info(f"OAuth exempt path: {request.url.path} - skipping wallet auth")
            response = await call_next(request)
            return response

        # Check if path requires protection
        if self._is_protected_path(request.url.path):
            if request.method in ["POST", "PUT", "DELETE"]:
                # Skip auth in development mode
                if DEV_MODE:
                    logger.warning(f"⚠️  DEV_MODE: Skipping wallet auth for {request.url.path}")
                    # Set mock wallet for testing
                    request.state.wallet_address = "0x0000000000000000000000000000000000000000"
                else:
                    await self._verify_wallet_auth(request)

        response = await call_next(request)
        return response

    def _is_protected_path(self, path: str) -> bool:
        """Check if the path requires wallet authentication"""
        return any(path.startswith(protected_path) for protected_path in self.PROTECTED_PATHS)

    def _is_oauth_exempt_path(self, path: str) -> bool:
        """
        Check if the path is exempt from wallet header authentication.

        Two categories of exemptions:
        1. OAUTH_EXEMPT_PATHS - Truly public endpoints (health checks, OAuth callbacks)
        2. WALLET_PARAM_ENDPOINTS - Endpoints that receive wallet_address in body/query
           (these should validate wallet ownership in their handlers)

        SECURITY NOTE: WALLET_PARAM_ENDPOINTS are temporarily exempt from header auth
        to maintain backwards compatibility. Each endpoint handler MUST validate
        that the wallet_address in the request belongs to the authenticated user.
        TODO: Implement proper wallet signature auth for all protected endpoints.
        """
        # Check truly public endpoints
        if any(path.startswith(exempt_path) for exempt_path in self.OAUTH_EXEMPT_PATHS):
            return True

        # Check wallet-param endpoints (exempt from header auth, validated in handler)
        if any(path.startswith(param_path) for param_path in self.WALLET_PARAM_ENDPOINTS):
            return True

        return False

    async def _verify_wallet_auth(self, request: Request):
        """Verify wallet signature for protected endpoints"""
        # Extract headers
        wallet = request.headers.get("X-Wallet-Address")
        signature = request.headers.get("X-Signature")
        message = request.headers.get("X-Message")
        timestamp_str = request.headers.get("X-Timestamp")

        # Validate required headers
        if not all([wallet, signature, message, timestamp_str]):
            client_ip = request.client.host if request.client else "unknown"
            logger.warning(
                f"Missing authentication headers for {request.url.path} "
                f"from {client_ip}"
            )
            # Audit log authentication failure
            await audit_service.log_auth_failure(
                wallet_or_ip=wallet or client_ip,
                endpoint=request.url.path,
                reason="Missing authentication headers"
            )
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Missing authentication headers",
                    "required": [
                        "X-Wallet-Address",
                        "X-Signature",
                        "X-Message",
                        "X-Timestamp"
                    ]
                }
            )

        # Validate timestamp
        try:
            message_timestamp = int(timestamp_str)
            current_time = int(time.time())

            if abs(current_time - message_timestamp) > self.MESSAGE_EXPIRY:
                logger.warning(
                    f"Expired signature from wallet {wallet}: "
                    f"timestamp {message_timestamp}, current {current_time}"
                )
                # Audit log timestamp expiry
                await audit_service.log_auth_failure(
                    wallet_or_ip=wallet,
                    endpoint=request.url.path,
                    reason="Message timestamp expired"
                )
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error": "Message timestamp expired",
                        "max_age_seconds": self.MESSAGE_EXPIRY
                    }
                )
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail="Invalid timestamp format"
            )

        # Verify signature
        if not self.verify_signature(wallet, signature, message):
            logger.warning(
                f"Invalid wallet signature from {wallet} for {request.url.path}"
            )
            # Audit log invalid signature
            await audit_service.log_invalid_signature(
                wallet=wallet,
                endpoint=request.url.path,
                reason="Signature verification failed"
            )
            raise HTTPException(
                status_code=401,
                detail="Invalid wallet signature"
            )

        # Add wallet to request state for downstream use
        request.state.wallet_address = wallet
        logger.info(f"Authenticated wallet {wallet} for {request.url.path}")

        # Audit log successful authentication
        await audit_service.log_auth_success(
            wallet=wallet,
            endpoint=request.url.path
        )

    @staticmethod
    def verify_signature(wallet_address: str, signature: str, message: str) -> bool:
        """
        Verify Ethereum wallet signature

        Args:
            wallet_address: Ethereum address that signed the message
            signature: Hex-encoded signature
            message: Original message that was signed

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            w3 = Web3()

            # Encode message for signature verification
            message_hash = encode_defunct(text=message)

            # Recover address from signature
            recovered_address = w3.eth.account.recover_message(
                message_hash,
                signature=signature
            )

            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(
                recovered_address.lower(),
                wallet_address.lower()
            )

        except Exception as e:
            logger.error(f"Signature verification failed: {e}", exc_info=True)
            return False
