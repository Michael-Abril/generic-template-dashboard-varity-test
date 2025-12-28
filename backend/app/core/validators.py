"""
Shared Validation Functions for API Endpoints

Created: December 28, 2025 (Terminal 1 - 100% Completion)
Purpose: Centralized validation functions to fix CRITICAL security issues:
- CRIT-G1, CRIT-O4, CRIT-S2, CRIT-S5: Wallet address validation
- CRIT-S1: Instance URL validation
- CRIT-S4: Salesforce ID validation
- CRIT-G3, CRIT-O3, CRIT-S3: Error sanitization
- HIGH-G2: Email validation
- HIGH-G5, HIGH-G6: File validation
"""
import re
import json
import logging
from typing import Optional, Any, Dict, List
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

# Maximum file size in bytes (10MB)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Allowed MIME types for file uploads
ALLOWED_MIME_TYPES = {
    # Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # Text
    "text/plain",
    "text/csv",
    "text/html",
    "text/markdown",
    # Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    # Archives
    "application/zip",
    "application/x-tar",
    "application/gzip",
    # Code/Data
    "application/json",
    "application/xml",
    "text/xml",
}

# Regex patterns
WALLET_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")
SALESFORCE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9]{15,18}$")
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


# ============================================================================
# Wallet Address Validation (CRIT-G1, CRIT-O4, CRIT-S2, CRIT-S5)
# ============================================================================

def validate_wallet_address(wallet_address: str) -> str:
    """
    Validate and normalize Ethereum wallet address.

    Args:
        wallet_address: The wallet address to validate

    Returns:
        Normalized (lowercase) wallet address

    Raises:
        HTTPException: If wallet address is invalid
    """
    if not wallet_address:
        raise HTTPException(
            status_code=400,
            detail="Wallet address is required"
        )

    # Strip whitespace
    wallet_address = wallet_address.strip()

    # Validate format
    if not WALLET_ADDRESS_PATTERN.match(wallet_address):
        logger.warning(f"Invalid wallet address format: {wallet_address[:10]}...")
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address format. Must be a valid Ethereum address (0x followed by 40 hex characters)"
        )

    # Normalize to lowercase for consistent storage and comparison
    return wallet_address.lower()


def normalize_wallet_address(wallet_address: str) -> str:
    """
    Normalize wallet address to lowercase without raising exception.
    Use validate_wallet_address() for API endpoints.

    Args:
        wallet_address: The wallet address to normalize

    Returns:
        Normalized (lowercase) wallet address or original if invalid
    """
    if not wallet_address:
        return ""

    wallet_address = wallet_address.strip()

    if WALLET_ADDRESS_PATTERN.match(wallet_address):
        return wallet_address.lower()

    return wallet_address.lower()


# ============================================================================
# Salesforce ID Validation (CRIT-S4)
# ============================================================================

def validate_salesforce_id(sf_id: str, object_type: str = "record") -> str:
    """
    Validate Salesforce record ID format.

    Salesforce IDs are either:
    - 15 characters (case-sensitive)
    - 18 characters (case-insensitive, includes checksum)

    Args:
        sf_id: The Salesforce ID to validate
        object_type: Type of object (for error message)

    Returns:
        Validated Salesforce ID (unchanged)

    Raises:
        HTTPException: If ID format is invalid
    """
    if not sf_id:
        raise HTTPException(
            status_code=400,
            detail=f"Salesforce {object_type} ID is required"
        )

    # Strip whitespace
    sf_id = sf_id.strip()

    # Validate format (15-18 alphanumeric characters)
    if not SALESFORCE_ID_PATTERN.match(sf_id):
        logger.warning(f"Invalid Salesforce ID format: {sf_id}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Salesforce {object_type} ID format. Must be 15-18 alphanumeric characters"
        )

    return sf_id


# ============================================================================
# Instance URL Validation (CRIT-S1)
# ============================================================================

