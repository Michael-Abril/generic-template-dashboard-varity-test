"""
Marketplace Purchase Management API

Endpoints for managing user purchases, subscriptions, and integrations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.models.marketplace import Product, PricingPlan
from app.models.purchase import (
    Purchase, Subscription, OAuthToken, SyncLog, IntegrationConfig,
    SubscriptionStatus, SyncStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["marketplace-purchases"], prefix="/marketplace")


# =====================================================================
# RESPONSE MODELS
# =====================================================================

class PurchaseInfo(BaseModel):
    """User purchase information"""
    purchase_id: int
    product_id: int
    product_name: str
    product_slug: str
    pricing_plan: str
    transaction_hash: str
    license_nft_id: Optional[int]
    purchase_date: datetime
    activation_date: Optional[datetime]
    expiry_date: Optional[datetime]
    is_active: bool
    has_oauth_connection: bool
    last_sync: Optional[datetime]
    subscription_status: Optional[str]


class IntegrationStatus(BaseModel):
    """Integration connection status"""
    product_id: int
    product_name: str
    product_slug: str
    is_purchased: bool
    is_connected: bool
    connection_date: Optional[datetime]
    last_sync: Optional[datetime]
    sync_status: Optional[str]
    account_name: Optional[str]
    account_email: Optional[str]


class ConnectIntegrationRequest(BaseModel):
    """Request to connect an integration"""
    product_id: int
    auth_code: Optional[str] = Field(None, description="OAuth authorization code")
    access_token: Optional[str] = Field(None, description="Direct access token (for API key auth)")
    refresh_token: Optional[str] = Field(None)
    account_id: Optional[str] = Field(None)
    account_email: Optional[str] = Field(None)
    account_name: Optional[str] = Field(None)


class DisconnectIntegrationRequest(BaseModel):
    """Request to disconnect an integration"""
    product_id: int


# =====================================================================
# USER PURCHASES ENDPOINTS
# =====================================================================

@router.get("/my-purchases", response_model=List[PurchaseInfo])
async def get_user_purchases(
    wallet_address: str = Query(..., description="User's wallet address"),
    active_only: bool = Query(False, description="Filter to active purchases only"),
    db: AsyncSession = Depends(get_db)
):
    """Get all purchases for a user"""
    try:
        # Build query
        query = select(Purchase).where(
            Purchase.user_address == wallet_address.lower()
        ).options(
            selectinload(Purchase.product),
            selectinload(Purchase.pricing_plan),
            selectinload(Purchase.subscription),
            selectinload(Purchase.oauth_tokens)
        ).order_by(desc(Purchase.purchase_date))

        if active_only:
            query = query.where(Purchase.is_active == True)

        result = await db.execute(query)
        purchases = result.scalars().all()

        # Format response
        purchase_list = []
        for purchase in purchases:
            # Check if has OAuth connection
            has_oauth = any(
                token.is_active for token in purchase.oauth_tokens
            ) if purchase.oauth_tokens else False

            # Get last sync time
            last_sync = None
            if purchase.oauth_tokens:
                for token in purchase.oauth_tokens:
                    if token.is_active and token.last_sync_at:
                        last_sync = token.last_sync_at
                        break

            # Get subscription status
            sub_status = None
            if purchase.subscription:
                sub_status = purchase.subscription.status.value

            purchase_list.append(PurchaseInfo(
                purchase_id=purchase.id,
                product_id=purchase.product.id,
                product_name=purchase.product.name,
                product_slug=purchase.product.slug,
                pricing_plan=purchase.pricing_plan.name if purchase.pricing_plan else "Unknown",
                transaction_hash=purchase.transaction_hash,
                license_nft_id=purchase.license_nft_id,
                purchase_date=purchase.purchase_date,
                activation_date=purchase.activation_date,
                expiry_date=purchase.expiry_date,
                is_active=purchase.is_active,
                has_oauth_connection=has_oauth,
                last_sync=last_sync,
                subscription_status=sub_status
            ))

        return purchase_list

    except Exception as e:
        logger.error(f"Error fetching user purchases: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch purchases")


@router.get("/my-integrations", response_model=List[IntegrationStatus])
async def get_user_integrations(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Get status of all integrations for a user"""
    try:
        # Get all user's purchases
        purchases_result = await db.execute(
            select(Purchase).where(
                Purchase.user_address == wallet_address.lower()
            ).options(
                selectinload(Purchase.product),
                selectinload(Purchase.oauth_tokens),
                selectinload(Purchase.sync_logs)
            )
        )
        purchases = purchases_result.scalars().all()

        # Build integration status map
        integrations_map = {}

        for purchase in purchases:
            product_id = purchase.product.id

            # Skip if we already have this product
            if product_id in integrations_map:
                continue

            # Find active OAuth token
            active_token = None
            if purchase.oauth_tokens:
                for token in purchase.oauth_tokens:
                    if token.is_active:
                        active_token = token
                        break

            # Find latest sync
            latest_sync = None
            if purchase.sync_logs:
                latest_sync = max(purchase.sync_logs, key=lambda s: s.started_at or datetime.min)

            integrations_map[product_id] = IntegrationStatus(
                product_id=product_id,
                product_name=purchase.product.name,
                product_slug=purchase.product.slug,
                is_purchased=True,
                is_connected=active_token is not None,
                connection_date=active_token.connected_at if active_token else None,
                last_sync=active_token.last_sync_at if active_token else None,
                sync_status=latest_sync.status.value if latest_sync else None,
                account_name=active_token.account_name if active_token else None,
                account_email=active_token.account_email if active_token else None
            )

        return list(integrations_map.values())

    except Exception as e:
        logger.error(f"Error fetching user integrations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch integrations")


