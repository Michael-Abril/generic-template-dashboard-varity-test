"""
Rate Limiting Middleware

Implements token bucket rate limiting to prevent abuse.
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict
from typing import Dict, Tuple
import logging
import threading

from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiting middleware.

    Limits:
    - 100 requests per minute per wallet address (authenticated)
    - 50 requests per minute per IP (unauthenticated)

    Uses token bucket algorithm for smooth rate limiting.
    Thread-safe implementation for concurrent requests.
    """

    def __init__(self, app, requests_per_minute: int = 100, requests_per_minute_ip: int = 50):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_minute_ip = requests_per_minute_ip
        self.bucket: Dict[str, Tuple[float, int]] = defaultdict(
            lambda: (time.time(), requests_per_minute)
        )
        self.lock = threading.Lock()

    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        # Get identifier (wallet address or IP)
        identifier = self._get_identifier(request)

        # Determine rate limit based on authentication
        is_authenticated = request.headers.get("X-Wallet-Address") is not None
        rate_limit = self.requests_per_minute if is_authenticated else self.requests_per_minute_ip

        # Check rate limit
        if not self.allow_request(identifier, rate_limit):
            logger.warning(
                f"Rate limit exceeded for {identifier} on {request.url.path}"
            )
            # Audit log rate limit exceeded
            await audit_service.log_rate_limit_exceeded(
                identifier=identifier,
                endpoint=request.url.path,
                rate_limit=rate_limit
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "max_requests_per_minute": rate_limit,
                    "retry_after_seconds": 60
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(self._get_remaining_tokens(identifier))

        return response

    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting"""
        # Prefer wallet address for authenticated requests
        wallet = request.headers.get("X-Wallet-Address")
        if wallet:
            return f"wallet:{wallet}"

        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def allow_request(self, identifier: str, rate_limit: int) -> bool:
        """
        Token bucket algorithm for rate limiting

        Args:
            identifier: Unique identifier for the requester
            rate_limit: Maximum requests per minute

        Returns:
            True if request is allowed, False if rate limit exceeded
        """
        with self.lock:
            current_time = time.time()
            last_time, tokens = self.bucket.get(identifier, (current_time, rate_limit))

            # Refill tokens based on time elapsed
            time_elapsed = current_time - last_time
            tokens_to_add = int(time_elapsed * (rate_limit / 60))
            tokens = min(rate_limit, tokens + tokens_to_add)

            # Check if request allowed
            if tokens > 0:
                self.bucket[identifier] = (current_time, tokens - 1)
                return True
            else:
                # Update last_time but don't consume token
                self.bucket[identifier] = (last_time, tokens)
                return False

    def _get_remaining_tokens(self, identifier: str) -> int:
        """Get remaining tokens for identifier"""
        with self.lock:
            _, tokens = self.bucket.get(identifier, (time.time(), self.requests_per_minute))
            return tokens
