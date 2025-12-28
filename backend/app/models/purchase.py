"""
Purchase and Subscription Database Models

Models for managing software purchases, subscriptions, OAuth tokens, and data sync logs.
Supports tracking NFT licenses, subscription status, and integration synchronization.

Security Note (YELLOW-001 Fix - December 28, 2025):
OAuth token decryption now requires explicit authentication context.
Call OAuthToken.set_auth_context(wallet_address) before accessing tokens.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey, JSON, Enum as SQLEnum, UniqueConstraint, Index
from sqlalchemy.orm import relationship
import enum
import threading
import logging
from app.core.database import Base

# Thread-local storage for authentication context (YELLOW-001 fix)
_auth_context = threading.local()
_logger = logging.getLogger(__name__)


class SubscriptionStatus(str, enum.Enum):
    """Subscription status types"""
    PENDING = "pending"  # Payment pending
    ACTIVE = "active"  # Active subscription
    TRIAL = "trial"  # In trial period
    CANCELLED = "cancelled"  # Cancelled but still active until period ends
    EXPIRED = "expired"  # Subscription expired
    SUSPENDED = "suspended"  # Suspended due to payment failure


class SyncStatus(str, enum.Enum):
    """Data sync status types"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"  # Some data synced, some failed


class Purchase(Base):
    """Software purchase records"""
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String(42), nullable=False, index=True)  # Ethereum address
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"))

    # Transaction details
    transaction_hash = Column(String(66), unique=True)  # 0x + 64 hex chars
    block_number = Column(Integer)
    license_nft_id = Column(Integer)  # NFT token ID from smart contract

    # NFT tracking fields (blockchain integration)
    nft_token_id = Column(Integer)  # Actual NFT token ID from ToolLicenseNFT contract
    nft_tx_hash = Column(String(66))  # Transaction hash of NFT minting
    nft_minted = Column(Boolean, default=False)  # Whether NFT has been successfully minted

    # Payment details
    amount_paid = Column(Numeric(20, 6))  # USDC amount
    currency = Column(String(10), default="USDC")

    # Purchase metadata
    purchase_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    activation_date = Column(DateTime)  # When user activated/connected the integration
    expiry_date = Column(DateTime)  # For time-limited licenses

    # Status
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    extra_data = Column(JSON)  # Additional purchase metadata

    # Indexes
    __table_args__ = (
        Index('idx_user_product', 'user_address', 'product_id'),
        Index('idx_purchase_date', 'purchase_date'),
    )

    # Relationships
    product = relationship("Product", foreign_keys=[product_id])
    pricing_plan = relationship("PricingPlan", foreign_keys=[pricing_plan_id])
    subscription = relationship("Subscription", back_populates="purchase", uselist=False)
    oauth_tokens = relationship("OAuthToken", back_populates="purchase")
    sync_logs = relationship("SyncLog", back_populates="purchase")