# =====================================================================
# INTEGRATION CONNECTION ENDPOINTS
# =====================================================================

@router.post("/connect-integration")
async def connect_integration(
    wallet_address: str,
    request: ConnectIntegrationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Connect an integration after OAuth callback"""
    try:
        # Verify user has purchased this product
        purchase_result = await db.execute(
            select(Purchase).where(
                and_(
                    Purchase.user_address == wallet_address.lower(),
                    Purchase.product_id == request.product_id,
                    Purchase.is_active == True
                )
            ).options(
                selectinload(Purchase.product)
            )
        )
        purchase = purchase_result.scalar_one_or_none()

        if not purchase:
            raise HTTPException(
                status_code=403,
                detail="You must purchase this product before connecting"
            )

        # Deactivate any existing tokens for this product
        existing_tokens = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == wallet_address.lower(),
                    OAuthToken.product_id == request.product_id,
                    OAuthToken.is_active == True
                )
            )
        )
        for token in existing_tokens.scalars():
            token.is_active = False

        # Create new OAuth token
        oauth_token = OAuthToken(
            user_address=wallet_address.lower(),
            purchase_id=purchase.id,
            product_id=request.product_id,
            provider=purchase.product.slug,
            access_token=request.access_token or request.auth_code,  # Will be exchanged for token
            refresh_token=request.refresh_token,
            token_type="Bearer",
            expires_at=datetime.utcnow() + timedelta(hours=1),  # Default 1 hour
            account_id=request.account_id,
            account_email=request.account_email,
            account_name=request.account_name,
            is_active=True,
            connected_at=datetime.utcnow(),
            provider_data={}
        )

        db.add(oauth_token)

        # Update purchase activation date
        if not purchase.activation_date:
            purchase.activation_date = datetime.utcnow()

        # Create integration config if doesn't exist
        config_result = await db.execute(
            select(IntegrationConfig).where(
                and_(
                    IntegrationConfig.user_address == wallet_address.lower(),
                    IntegrationConfig.product_id == request.product_id
                )
            )
        )
        if not config_result.scalar_one_or_none():
            config = IntegrationConfig(
                user_address=wallet_address.lower(),
                purchase_id=purchase.id,
                product_id=request.product_id,
                sync_enabled=True,
                sync_frequency="hourly",
                auto_sync=True
            )
            db.add(config)

        await db.commit()

        # Trigger initial sync (would be async in production)
        # await trigger_sync(oauth_token.id)

        return {
            "success": True,
            "message": f"Successfully connected {purchase.product.name}",
            "token_id": oauth_token.id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting integration: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to connect integration")


@router.post("/disconnect-integration")
async def disconnect_integration(
    wallet_address: str,
    request: DisconnectIntegrationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Disconnect an integration"""
    try:
        # Find active OAuth token
        token_result = await db.execute(
            select(OAuthToken).where(
                and_(
                    OAuthToken.user_address == wallet_address.lower(),
                    OAuthToken.product_id == request.product_id,
                    OAuthToken.is_active == True
                )
            ).options(
                selectinload(OAuthToken.product)
            )
        )
        token = token_result.scalar_one_or_none()

        if not token:
            raise HTTPException(
                status_code=404,
                detail="No active integration found"
            )

        # Deactivate the token
        token.is_active = False
        token.updated_at = datetime.utcnow()

        # Disable sync in config
        config_result = await db.execute(
            select(IntegrationConfig).where(
                and_(
                    IntegrationConfig.user_address == wallet_address.lower(),
                    IntegrationConfig.product_id == request.product_id
                )
            )
        )
        config = config_result.scalar_one_or_none()
        if config:
            config.sync_enabled = False

        await db.commit()

        return {
            "success": True,
            "message": f"Successfully disconnected {token.product.name}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting integration: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to disconnect integration")


# =====================================================================
# SUBSCRIPTION MANAGEMENT
# =====================================================================

@router.get("/my-subscriptions")
async def get_user_subscriptions(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Get all active subscriptions for a user"""
    try:
        result = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_address == wallet_address.lower(),
                    Subscription.status.in_([
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIAL
                    ])
                )
            ).options(
                selectinload(Subscription.product),
                selectinload(Subscription.pricing_plan)
            )
        )
        subscriptions = result.scalars().all()

        return [{
            "subscription_id": sub.id,
            "product_name": sub.product.name,
            "plan_name": sub.pricing_plan.name,
            "status": sub.status.value,
            "current_period_end": sub.current_period_end.isoformat(),
            "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
            "amount": float(sub.amount),
            "currency": sub.currency,
            "usage_limit": sub.usage_limit,
            "current_usage": sub.current_usage
        } for sub in subscriptions]

    except Exception as e:
        logger.error(f"Error fetching subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscriptions")


@router.post("/cancel-subscription/{subscription_id}")
async def cancel_subscription(
    subscription_id: int,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a subscription"""
    try:
        result = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.id == subscription_id,
                    Subscription.user_address == wallet_address.lower()
                )
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        subscription.updated_at = datetime.utcnow()

        await db.commit()

        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "effective_until": subscription.current_period_end.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")