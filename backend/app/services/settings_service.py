"""
Settings Service

Manages user settings, preferences, and API keys with secure key generation.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.models.user_settings import UserSettings, APIKey
from app.models.purchase import Purchase, Subscription, OAuthToken, SyncLog, IntegrationConfig

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for managing user settings and API keys"""

    async def get_user_settings(
        self,
        db: AsyncSession,
        wallet_address: str
    ) -> UserSettings:
        """
        Get user settings, creating default settings if they don't exist

        Args:
            db: Database session
            wallet_address: User's wallet address

        Returns:
            UserSettings object
        """
        try:
            # Try to fetch existing settings
            result = await db.execute(
                select(UserSettings).where(UserSettings.wallet_address == wallet_address)
            )
            settings = result.scalar_one_or_none()

            # Create default settings if they don't exist
            if not settings:
                settings = UserSettings(
                    wallet_address=wallet_address,
                    company_name=None,
                    industry=None,
                    timezone="UTC",
                    language="en",
                    notification_preferences={
                        "weekly_summary": True,
                        "integration_updates": True,
                        "billing_alerts": True,
                        "security_alerts": True,
                        "new_features": False
                    },
                    ui_preferences={
                        "theme": "light",
                        "compact_mode": False
                    }
                )
                db.add(settings)
                await db.commit()
                await db.refresh(settings)
                logger.info(f"Created default settings for wallet {wallet_address}")

            return settings

        except Exception as e:
            logger.error(f"Error fetching settings for {wallet_address}: {str(e)}")
            raise

    async def update_user_settings(
        self,
        db: AsyncSession,
        wallet_address: str,
        settings_update: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update user settings

        Args:
            db: Database session
            wallet_address: User's wallet address
            settings_update: Dictionary of settings to update

        Returns:
            Updated UserSettings object
        """
        try:
            # First ensure settings exist (creates default if not)
            existing = await self.get_user_settings(db, wallet_address)

            # Build update values dict with only allowed fields
            allowed_fields = [
                "company_name", "industry", "timezone", "language",
                "notification_preferences", "ui_preferences"
            ]

            update_values = {}
            for field, value in settings_update.items():
                if field in allowed_fields and value is not None:
                    update_values[field] = value

            # Always set updated_at
            now = datetime.utcnow()
            update_values["updated_at"] = now

            # Execute UPDATE statement directly
            stmt = (
                update(UserSettings)
                .where(UserSettings.wallet_address == wallet_address)
                .values(**update_values)
            )
            await db.execute(stmt)
            await db.commit()

            # Fetch the updated record to return
            result = await db.execute(
                select(UserSettings).where(UserSettings.wallet_address == wallet_address)
            )
            updated = result.scalar_one()

            # Build response dict
            result_dict = {
                "id": updated.id,
                "wallet_address": updated.wallet_address,
                "company_name": updated.company_name,
                "industry": updated.industry,
                "timezone": updated.timezone or "UTC",
                "language": updated.language or "en",
                "notification_preferences": updated.notification_preferences or {},
                "ui_preferences": updated.ui_preferences or {},
                "created_at": updated.created_at,
                "updated_at": updated.updated_at
            }

            logger.info(f"Updated settings for wallet {wallet_address}")
            return result_dict

        except Exception as e:
            logger.error(f"Error updating settings for {wallet_address}: {str(e)}")
            await db.rollback()
            raise

    async def generate_api_key(
        self,
        db: AsyncSession,
        wallet_address: str,
        name: str,
        expires_in_days: Optional[int] = None
    ) -> Tuple[str, APIKey]:
        """
        Generate a new API key for the user

        Args:
            db: Database session
            wallet_address: User's wallet address
            name: User-defined name for the key
            expires_in_days: Optional expiration in days

        Returns:
            Tuple of (plaintext_key, APIKey object)
        """
        try:
            # Generate cryptographically secure API key (32 bytes = 64 hex chars)
            plaintext_key = secrets.token_urlsafe(32)

            # Create SHA-256 hash for storage
            key_hash = hashlib.sha256(plaintext_key.encode()).hexdigest()

            # Get first 8 characters as prefix for display
            key_prefix = plaintext_key[:8]

            # Calculate expiration if specified
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

            # Create API key record
            api_key = APIKey(
                wallet_address=wallet_address,
                key_hash=key_hash,
                key_prefix=key_prefix,
                name=name,
                is_active=True,
                expires_at=expires_at
            )

            db.add(api_key)
            await db.commit()
            await db.refresh(api_key)

            logger.info(f"Generated API key '{name}' for wallet {wallet_address}")

            # Return plaintext key (ONLY TIME IT'S RETURNED) and the record
            return plaintext_key, api_key

        except Exception as e:
            logger.error(f"Error generating API key for {wallet_address}: {str(e)}")
            await db.rollback()
            raise

    async def validate_api_key(
        self,
        db: AsyncSession,
        api_key: str
    ) -> Optional[str]:
        """
        Validate API key and return wallet address if valid

        Args:
            db: Database session
            api_key: Plaintext API key to validate

        Returns:
            Wallet address if valid, None otherwise
        """
        try:
            # Hash the provided key
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()

            # Look up the key
            result = await db.execute(
                select(APIKey).where(
                    and_(
                        APIKey.key_hash == key_hash,
                        APIKey.is_active == True
                    )
                )
            )
            api_key_record = result.scalar_one_or_none()

            if not api_key_record:
                return None

            # Check expiration
            if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
                logger.warning(f"API key {api_key_record.key_prefix} has expired")
                return None

            # Update last_used_at
            api_key_record.last_used_at = datetime.utcnow()
            await db.commit()

            return api_key_record.wallet_address

        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return None

    async def revoke_api_key(
        self,
        db: AsyncSession,
        wallet_address: str,
        key_id: int
    ) -> bool:
        """
        Revoke (deactivate) an API key

        Args:
            db: Database session
            wallet_address: Owner's wallet address
            key_id: ID of the key to revoke

        Returns:
            True if revoked, False otherwise
        """
        try:
            # Get the key and verify ownership
            result = await db.execute(
                select(APIKey).where(
                    and_(
                        APIKey.id == key_id,
                        APIKey.wallet_address == wallet_address
                    )
                )
            )
            api_key = result.scalar_one_or_none()

            if not api_key:
                logger.warning(f"API key {key_id} not found for wallet {wallet_address}")
                return False

            # Deactivate the key
            api_key.is_active = False
            await db.commit()

            logger.info(f"Revoked API key {key_id} for wallet {wallet_address}")
            return True

        except Exception as e:
            logger.error(f"Error revoking API key {key_id}: {str(e)}")
            await db.rollback()
            raise

    async def list_api_keys(
        self,
        db: AsyncSession,
        wallet_address: str
    ) -> List[APIKey]:
        """
        List all API keys for a user (without revealing the actual keys)

        Args:
            db: Database session
            wallet_address: User's wallet address

        Returns:
            List of APIKey objects
        """
        try:
            result = await db.execute(
                select(APIKey)
                .where(APIKey.wallet_address == wallet_address)
                .order_by(APIKey.created_at.desc())
            )
            api_keys = result.scalars().all()

            logger.info(f"Listed {len(api_keys)} API keys for wallet {wallet_address}")
            return list(api_keys)

        except Exception as e:
            logger.error(f"Error listing API keys for {wallet_address}: {str(e)}")
            raise

    async def delete_account(
        self,
        db: AsyncSession,
        wallet_address: str
    ) -> Dict[str, Any]:
        """
        Delete all account data for a user

        This permanently deletes:
        - User settings
        - API keys
        - OAuth tokens
        - Purchases and subscriptions
        - Sync logs
        - Integration configs

        Args:
            db: Database session
            wallet_address: User's wallet address

        Returns:
            Dict with deletion summary
        """
        try:
            deleted_counts = {
                "settings": 0,
                "api_keys": 0,
                "oauth_tokens": 0,
                "sync_logs": 0,
                "integration_configs": 0,
                "subscriptions": 0,
                "purchases": 0,
            }

            # Delete sync logs first (references oauth_tokens and purchases)
            result = await db.execute(
                select(SyncLog).where(SyncLog.user_address == wallet_address)
            )
            sync_logs = result.scalars().all()
            for log in sync_logs:
                await db.delete(log)
            deleted_counts["sync_logs"] = len(sync_logs)

            # Delete integration configs
            result = await db.execute(
                select(IntegrationConfig).where(IntegrationConfig.user_address == wallet_address)
            )
            configs = result.scalars().all()
            for config in configs:
                await db.delete(config)
            deleted_counts["integration_configs"] = len(configs)

            # Delete OAuth tokens
            result = await db.execute(
                select(OAuthToken).where(OAuthToken.user_address == wallet_address)
            )
            tokens = result.scalars().all()
            for token in tokens:
                await db.delete(token)
            deleted_counts["oauth_tokens"] = len(tokens)

            # Delete subscriptions (references purchases)
            result = await db.execute(
                select(Subscription).where(Subscription.user_address == wallet_address)
            )
            subs = result.scalars().all()
            for sub in subs:
                await db.delete(sub)
            deleted_counts["subscriptions"] = len(subs)

            # Delete purchases
            result = await db.execute(
                select(Purchase).where(Purchase.user_address == wallet_address)
            )
            purchases = result.scalars().all()
            for purchase in purchases:
                await db.delete(purchase)
            deleted_counts["purchases"] = len(purchases)

            # Delete API keys
            result = await db.execute(
                select(APIKey).where(APIKey.wallet_address == wallet_address)
            )
            api_keys = result.scalars().all()
            for key in api_keys:
                await db.delete(key)
            deleted_counts["api_keys"] = len(api_keys)

            # Delete user settings
            result = await db.execute(
                select(UserSettings).where(UserSettings.wallet_address == wallet_address)
            )
            settings = result.scalar_one_or_none()
            if settings:
                await db.delete(settings)
                deleted_counts["settings"] = 1

            await db.commit()

            logger.info(f"Deleted account for wallet {wallet_address}: {deleted_counts}")
            return deleted_counts

        except Exception as e:
            logger.error(f"Error deleting account for {wallet_address}: {str(e)}")
            await db.rollback()
            raise


# Singleton instance
settings_service = SettingsService()
