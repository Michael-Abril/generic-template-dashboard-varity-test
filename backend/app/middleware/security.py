"""
Security Headers Middleware

Implements comprehensive security headers to protect against:
- XSS (Cross-Site Scripting)
- Clickjacking
- MIME-type sniffing
- Protocol downgrade attacks
- Referrer leakage
- Excessive permissions

Target: A+ rating on SecurityHeaders.com
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging
import os

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add comprehensive security headers to all HTTP responses.

    Headers implemented:
    - X-Frame-Options: Prevents clickjacking attacks
    - X-Content-Type-Options: Prevents MIME-type sniffing
    - X-XSS-Protection: Enables browser XSS protection (legacy)
    - Content-Security-Policy: Comprehensive CSP to prevent XSS
    - Strict-Transport-Security: Forces HTTPS (production only)
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Restricts browser features
    - X-Permitted-Cross-Domain-Policies: Restricts cross-domain policies
    - Cross-Origin-Embedder-Policy: Enables cross-origin isolation
    - Cross-Origin-Opener-Policy: Protects from cross-origin attacks
    - Cross-Origin-Resource-Policy: Controls resource sharing
    """

    def __init__(self, app, enable_hsts: bool = None):
        """
        Initialize security headers middleware.

        Args:
            app: FastAPI application
            enable_hsts: Force HSTS header even on HTTP (for testing).
                        If None, auto-detects based on request scheme.
        """
        super().__init__(app)
        self.enable_hsts = enable_hsts
        self.environment = os.getenv("ENVIRONMENT", "development")

    async def dispatch(self, request: Request, call_next):
        """Add security headers to all responses"""
        response = await call_next(request)

        # ========================================
        # LAYER 1: CLICKJACKING PROTECTION
        # ========================================

        # Prevent clickjacking by disallowing iframe embedding
        response.headers["X-Frame-Options"] = "DENY"

        # ========================================
        # LAYER 2: MIME-TYPE SNIFFING PROTECTION
        # ========================================

        # Prevent browsers from MIME-sniffing content types
        response.headers["X-Content-Type-Options"] = "nosniff"

        # ========================================
        # LAYER 3: XSS PROTECTION (LEGACY)
        # ========================================

        # Enable browser XSS protection (legacy but still useful)
        # Modern browsers rely on CSP, but this provides defense-in-depth
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # ========================================
        # LAYER 4: CONTENT SECURITY POLICY (CSP)
        # ========================================

        # Comprehensive CSP to prevent XSS and injection attacks
        csp_directives = [
            "default-src 'self'",  # Only load resources from same origin by default

            # Allow scripts from self + trusted CDNs
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live",

            # Allow styles from self + inline styles (required for many frameworks)
            "style-src 'self' 'unsafe-inline'",

            # Allow images from self + data URIs + HTTPS
            "img-src 'self' data: https: blob:",

            # Allow fonts from self + data URIs
            "font-src 'self' data:",

            # Allow connections to self + Varity RPC + external APIs
            "connect-src 'self' https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz wss://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz https://*.pinata.cloud https://*.varity.app https://*.varity.xyz",

            # Prevent framing
            "frame-ancestors 'none'",

            # Upgrade insecure requests to HTTPS
            "upgrade-insecure-requests",

            # Block all mixed content
            "block-all-mixed-content",
        ]

        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # ========================================
        # LAYER 5: STRICT TRANSPORT SECURITY (HSTS)
        # ========================================

        # Force HTTPS for 1 year (including all subdomains)
        # Only enable on HTTPS connections or if explicitly enabled
        if request.url.scheme == "https" or self.enable_hsts:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
            logger.debug("HSTS header added")

        # ========================================
        # LAYER 6: REFERRER POLICY
        # ========================================

        # Control referrer information leakage
        # Send full URL for same-origin, only origin for cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # ========================================
        # LAYER 7: PERMISSIONS POLICY
        # ========================================

        # Restrict browser features to minimize attack surface
        permissions_directives = [
            "geolocation=()",          # No geolocation access
            "microphone=()",           # No microphone access
            "camera=()",               # No camera access
            "payment=(self)",          # Payment API only from same origin
            "usb=()",                  # No USB access
            "magnetometer=()",         # No magnetometer access
            "gyroscope=()",            # No gyroscope access
            "accelerometer=()",        # No accelerometer access
            "fullscreen=(self)",       # Fullscreen only from same origin
            "display-capture=()",      # No screen capture
        ]

        response.headers["Permissions-Policy"] = ", ".join(permissions_directives)

        # ========================================
        # LAYER 8: CROSS-ORIGIN POLICIES
        # ========================================

        # Restrict cross-domain policies (for Adobe Flash, etc.)
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # Enable cross-origin isolation for enhanced security
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"

        # Protect from cross-origin attacks
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"

        # Control resource sharing
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # ========================================
        # LAYER 9: ADDITIONAL SECURITY HEADERS
        # ========================================

        # Remove server identification (hide uvicorn version)
        response.headers["Server"] = "Varity API"

        # Disable DNS prefetching (privacy)
        response.headers["X-DNS-Prefetch-Control"] = "off"

        # Disable client-side caching of sensitive endpoints
        if any(sensitive in request.url.path for sensitive in ["/api/v1/ai", "/api/v1/settings", "/api/v1/oauth"]):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        # Log security headers application (debug only)
        if self.environment == "development":
            logger.debug(f"Applied security headers to {request.url.path}")

        return response
