"""
Settings API Endpoints

Provides endpoints for managing user settings, preferences, and API keys.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from app.core.database import get_db
from app.services.settings_service import settings_service
from app.services.filecoin_service import FilecoinService

logger = logging.getLogger(__name__)

# Initialize Filecoin service for storage queries
filecoin_service = FilecoinService()

router = APIRouter()


# Pydantic models for request/response
class NotificationPreferences(BaseModel):
    """Notification preferences"""
    weekly_summary: Optional[bool] = None
    integration_updates: Optional[bool] = None
    billing_alerts: Optional[bool] = None
    security_alerts: Optional[bool] = None
    new_features: Optional[bool] = None


class UIPreferences(BaseModel):
    """UI preferences"""
    theme: Optional[str] = Field(None, pattern="^(light|dark)$")
    compact_mode: Optional[bool] = None


class SettingsUpdateRequest(BaseModel):
    """Request to update user settings"""
    company_name: Optional[str] = None
    industry: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    # New company profile fields for AI personalization
    company_size: Optional[str] = None  # "1", "2-10", "11-50", "51-200", "201-500", "500+"
    primary_goal: Optional[str] = None  # User's primary use case
    # Contact info for GTM follow-up
    contact_email: Optional[str] = None  # Primary contact email for trial communications
    contact_name: Optional[str] = None  # Contact person name
    referral_source: Optional[str] = None  # How did they hear about us
    # Trial fields
    trial_tier: Optional[str] = None  # "30_day" or "14_day"
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    # Onboarding tracking
    onboarding_completed: Optional[bool] = None
    onboarding_completed_at: Optional[datetime] = None
    onboarding_step: Optional[str] = None
    # JSON preferences
    notification_preferences: Optional[Dict[str, bool]] = None
    ui_preferences: Optional[Dict[str, Any]] = None


class SettingsResponse(BaseModel):
    """User settings response"""
    wallet_address: str
    company_name: Optional[str] = None
    industry: Optional[str] = None
    timezone: str
    language: str
    # Company profile fields
    company_size: Optional[str] = None
    primary_goal: Optional[str] = None
    # Contact info for GTM follow-up
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    referral_source: Optional[str] = None
    # Trial fields
    trial_tier: Optional[str] = None
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    # Onboarding tracking
    onboarding_completed: bool = False
    onboarding_completed_at: Optional[datetime] = None
    onboarding_step: Optional[str] = None
    # JSON preferences
    notification_preferences: Dict[str, bool]
    ui_preferences: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class APIKeyCreateRequest(BaseModel):
    """Request to create new API key"""
    name: str = Field(..., min_length=1, max_length=100)
    expires_in_days: Optional[int] = Field(None, gt=0, le=365)


class APIKeyResponse(BaseModel):
    """API key response (without revealing the actual key)"""
    id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class APIKeyCreateResponse(BaseModel):
    """Response when creating new API key (includes actual key)"""
    api_key: str
    key_info: APIKeyResponse
    warning: str = "Save this API key now. You won't be able to see it again!"


# Endpoints
@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user settings

    Returns user preferences and settings. Creates default settings if none exist.
    """
    try:
        settings = await settings_service.get_user_settings(db, wallet_address)
        return settings

    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch settings: {str(e)}"
        )