def validate_instance_url(instance_url: Optional[str], provider: str = "Salesforce") -> str:
    """
    Validate and ensure instance URL is present and valid.

    Args:
        instance_url: The instance URL from provider_data
        provider: Provider name for error message

    Returns:
        Validated instance URL

    Raises:
        HTTPException: If instance URL is missing or invalid
    """
    if not instance_url:
        logger.error(f"{provider} instance URL is missing from provider_data")
        raise HTTPException(
            status_code=400,
            detail=f"{provider} instance URL not found. Please reconnect your {provider} account."
        )

    # Basic URL validation
    instance_url = instance_url.strip()

    if not instance_url.startswith("https://"):
        logger.error(f"Invalid {provider} instance URL (not HTTPS): {instance_url[:30]}...")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {provider} instance URL. Please reconnect your {provider} account."
        )

    return instance_url


# ============================================================================
# Email Validation (HIGH-G2)
# ============================================================================

def validate_email(email: str) -> str:
    """
    Validate email address format.

    Args:
        email: The email address to validate

    Returns:
        Validated email address (unchanged)

    Raises:
        HTTPException: If email format is invalid
    """
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email address is required"
        )

    email = email.strip()

    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email address format"
        )

    return email


def validate_email_list(emails: List[str], field_name: str = "recipients") -> List[str]:
    """
    Validate a list of email addresses.

    Args:
        emails: List of email addresses
        field_name: Name of field for error message

    Returns:
        List of validated emails

    Raises:
        HTTPException: If any email is invalid
    """
    if not emails:
        raise HTTPException(
            status_code=400,
            detail=f"At least one {field_name} email is required"
        )

    validated = []
    invalid = []

    for email in emails:
        email = email.strip()
        if EMAIL_PATTERN.match(email):
            validated.append(email)
        else:
            invalid.append(email)

    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} email address(es): {', '.join(invalid[:3])}{'...' if len(invalid) > 3 else ''}"
        )

    return validated


# ============================================================================
# File Validation (HIGH-G5, HIGH-G6)
# ============================================================================

def validate_file_size(file_content_base64: str, max_size_bytes: int = MAX_FILE_SIZE_BYTES) -> int:
    """
    Validate file size from base64 content.

    Args:
        file_content_base64: Base64 encoded file content
        max_size_bytes: Maximum allowed size in bytes

    Returns:
        Estimated file size in bytes

    Raises:
        HTTPException: If file exceeds size limit
    """
    if not file_content_base64:
        raise HTTPException(
            status_code=400,
            detail="File content is required"
        )

    # Base64 encoded data is ~33% larger than original
    # Actual size ≈ base64_length * 3 / 4
    estimated_size = len(file_content_base64) * 3 // 4

    if estimated_size > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        actual_mb = estimated_size / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File size ({actual_mb:.1f}MB) exceeds maximum allowed ({max_mb:.1f}MB)"
        )

    return estimated_size


def validate_mime_type(mime_type: str, allowed_types: set = None) -> str:
    """
    Validate MIME type against allowed types.

    Args:
        mime_type: The MIME type to validate
        allowed_types: Set of allowed MIME types (uses ALLOWED_MIME_TYPES if not provided)

    Returns:
        Validated MIME type

    Raises:
        HTTPException: If MIME type is not allowed
    """
    if not mime_type:
        raise HTTPException(
            status_code=400,
            detail="MIME type is required"
        )

    mime_type = mime_type.strip().lower()

    types_to_check = allowed_types or ALLOWED_MIME_TYPES

    if mime_type not in types_to_check:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{mime_type}' is not allowed. Allowed types include: PDF, Word, Excel, images, etc."
        )

    return mime_type


# ============================================================================
# Error Sanitization (CRIT-G3, CRIT-O3, CRIT-S3)
# ============================================================================

