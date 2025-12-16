"""
Settings API Endpoints

Provides endpoints for managing user settings, preferences, and API keys.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from app.core.database import get_db
from app.services.settings_service import settings_service

logger = logging.getLogger(__name__)

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
    notification_preferences: Optional[Dict[str, bool]] = None
    ui_preferences: Optional[Dict[str, Any]] = None


class SettingsResponse(BaseModel):
    """User settings response"""
    wallet_address: str
    company_name: Optional[str] = None
    industry: Optional[str] = None
    timezone: str
    language: str
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


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    wallet_address: str = Query(..., description="User's wallet address"),
    settings_update: SettingsUpdateRequest = None,
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
        return updated_settings

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
