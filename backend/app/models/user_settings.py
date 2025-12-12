"""
User Settings Database Models

Models for managing user preferences, settings, and API keys.
Supports multi-tenant isolation with wallet-based authentication.
"""

from datetime import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime, Integer
from sqlalchemy.sql import func
from app.core.database import Base


class UserSettings(Base):
    """User settings and preferences"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)  # Finance, Healthcare, Retail, ISO Merchant, etc.
    timezone = Column(String, default="UTC")
    language = Column(String, default="en")

    # JSON fields for flexibility
    notification_preferences = Column(JSON, default=lambda: {
        "weekly_summary": True,
        "integration_updates": True,
        "billing_alerts": True,
        "security_alerts": True,
        "new_features": False
    })

    ui_preferences = Column(JSON, default=lambda: {
        "theme": "light",
        "compact_mode": False
    })

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class APIKey(Base):
    """API keys for programmatic access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, index=True, nullable=False)
    key_hash = Column(String, unique=True, nullable=False)  # SHA-256 hash
    key_prefix = Column(String, nullable=False)  # First 8 chars for display
    name = Column(String, nullable=False)  # User-defined name
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