def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error message to prevent information disclosure.
    Never expose internal details, stack traces, tokens, or secrets.

    Args:
        error: The exception to sanitize

    Returns:
        Safe error message for API response
    """
    error_str = str(error).lower()

    # Check for sensitive patterns
    sensitive_patterns = [
        "token",
        "password",
        "secret",
        "key",
        "credential",
        "authorization",
        "bearer",
        "api_key",
        "access_token",
        "refresh_token",
        "session",
        "cookie",
    ]

    # If error contains sensitive data, return generic message
    for pattern in sensitive_patterns:
        if pattern in error_str:
            return "An authentication error occurred. Please try reconnecting your account."

    # Check for SQL/database errors
    db_patterns = ["sqlalchemy", "postgresql", "database", "relation", "column", "constraint"]
    for pattern in db_patterns:
        if pattern in error_str:
            return "A database error occurred. Please try again."

    # Check for network errors
    network_patterns = ["connection", "timeout", "refused", "unreachable", "dns"]
    for pattern in network_patterns:
        if pattern in error_str:
            return "A connection error occurred. Please try again."

    # For other errors, truncate and sanitize
    safe_msg = str(error)[:200]  # Limit length

    # Remove potential file paths
    safe_msg = re.sub(r'/[a-zA-Z0-9_/.-]+\.(py|json|env)', '[path]', safe_msg)

    # Remove potential IP addresses
    safe_msg = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '[ip]', safe_msg)

    return safe_msg if safe_msg else "An unexpected error occurred"


def sanitize_api_error(response_text: str, provider: str = "API") -> str:
    """
    Sanitize error response from external API.

    Args:
        response_text: Raw error response text
        provider: Name of the API provider

    Returns:
        Safe error message
    """
    try:
        error_data = json.loads(response_text)

        # Handle list of errors (Salesforce format)
        if isinstance(error_data, list):
            safe_errors = []
            for err in error_data[:3]:  # Limit to 3 errors
                if isinstance(err, dict):
                    safe_err = {}
                    for key in ["error", "errorCode", "error_description", "message", "fields"]:
                        if key in err:
                            safe_err[key] = str(err[key])[:100]  # Truncate
                    if safe_err:
                        safe_errors.append(safe_err)
            return json.dumps(safe_errors) if safe_errors else f"{provider} error"

        # Handle single error object
        if isinstance(error_data, dict):
            safe_fields = ["error", "error_description", "errorCode", "message", "fields", "code"]
            sanitized = {}
            for key in safe_fields:
                if key in error_data:
                    sanitized[key] = str(error_data[key])[:100]  # Truncate
            return json.dumps(sanitized) if sanitized else f"{provider} error"

        return f"{provider} error"

    except json.JSONDecodeError:
        # Not JSON, return generic message
        return f"{provider} error"


# ============================================================================
# DateTime Validation (HIGH-G3)
# ============================================================================

def validate_iso_datetime(datetime_str: str, field_name: str = "datetime") -> str:
    """
    Validate ISO 8601 datetime string.

    Args:
        datetime_str: The datetime string to validate
        field_name: Name of field for error message

    Returns:
        Validated datetime string

    Raises:
        HTTPException: If datetime format is invalid
    """
    from datetime import datetime

    if not datetime_str:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} is required"
        )

    datetime_str = datetime_str.strip()

    # Try common ISO formats
    formats = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            datetime.strptime(datetime_str.replace("+00:00", "Z"), fmt)
            return datetime_str
        except ValueError:
            continue

    raise HTTPException(
        status_code=400,
        detail=f"Invalid {field_name} format. Please use ISO 8601 format (e.g., 2024-01-01T12:00:00Z)"
    )


# ============================================================================
# OAuth Credential Validation (CRIT-O5)
# ============================================================================

def validate_oauth_credentials(
    client_id: Optional[str],
    client_secret: Optional[str],
    provider: str
) -> None:
    """
    Validate OAuth credentials are present before starting OAuth flow.

    Args:
        client_id: OAuth client ID
        client_secret: OAuth client secret
        provider: Provider name for error message

    Raises:
        HTTPException: If credentials are missing
    """
    if not client_id or client_id.strip() == "":
        logger.error(f"Missing OAuth client_id for {provider}")
        raise HTTPException(
            status_code=500,
            detail=f"{provider} integration is not configured. Please contact support."
        )

    if not client_secret or client_secret.strip() == "":
        logger.error(f"Missing OAuth client_secret for {provider}")
        raise HTTPException(
            status_code=500,
            detail=f"{provider} integration is not configured. Please contact support."
        )


# ============================================================================
# Pagination Validation (HIGH-G8)
# ============================================================================

def validate_pagination(
    page: int = 1,
    page_size: int = 50,
    max_page_size: int = 100
) -> tuple:
    """
    Validate and normalize pagination parameters.

    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        max_page_size: Maximum allowed page size

    Returns:
        Tuple of (offset, limit) for database query

    Raises:
        HTTPException: If parameters are invalid
    """
    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 50

    if page_size > max_page_size:
        page_size = max_page_size

    offset = (page - 1) * page_size

    return offset, page_size
