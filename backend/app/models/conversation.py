"""
Conversation History Database Models

Models for managing AI chat conversations and messages.
Supports multi-tenant isolation with wallet-based authentication.
Each user (wallet) has their own isolated conversation history.
"""

from datetime import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime, Integer, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class MessageRole(str, enum.Enum):
    """Message role enum"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base):
    """
    AI Chat Conversation

    Stores conversation metadata. Each conversation belongs to a specific
    wallet address (user/employee) for multi-tenant isolation.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, index=True, nullable=False)

    # Conversation metadata
    title = Column(String(255), default="New Conversation")
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)

    # Optional: link to specific integration context
    integration = Column(String, nullable=True)

    # Optional: link to project
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    project = relationship("Project", back_populates="conversations")

    def __repr__(self):
        return f"<Conversation(id={self.id}, title='{self.title}', wallet={self.wallet_address[:10]}...)>"


class Message(Base):
    """
    Chat Message

    Stores individual messages within a conversation.
    Includes role (user/assistant), content, and optional sources.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)

    # Message content
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)

    # Sources from RAG and web search
    rag_sources = Column(JSON, default=list)  # List of RAG source references
    web_sources = Column(JSON, default=list)  # List of {title, url} for web sources

    # Extra info (model used, tokens, etc.) - note: 'metadata' is reserved in SQLAlchemy
    message_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, role='{self.role}', conversation_id={self.conversation_id})>"


# Pydantic schemas for API
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    role: str
    content: str
    rag_sources: List[str] = []
    web_sources: List[Dict[str, str]] = []
    message_metadata: Dict[str, Any] = {}


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: int
    conversation_id: int
    role: str
    content: str
    rag_sources: List[str]
    web_sources: List[Dict[str, str]]
    message_metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    """Schema for creating a new conversation"""
    wallet_address: str
    title: Optional[str] = "New Conversation"
    integration: Optional[str] = None
    project_id: Optional[int] = None


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    project_id: Optional[int] = None


class ConversationResponse(BaseModel):
    """Schema for conversation response (without messages)"""
    id: int
    wallet_address: str
    title: str
    is_pinned: bool
    is_archived: bool
    integration: Optional[str]
    project_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime]
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ConversationWithMessages(ConversationResponse):
    """Schema for conversation response with messages"""
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True
