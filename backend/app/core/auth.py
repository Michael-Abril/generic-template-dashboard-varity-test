"""
Authentication Utilities

Provides decorators and utilities for endpoint-level authentication.
"""
from functools import wraps
from fastapi import Request, HTTPException
import logging

logger = logging.getLogger(__name__)


def require_wallet_signature(func):
    """
    Decorator to require wallet signature on endpoint

    Use this decorator on route handlers that need wallet authentication.
    The middleware will have already verified the signature.

    Example:
        @app.post("/api/v1/protected")
        @require_wallet_signature
        async def protected_endpoint(request: Request):
            wallet = request.state.wallet_address
            return {"wallet": wallet}
    """
    @wraps(func)
    async def wrapper(*args, request: Request = None, **kwargs):
        if request is None:
            raise HTTPException(
                status_code=500,
                detail="Request object not available"
            )

        if not hasattr(request.state, "wallet_address"):
            logger.error(
                f"Wallet signature required but not found for {request.url.path}"
            )
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Wallet signature required",
                    "message": "This endpoint requires wallet authentication"
                }
            )

        return await func(*args, request=request, **kwargs)

    return wrapper


def get_authenticated_wallet(request: Request) -> str:
    """
    Get authenticated wallet address from request

    Args:
        request: FastAPI request object

    Returns:
        Wallet address if authenticated

    Raises:
        HTTPException: If not authenticated
    """
    if not hasattr(request.state, "wallet_address"):
        raise HTTPException(
            status_code=401,
            detail="Wallet authentication required"
        )

    return request.state.wallet_address


def is_wallet_authenticated(request: Request) -> bool:
    """
    Check if request has authenticated wallet

    Args:
        request: FastAPI request object

    Returns:
        True if wallet is authenticated, False otherwise
    """
    return hasattr(request.state, "wallet_address")
