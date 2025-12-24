"""
Project Database Models

Models for organizing AI conversations into projects with custom instructions
and pinned files. Like Claude Projects - helps users organize work by topic.
"""

from datetime import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Project(Base):
    """
    AI Project

    Organizes conversations and context around a specific topic or task.
    Includes custom instructions that the AI follows for all conversations
    within the project.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(255), index=True, nullable=False)

    # Project metadata
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#3B82F6")  # Hex color
    icon = Column(String(50), default="folder")  # Icon name or emoji

    # AI customization
    custom_instructions = Column(Text, nullable=True)  # Instructions for AI in this project

    # Status
    is_archived = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="project")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', wallet={self.wallet_address[:10]}...)>"


class ProjectFile(Base):
    """
    Project File

    Files pinned to a project for persistent context.
    Can be uploaded files or files pulled from integrations.
    """
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    wallet_address = Column(String(255), index=True, nullable=False)

    # File info
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)  # 'pdf', 'docx', 'xlsx', 'txt', 'csv', 'image'

    # Source info
    source_type = Column(String(20), nullable=False, default="upload")  # 'upload' or 'integration'
    cid = Column(String(255), nullable=True)  # Pinata CID for uploads
    integration_ref = Column(JSONB, nullable=True)  # For integration files: {provider, item_id, category, cid}

    # Content
    content_preview = Column(Text, nullable=True)  # First 500 chars for display
    file_size = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="files")

    def __repr__(self):
        return f"<ProjectFile(id={self.id}, name='{self.file_name}', project_id={self.project_id})>"


# Pydantic schemas for API

class ProjectFileCreate(BaseModel):
    """Schema for adding a file to a project"""
    file_name: str
    file_type: Optional[str] = None
    source_type: str = "upload"
    cid: Optional[str] = None
    integration_ref: Optional[Dict[str, Any]] = None
    content_preview: Optional[str] = None
    file_size: Optional[int] = None


class ProjectFileResponse(BaseModel):
    """Schema for project file response"""
    id: int
    project_id: int
    file_name: str
    file_type: Optional[str]
    source_type: str
    cid: Optional[str]
    integration_ref: Optional[Dict[str, Any]]
    content_preview: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    """Schema for creating a new project"""
    wallet_address: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "folder"
    custom_instructions: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    custom_instructions: Optional[str] = None
    is_archived: Optional[bool] = None


class ProjectResponse(BaseModel):
    """Schema for project response"""
    id: int
    wallet_address: str
    name: str
    description: Optional[str]
    color: str
    icon: str
    custom_instructions: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    file_count: Optional[int] = 0
    conversation_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ProjectWithFiles(ProjectResponse):
    """Schema for project response with files"""
    files: List[ProjectFileResponse] = []

    class Config:
        from_attributes = True
