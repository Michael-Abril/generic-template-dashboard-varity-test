"""
Team and Team Member Database Models

Models for managing team membership, roles, and invitations.
Supports multi-tenant team management with wallet-based ownership.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class TeamRole(str, enum.Enum):
    """Team member role types"""
    OWNER = "owner"      # Full control, can delete company
    ADMIN = "admin"      # Full dashboard access except billing
    MEMBER = "member"    # Standard access, can't change settings
    VIEWER = "viewer"    # Read-only access


class InvitationStatus(str, enum.Enum):
    """Invitation status types"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Team(Base):
    """Team/Organization record - one per business wallet"""
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    owner_wallet = Column(String(42), nullable=False, unique=True, index=True)  # Ethereum address
    company_name = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    invitations = relationship("TeamInvitation", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    """Team member record"""
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)

    # Member details
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    role = Column(SQLEnum(TeamRole), default=TeamRole.MEMBER, nullable=False)
    status = Column(String(20), default="pending")  # active, pending

    # Wallet binding (set when invitation is accepted)
    wallet_address = Column(String(42), nullable=True)

    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Indexes and constraints
    __table_args__ = (
        UniqueConstraint('team_id', 'email', name='uq_team_member_email'),
        Index('idx_team_member_email', 'email'),
        Index('idx_team_member_wallet', 'wallet_address'),
        Index('idx_team_member_status', 'status'),
    )

    # Relationships
    team = relationship("Team", back_populates="members")


class TeamInvitation(Base):
    """Team invitation record for tracking invitation tokens"""
    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(Integer, ForeignKey("team_members.id", ondelete="CASCADE"), nullable=True)

    # Invitation details
    email = Column(String(255), nullable=False)
    role = Column(SQLEnum(TeamRole), default=TeamRole.MEMBER, nullable=False)
    token = Column(String(255), nullable=False, unique=True, index=True)
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)

    # Inviter info
    invited_by_wallet = Column(String(42), nullable=False)
    invited_by_name = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)  # Default 7 days
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    # Indexes
    __table_args__ = (
        Index('idx_invitation_status', 'status'),
        Index('idx_invitation_email', 'email'),
    )

    # Relationships
    team = relationship("Team", back_populates="invitations")
    member = relationship("TeamMember", foreign_keys=[member_id])
