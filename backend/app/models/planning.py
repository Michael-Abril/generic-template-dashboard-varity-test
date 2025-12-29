"""
Planning Database Models

Models for business planning features including Tasks (to-do list) and
Milestones (company roadmap). Supports multi-tenant isolation with
wallet-based authentication and RAG integration for AI context.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text
from sqlalchemy.sql import func
from app.core.database import Base
from pydantic import BaseModel, Field


# Enums for type safety

class TaskPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskCategory(str, Enum):
    SALES = "sales"
    FINANCE = "finance"
    OPERATIONS = "operations"
    MARKETING = "marketing"


class MilestoneStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    AT_RISK = "at_risk"


class TimeframeType(str, Enum):
    QUARTERLY = "quarterly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class GoalType(str, Enum):
    GROWTH = "growth"
    REVENUE = "revenue"
    PRODUCT = "product"
    OPERATIONS = "operations"


# SQLAlchemy Models

class Task(Base):
    """
    Task (To-Do Item)

    Business task for tracking what needs to be done.
    Supports priorities, categories, and due dates.
    Indexed in Qdrant for AI-powered insights.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(255), index=True, nullable=False)

    # Task details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Categorization
    priority = Column(String(20), default="medium")  # high, medium, low
    category = Column(String(50), default="operations")  # sales, finance, operations, marketing

    # Status
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Due date (optional)
    due_date = Column(DateTime(timezone=True), nullable=True)

    # RAG integration tracking
    rag_indexed = Column(Boolean, default=False)
    rag_indexed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title[:30]}...', priority={self.priority})>"


class Milestone(Base):
    """
    Milestone (Company Roadmap Goal)

    Business goal for tracking company roadmap progress.
    Supports quarterly, monthly, or custom timeframes.
    Indexed in Qdrant for AI-powered insights.
    """
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(255), index=True, nullable=False)

    # Milestone details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Timeline
    timeframe_type = Column(String(20), default="quarterly")  # quarterly, monthly, custom
    timeframe_value = Column(String(100), nullable=False)  # "Q1 2025", "Jan 2025", or custom text
    target_date = Column(DateTime(timezone=True), nullable=True)

    # Progress tracking
    progress_percent = Column(Integer, default=0)  # 0-100
    status = Column(String(20), default="planned")  # planned, in_progress, completed, at_risk

    # Business goal category
    goal_type = Column(String(50), default="growth")  # growth, revenue, product, operations

    # Visual customization
    color = Column(String(7), default="#3B82F6")  # Hex color for visual distinction

    # RAG integration tracking
    rag_indexed = Column(Boolean, default=False)
    rag_indexed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<Milestone(id={self.id}, title='{self.title[:30]}...', progress={self.progress_percent}%)>"


# Pydantic Schemas for API

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    wallet_address: str
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: str = "medium"
    category: str = "operations"
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None


class TaskResponse(BaseModel):
    """Schema for task response"""
    id: int
    wallet_address: str
    title: str
    description: Optional[str]
    priority: str
    category: str
    is_completed: bool
    completed_at: Optional[datetime]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    # RAG indexing status for visibility
    rag_indexed: Optional[bool] = False
    rag_indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """Schema for task list response with summary stats"""
    tasks: List[TaskResponse]
    total_count: int
    completed_count: int
    overdue_count: int
    today_count: int


class MilestoneCreate(BaseModel):
    """Schema for creating a new milestone"""
    wallet_address: str
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    timeframe_type: str = "quarterly"
    timeframe_value: str = Field(..., min_length=1, max_length=100)
    target_date: Optional[datetime] = None
    goal_type: str = "growth"
    color: Optional[str] = "#3B82F6"


class MilestoneUpdate(BaseModel):
    """Schema for updating a milestone"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    timeframe_type: Optional[str] = None
    timeframe_value: Optional[str] = None
    target_date: Optional[datetime] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None
    goal_type: Optional[str] = None
    color: Optional[str] = None


class MilestoneResponse(BaseModel):
    """Schema for milestone response"""
    id: int
    wallet_address: str
    title: str
    description: Optional[str]
    timeframe_type: str
    timeframe_value: str
    target_date: Optional[datetime]
    progress_percent: int
    status: str
    goal_type: str
    color: str
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    # RAG indexing status for visibility
    rag_indexed: Optional[bool] = False
    rag_indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoadmapResponse(BaseModel):
    """Schema for roadmap response with grouped milestones"""
    milestones: List[MilestoneResponse]
    current_timeframe: str
    overall_progress: int
    total_count: int
    completed_count: int
    in_progress_count: int
    at_risk_count: int
