"""
Global Exception Handlers

Provides consistent error responses across the API.
SECURITY: Sanitizes error messages to prevent information leakage (SEC-009).
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import traceback
import os

logger = logging.getLogger(__name__)

# Determine if we're in production (hide sensitive error details)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors

    Returns structured error response with validation details.
    SECURITY: Sanitizes validation errors in production to prevent information leakage.
    """
    logger.error(
        f"Validation error on {request.method} {request.url.path}: {exc.errors()}"
    )

    # In production, sanitize error details to prevent information leakage
    if IS_PRODUCTION:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": "Validation error",
                "message": "Request validation failed. Please check your input and try again.",
                "support": "Contact support@varity.xyz for assistance"
            }
        )

    # In development, provide detailed validation errors for debugging
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "message": "Request validation failed",
            "details": exc.errors(),
            "path": str(request.url.path)
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all other uncaught exceptions

    Logs full traceback and returns generic error to client.
    SECURITY FIX (SEC-009): Sanitizes error messages in production to prevent:
    - Stack trace leakage
    - Internal path disclosure
    - Library version disclosure
    - Database schema leakage
    """
    # ALWAYS log full traceback for debugging (server-side only)
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}",
        exc_info=True
    )

    # Get exception details (for logging only)
    error_type = type(exc).__name__
    error_message = str(exc)
    tb = traceback.format_exc()

    # Log full details server-side for debugging
    logger.error(f"Exception type: {error_type}")
    logger.error(f"Exception message: {error_message}")
    logger.error(f"Traceback:\n{tb}")

    # SECURITY: In production, return ONLY generic error message
    # Never expose: stack traces, file paths, library versions, database errors
    if IS_PRODUCTION:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred. Please contact support if the issue persists.",
                "support": "support@varity.xyz",
                "request_id": request.headers.get("X-Request-ID", "unknown")
            }
        )

    # In development, provide detailed errors for debugging
    # WARNING: This exposes sensitive information - NEVER use in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "message": error_message,
            "type": error_type,
            "path": str(request.url.path),
            "traceback": tb.split("\n")[-10:]  # Last 10 lines of traceback
        }
    )