@router.put("/settings")
async def update_settings(
    wallet_address: str = Query(..., description="User's wallet address"),
    settings_update: SettingsUpdateRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user settings

    Updates one or more user settings. Only provided fields will be updated.
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        update_data = settings_update.model_dump(exclude_none=True) if settings_update else {}

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No settings provided to update"
            )

        updated_settings = await settings_service.update_user_settings(
            db, wallet_address, update_data
        )

        # Service returns a dict with all values
        return {
            "wallet_address": updated_settings["wallet_address"],
            "company_name": updated_settings["company_name"],
            "industry": updated_settings["industry"],
            "timezone": updated_settings["timezone"],
            "language": updated_settings["language"],
            # Company profile fields
            "company_size": updated_settings.get("company_size"),
            "primary_goal": updated_settings.get("primary_goal"),
            # Contact info for GTM follow-up
            "contact_email": updated_settings.get("contact_email"),
            "contact_name": updated_settings.get("contact_name"),
            "referral_source": updated_settings.get("referral_source"),
            # Trial fields
            "trial_tier": updated_settings.get("trial_tier"),
            "trial_start_date": updated_settings.get("trial_start_date").isoformat() if updated_settings.get("trial_start_date") else None,
            "trial_end_date": updated_settings.get("trial_end_date").isoformat() if updated_settings.get("trial_end_date") else None,
            # Onboarding tracking
            "onboarding_completed": updated_settings.get("onboarding_completed", False),
            "onboarding_completed_at": updated_settings.get("onboarding_completed_at").isoformat() if updated_settings.get("onboarding_completed_at") else None,
            "onboarding_step": updated_settings.get("onboarding_step"),
            # JSON preferences
            "notification_preferences": updated_settings["notification_preferences"],
            "ui_preferences": updated_settings["ui_preferences"],
            "created_at": updated_settings["created_at"].isoformat() if updated_settings["created_at"] else None,
            "updated_at": updated_settings["updated_at"].isoformat() if updated_settings["updated_at"] else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )


@router.get("/settings/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    List API keys

    Returns all API keys for the user (without revealing the actual keys).
    Shows key prefix, name, status, and usage information.
    """
    try:
        api_keys = await settings_service.list_api_keys(db, wallet_address)
        return api_keys

    except Exception as e:
        logger.error(f"Error listing API keys: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list API keys: {str(e)}"
        )


@router.post("/settings/api-keys", response_model=APIKeyCreateResponse)
async def create_api_key(
    wallet_address: str = Query(..., description="User's wallet address"),
    request: APIKeyCreateRequest = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate new API key

    Creates a new API key for programmatic access.
    **IMPORTANT**: The actual API key is only returned once. Save it securely!
    """
    try:
        if not request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body required"
            )

        plaintext_key, api_key_record = await settings_service.generate_api_key(
            db,
            wallet_address,
            request.name,
            request.expires_in_days
        )

        return APIKeyCreateResponse(
            api_key=plaintext_key,
            key_info=APIKeyResponse.model_validate(api_key_record),
            warning="Save this API key now. You won't be able to see it again!"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )


@router.delete("/settings/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke API key

    Deactivates an API key. The key will no longer work for authentication.
    """
    try:
        success = await settings_service.revoke_api_key(db, wallet_address, key_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"API key {key_id} not found or not owned by this wallet"
            )

        return {
            "success": True,
            "message": f"API key {key_id} has been revoked",
            "key_id": key_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke API key: {str(e)}"
        )


@router.post("/settings/api-keys/validate")
async def validate_api_key(
    api_key: str = Query(..., description="API key to validate"),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate API key

    Checks if an API key is valid and returns the associated wallet address.
    This endpoint can be used by middleware for API authentication.
    """
    try:
        wallet_address = await settings_service.validate_api_key(db, api_key)

        if not wallet_address:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired API key"
            )

        return {
            "valid": True,
            "wallet_address": wallet_address
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate API key: {str(e)}"
        )


