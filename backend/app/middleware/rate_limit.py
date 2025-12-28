"""
Rate Limiting Middleware

YELLOW-005 FIX (December 28, 2025):
Implements Redis-backed token bucket rate limiting for distributed deployment.
Falls back to in-memory storage if Redis is not available.

Implements token bucket rate limiting to prevent abuse.
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import asyncio
from collections import defaultdict
from typing import Dict, Tuple, Optional
import logging
import threading
import json

from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Redis-backed rate limiter for distributed deployments.

    Uses a sliding window counter with Redis for accurate rate limiting
    across multiple application instances.
    """

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._redis_available: Optional[bool] = None

    async def _get_redis(self):
        """Get Redis client, caching availability check."""
        if self._redis_available is False:
            return None

        try:
            from app.core.database import get_redis
            redis = await get_redis()
            if redis is None:
                self._redis_available = False
            else:
                self._redis_available = True
            return redis
        except Exception as e:
            logger.warning(f"Rate limiter: Redis error: {e}")
            self._redis_available = False
            return None

    async def check_rate_limit(
        self,
        identifier: str,
        rate_limit: int
    ) -> Tuple[bool, int]:
        """
        Check and update rate limit using Redis sliding window.

        Args:
            identifier: Unique identifier for the requester
            rate_limit: Maximum requests per window

        Returns:
            Tuple of (allowed: bool, remaining: int)
        """
        redis = await self._get_redis()
        if not redis:
            return None, rate_limit  # Signal fallback needed

        key = f"rate_limit:{identifier}"
        current_time = time.time()
        window_start = current_time - self.window_seconds

        try:
            # Use Redis pipeline for atomic operations
            pipe = redis.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count requests in current window
            pipe.zcard(key)

            # Execute count
            results = await pipe.execute()
            request_count = results[1]

            if request_count >= rate_limit:
                # Rate limit exceeded
                return False, 0

            # Add current request with timestamp as score
            pipe2 = redis.pipeline()
            pipe2.zadd(key, {str(current_time): current_time})
            pipe2.expire(key, self.window_seconds + 1)  # TTL slightly longer than window
            await pipe2.execute()

            remaining = rate_limit - request_count - 1
            return True, max(0, remaining)

        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            return None, rate_limit  # Signal fallback needed

    async def get_remaining(self, identifier: str, rate_limit: int) -> int:
        """Get remaining requests for identifier."""
        redis = await self._get_redis()
        if not redis:
            return rate_limit

        key = f"rate_limit:{identifier}"
        current_time = time.time()
        window_start = current_time - self.window_seconds

        try:
            # Clean old entries and count
            await redis.zremrangebyscore(key, 0, window_start)
            count = await redis.zcard(key)
            return max(0, rate_limit - count)
        except Exception:
            return rate_limit


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiting middleware with Redis support.

    YELLOW-005 FIX: Now uses Redis for distributed rate limiting.
    Falls back to in-memory if Redis is unavailable.

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

        # Redis-backed rate limiter (YELLOW-005 fix)
        self.redis_limiter = RedisRateLimiter(window_seconds=60)

        # Fallback in-memory bucket (when Redis unavailable)
        self.bucket: Dict[str, Tuple[float, int]] = defaultdict(
            lambda: (time.time(), requests_per_minute)
        )
        self.lock = threading.Lock()

        # Track if Redis is being used
        self._using_redis = None

    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        # Get identifier (wallet address or IP)
        identifier = self._get_identifier(request)

        # Determine rate limit based on authentication
        is_authenticated = request.headers.get("X-Wallet-Address") is not None
        rate_limit = self.requests_per_minute if is_authenticated else self.requests_per_minute_ip

        # YELLOW-005 FIX: Try Redis first, fall back to memory
        allowed, remaining = await self._check_rate_limit_with_fallback(identifier, rate_limit)

        if not allowed:
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
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response

    async def _check_rate_limit_with_fallback(
        self,
        identifier: str,
        rate_limit: int
    ) -> Tuple[bool, int]:
        """
        Check rate limit using Redis with memory fallback.

        Returns:
            Tuple of (allowed: bool, remaining: int)
        """
        # Try Redis first
        allowed, remaining = await self.redis_limiter.check_rate_limit(identifier, rate_limit)

        if allowed is not None:
            # Redis worked
            if self._using_redis is not True:
                self._using_redis = True
                logger.info("Rate limiting: Using Redis backend")
            return allowed, remaining

        # Fall back to memory
        if self._using_redis is not False:
            self._using_redis = False
            logger.info("Rate limiting: Using in-memory fallback (Redis unavailable)")

        return self._allow_request_memory(identifier, rate_limit)

    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting"""
        # Prefer wallet address for authenticated requests
        wallet = request.headers.get("X-Wallet-Address")
        if wallet:
            return f"wallet:{wallet}"

        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _allow_request_memory(self, identifier: str, rate_limit: int) -> Tuple[bool, int]:
        """
        In-memory token bucket algorithm for rate limiting (fallback).

        Args:
            identifier: Unique identifier for the requester
            rate_limit: Maximum requests per minute

        Returns:
            Tuple of (allowed: bool, remaining: int)
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
                return True, tokens - 1
            else:
                # Update last_time but don't consume token
                self.bucket[identifier] = (last_time, tokens)
                return False, 0

    # Legacy method for backwards compatibility
    def allow_request(self, identifier: str, rate_limit: int) -> bool:
        """Legacy synchronous method - use _allow_request_memory instead."""
        allowed, _ = self._allow_request_memory(identifier, rate_limit)
        return allowed

    def _get_remaining_tokens(self, identifier: str) -> int:
        """Get remaining tokens for identifier (memory only)"""
        with self.lock:
            _, tokens = self.bucket.get(identifier, (time.time(), self.requests_per_minute))
            return tokens