class Subscription(Base):
    """Recurring subscription management"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), unique=True, nullable=False)
    user_address = Column(String(42), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("marketplace_pricing_plans.id"), nullable=False)

    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.PENDING, nullable=False)
    trial_ends_at = Column(DateTime)
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancelled_at = Column(DateTime)

    # Billing
    billing_period = Column(String(20))  # monthly, annually
    next_billing_date = Column(DateTime)
    amount = Column(Numeric(10, 2))
    currency = Column(String(10), default="USDC")

    # Usage tracking (for usage-based pricing)
    usage_limit = Column(Integer)  # e.g., API calls, transactions
    current_usage = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    extra_data = Column(JSON)

    # Indexes
    __table_args__ = (
        Index('idx_subscription_status', 'status'),
        Index('idx_subscription_dates', 'current_period_end', 'next_billing_date'),
    )

    # Relationships
    purchase = relationship("Purchase", back_populates="subscription")
    product = relationship("Product", foreign_keys=[product_id])
    pricing_plan = relationship("PricingPlan", foreign_keys=[pricing_plan_id])


class OAuthTokenAuthContext:
    """
    Context manager for authenticated OAuth token access (YELLOW-001 fix).

    Usage:
        with OAuthToken.auth_context(authenticated_wallet):
            token = await get_oauth_token(wallet, provider)
            access_token = token.access_token  # Now allowed

    Without auth context, accessing tokens raises SecurityError.
    """

    def __init__(self, wallet_address: str):
        self.wallet_address = wallet_address.lower() if wallet_address else None
        self._previous_context = None

    def __enter__(self):
        self._previous_context = getattr(_auth_context, 'wallet', None)
        _auth_context.wallet = self.wallet_address
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        _auth_context.wallet = self._previous_context
        return False


class OAuthToken(Base):
    """
    OAuth tokens for integration connections.

    SECURITY (YELLOW-001 fix - December 28, 2025):
    Token decryption now requires authentication context to prevent
    unauthorized access to tokens by callers who have object access but
    haven't proven wallet ownership.

    Usage:
        # Method 1: Context manager (recommended)
        with OAuthToken.auth_context(wallet_address):
            token = await get_token(wallet_address, provider)
            access = token.access_token  # Works

        # Method 2: Static method
        OAuthToken.set_auth_context(wallet_address)
        try:
            access = token.access_token  # Works
        finally:
            OAuthToken.clear_auth_context()
    """
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String(42), nullable=False, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"))
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=True)  # Nullable - OAuth can exist without marketplace product

    # OAuth details - stored encrypted
    provider = Column(String(50), nullable=False)  # quickbooks, stripe, salesforce, etc.
    _access_token_encrypted = Column("access_token", Text, nullable=False)  # Encrypted storage
    _refresh_token_encrypted = Column("refresh_token", Text)  # Encrypted storage
    token_type = Column(String(20), default="Bearer")
    expires_at = Column(DateTime)

    @staticmethod
    def auth_context(wallet_address: str) -> OAuthTokenAuthContext:
        """Create an authentication context for token access."""
        return OAuthTokenAuthContext(wallet_address)

    @staticmethod
    def set_auth_context(wallet_address: str):
        """Set authentication context (use clear_auth_context when done)."""
        _auth_context.wallet = wallet_address.lower() if wallet_address else None

    @staticmethod
    def clear_auth_context():
        """Clear authentication context."""
        _auth_context.wallet = None

    @staticmethod
    def get_auth_context() -> str:
        """Get current authentication context wallet."""
        return getattr(_auth_context, 'wallet', None)

    def _verify_auth_context(self, operation: str) -> None:
        """
        Verify caller is authorized to access this token's sensitive data.

        SECURITY: Prevents token access by callers who have object access
        (e.g., through database query) but haven't proven wallet ownership.

        Raises:
            PermissionError: If no auth context or wallet mismatch
        """
        auth_wallet = getattr(_auth_context, 'wallet', None)

        if auth_wallet is None:
            _logger.warning(
                f"SECURITY: OAuth token {operation} attempted without auth context "
                f"for token_id={self.id}, provider={self.provider}"
            )
            raise PermissionError(
                f"OAuth token {operation} requires authentication context. "
                "Use OAuthToken.auth_context(wallet) or OAuthToken.set_auth_context(wallet)."
            )

        # Normalize addresses for comparison
        token_wallet = self.user_address.lower() if self.user_address else None

        if auth_wallet != token_wallet:
            _logger.warning(
                f"SECURITY: OAuth token {operation} wallet mismatch - "
                f"auth_wallet={auth_wallet[:10]}... vs token_wallet={token_wallet[:10] if token_wallet else 'None'}... "
                f"token_id={self.id}"
            )
            raise PermissionError(
                f"OAuth token {operation} denied: authenticated wallet does not match token owner."
            )

    @property
    def access_token(self) -> str:
        """
        Decrypt and return access token.

        SECURITY: Requires valid auth context matching token's user_address.
        """
        if not self._access_token_encrypted:
            return None

        # YELLOW-001 FIX: Verify authentication context before decryption
        self._verify_auth_context("access_token read")

        from app.services.encryption_service import EncryptionService
        encryption_service = EncryptionService()
        return encryption_service.decrypt_token_field(self.user_address, self._access_token_encrypted)

    @access_token.setter
    def access_token(self, value: str):
        """Encrypt and store access token"""
        if value:
            from app.services.encryption_service import EncryptionService
            encryption_service = EncryptionService()
            self._access_token_encrypted = encryption_service.encrypt_token_field(self.user_address, value)
        else:
            self._access_token_encrypted = None

    @property
    def refresh_token(self) -> str:
        """
        Decrypt and return refresh token.

        SECURITY: Requires valid auth context matching token's user_address.
        """
        if not self._refresh_token_encrypted:
            return None

        # YELLOW-001 FIX: Verify authentication context before decryption
        self._verify_auth_context("refresh_token read")

        from app.services.encryption_service import EncryptionService
        encryption_service = EncryptionService()
        return encryption_service.decrypt_token_field(self.user_address, self._refresh_token_encrypted)

    @refresh_token.setter
    def refresh_token(self, value: str):
        """Encrypt and store refresh token"""
        if value:
            from app.services.encryption_service import EncryptionService
            encryption_service = EncryptionService()
            self._refresh_token_encrypted = encryption_service.encrypt_token_field(self.user_address, value)
        else:
            self._refresh_token_encrypted = None

    # OAuth metadata
    scope = Column(Text)  # Granted permissions
    account_id = Column(String(255))  # Provider's account ID
    account_email = Column(String(255))  # Account email
    account_name = Column(String(255))  # Account/company name

    # Connection status
    is_active = Column(Boolean, default=True)
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_refreshed_at = Column(DateTime)
    last_sync_at = Column(DateTime)

    # Additional provider data
    provider_data = Column(JSON)  # Provider-specific metadata

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint - one active token per user per provider
    __table_args__ = (
        UniqueConstraint('user_address', 'provider', 'is_active', name='uq_user_provider_active'),
        Index('idx_oauth_provider', 'provider', 'is_active'),
        Index('idx_oauth_expires', 'expires_at'),
    )

    # Relationships
    purchase = relationship("Purchase", back_populates="oauth_tokens")
    product = relationship("Product", foreign_keys=[product_id])
    sync_logs = relationship("SyncLog", back_populates="oauth_token")


class SyncLog(Base):
    """Data synchronization logs"""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String(42), nullable=False, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"))
    oauth_token_id = Column(Integer, ForeignKey("oauth_tokens.id"))
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)

    # Sync details
    sync_type = Column(String(50))  # full, incremental, specific_resource
    resource_type = Column(String(50))  # invoices, customers, products, etc.
    status = Column(SQLEnum(SyncStatus), default=SyncStatus.PENDING, nullable=False)

    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)

    # Results
    records_synced = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)

    # Error tracking
    error_message = Column(Text)
    error_details = Column(JSON)

    # Sync metadata
    last_sync_timestamp = Column(DateTime)  # For incremental syncs
    sync_params = Column(JSON)  # Parameters used for sync
    result_summary = Column(JSON)  # Summary of what was synced

    # Indexes
    __table_args__ = (
        Index('idx_sync_status', 'status'),
        Index('idx_sync_dates', 'started_at', 'completed_at'),
        Index('idx_sync_product', 'product_id', 'status'),
    )

    # Relationships
    purchase = relationship("Purchase", back_populates="sync_logs")
    oauth_token = relationship("OAuthToken", back_populates="sync_logs")
    product = relationship("Product", foreign_keys=[product_id])


class IntegrationConfig(Base):
    """User-specific integration configuration"""
    __tablename__ = "integration_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String(42), nullable=False, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("marketplace_products.id"), nullable=False)

    # Configuration settings
    sync_enabled = Column(Boolean, default=True)
    sync_frequency = Column(String(20), default="hourly")  # real-time, hourly, daily, weekly

    # Feature toggles
    auto_sync = Column(Boolean, default=True)
    sync_invoices = Column(Boolean, default=True)
    sync_customers = Column(Boolean, default=True)
    sync_products = Column(Boolean, default=True)
    sync_transactions = Column(Boolean, default=True)

    # Webhooks
    webhook_url = Column(String(500))
    webhook_secret = Column(String(255))
    webhook_events = Column(JSON)  # List of events to subscribe to

    # Custom mappings
    field_mappings = Column(JSON)  # Custom field mappings
    filters = Column(JSON)  # Data filters/rules

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    settings = Column(JSON)  # Additional provider-specific settings

    # Unique constraint
    __table_args__ = (
        UniqueConstraint('user_address', 'product_id', name='uq_user_product_config'),
    )

    # Relationships
    product = relationship("Product", foreign_keys=[product_id])