@router.delete("/account")
async def delete_account(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete user account

    Permanently deletes all user data including:
    - User settings and preferences
    - API keys
    - OAuth tokens and integrations
    - Purchases and subscriptions
    - Sync logs and integration configs

    **WARNING**: This action is irreversible.
    """
    try:
        if not wallet_address or len(wallet_address) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid wallet address"
            )

        deleted_counts = await settings_service.delete_account(db, wallet_address)

        return {
            "success": True,
            "message": "Account and all associated data have been permanently deleted",
            "deleted": deleted_counts
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )


@router.get("/storage-usage")
async def get_storage_usage(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Get Pinata storage usage for this wallet.

    Returns the actual files stored in Pinata grouped by integration,
    showing file counts and data types for each connected service.
    Includes per-data-type counts for professional display.
    """
    try:
        logger.info(f"Getting storage usage for wallet {wallet_address}")

        # List all files for this wallet from Pinata
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            limit=1000
        )

        if not files:
            return {
                "success": True,
                "wallet_address": wallet_address,
                "total_files": 0,
                "integrations": {},
                "uploaded_content": {"total_files": 0, "files": []},
                "message": "No data stored yet. Connect an integration and sync data."
            }

        # Integration display name mappings for consistency
        integration_aliases = {
            "google_workspace": "google",  # Normalize google_workspace to google
        }

        # Data types to exclude from user-facing counts (internal/system data)
        excluded_data_types = {"oauth-credentials", "oauth_credentials"}

        # Friendly display names for data types
        data_type_display_names = {
            "gmail": "Emails",
            "calendar": "Events",
            "drive": "Files",
            "contacts": "Contacts",
            "tasks": "Tasks",
            "invoices": "Invoices",
            "expenses": "Expenses",
            "customers": "Customers",
            "vendors": "Vendors",
            "payments": "Payments",
            "users": "Users",
            "channels": "Channels",
            "messages": "Messages",
            "files": "Files",
            "deals": "Deals",
            "companies": "Companies",
            "tickets": "Tickets",
            "opportunities": "Opportunities",
            "accounts": "Accounts",
            "leads": "Leads",
            "mail": "Emails",
            "onedrive": "Files",
        }

        # Group files by integration with per-data-type counts
        by_integration: Dict[str, Dict[str, Any]] = {}
        uploaded_content = {"total_files": 0, "total_bytes": 0, "files": []}
        total_size = 0

        for f in files:
            metadata = f.get("metadata", {})
            raw_integration = metadata.get("integration", "unknown")
            data_type = metadata.get("data_type", "unknown")
            file_size = f.get("size", 0)
            timestamp = f.get("timestamp")
            filename = metadata.get("filename", f.get("name", ""))

            # Skip excluded data types from counts
            if data_type.lower() in excluded_data_types:
                total_size += file_size
                continue

            # Check if this is uploaded content (manual uploads from AI Assistant)
            if raw_integration in ("uploads", "documents", "uploaded", "manual"):
                uploaded_content["total_files"] += 1
                uploaded_content["total_bytes"] += file_size
                uploaded_content["files"].append({
                    "name": filename,
                    "size": file_size,
                    "uploaded_at": timestamp,
                    "type": data_type
                })
                total_size += file_size
                continue

            # Normalize integration name
            integration = integration_aliases.get(raw_integration, raw_integration)

            if integration not in by_integration:
                by_integration[integration] = {
                    "file_count": 0,
                    "data_types": {},  # Changed from list to dict for counts
                    "total_bytes": 0,
                    "latest_sync": None,
                    "sync_status": "success"  # Will be determined later
                }

            by_integration[integration]["file_count"] += 1
            by_integration[integration]["total_bytes"] += file_size
            total_size += file_size

            # Track counts per data type
            data_type_key = data_type.lower()
            if data_type_key not in by_integration[integration]["data_types"]:
                by_integration[integration]["data_types"][data_type_key] = {
                    "count": 0,
                    "display_name": data_type_display_names.get(data_type_key, data_type.title())
                }
            by_integration[integration]["data_types"][data_type_key]["count"] += 1

            # Track latest sync timestamp
            if timestamp:
                current_latest = by_integration[integration]["latest_sync"]
                if not current_latest or timestamp > current_latest:
                    by_integration[integration]["latest_sync"] = timestamp

        # Format size in human readable format
        def format_size(bytes_val: int) -> str:
            if bytes_val < 1024:
                return f"{bytes_val} B"
            elif bytes_val < 1024 * 1024:
                return f"{bytes_val / 1024:.1f} KB"
            elif bytes_val < 1024 * 1024 * 1024:
                return f"{bytes_val / (1024 * 1024):.2f} MB"
            else:
                return f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"

        # Add formatted size to each integration
        for integration in by_integration:
            by_integration[integration]["total_size_formatted"] = format_size(
                by_integration[integration]["total_bytes"]
            )

        # Format uploaded content size
        uploaded_content["total_size_formatted"] = format_size(uploaded_content["total_bytes"])

        return {
            "success": True,
            "wallet_address": wallet_address,
            "total_files": len(files),
            "total_bytes": total_size,
            "total_size_formatted": format_size(total_size),
            "integrations": by_integration,
            "uploaded_content": uploaded_content
        }

    except Exception as e:
        logger.error(f"Error getting storage usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage usage: {str(e)}"
        )
