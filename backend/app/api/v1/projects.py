"""
Projects API Endpoints

CRUD operations for managing AI Assistant projects.
Supports Claude-like project organization with custom instructions and pinned files.

Features:
- Create, read, update, delete projects
- Upload/pin files to projects (from uploads or integrations)
- Custom AI instructions per project
- List conversations within a project
- Multi-tenant isolation via wallet address
"""

from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json

from app.core.database import get_db
from app.models.project import (
    Project,
    ProjectFile,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithFiles,
    ProjectFileCreate,
    ProjectFileResponse
)
from app.models.conversation import Conversation, ConversationResponse, Message
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# ==================== Project Endpoints ====================

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    wallet_address: str = Query(..., description="User's wallet address"),
    include_archived: bool = Query(False, description="Include archived projects"),
    limit: int = Query(50, ge=1, le=100, description="Max projects to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all projects for a wallet address.

    Returns projects sorted by updated_at (most recent first).
    Includes file count and conversation count for each project.
    """
    try:
        # Build query conditions
        conditions = [Project.wallet_address == wallet_address.lower()]

        if not include_archived:
            conditions.append(Project.is_archived == False)  # noqa: E712

        # Query with file count and conversation count subqueries
        query = (
            select(
                Project,
                func.count(func.distinct(ProjectFile.id)).label("file_count"),
                func.count(func.distinct(Conversation.id)).label("conversation_count")
            )
            .outerjoin(ProjectFile, ProjectFile.project_id == Project.id)
            .outerjoin(Conversation, Conversation.project_id == Project.id)
            .where(and_(*conditions))
            .group_by(Project.id)
            .order_by(desc(Project.updated_at))
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        rows = result.all()

        # Build response
        projects = []
        for row in rows:
            proj = row[0]
            file_count = row[1]
            conversation_count = row[2]

            projects.append(ProjectResponse(
                id=proj.id,
                wallet_address=proj.wallet_address,
                name=proj.name,
                description=proj.description,
                color=proj.color,
                icon=proj.icon,
                custom_instructions=proj.custom_instructions,
                is_archived=proj.is_archived,
                created_at=proj.created_at,
                updated_at=proj.updated_at,
                file_count=file_count,
                conversation_count=conversation_count
            ))

        logger.info(f"Listed {len(projects)} projects for wallet {wallet_address[:10]}...")
        return projects

    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new project for a wallet address.
    """
    try:
        project = Project(
            wallet_address=request.wallet_address.lower(),
            name=request.name,
            description=request.description,
            color=request.color or "#3B82F6",
            icon=request.icon or "folder",
            custom_instructions=request.custom_instructions,
            is_archived=False
        )

        db.add(project)
        await db.commit()
        await db.refresh(project)

        logger.info(f"Created project '{project.name}' (id={project.id}) for wallet {request.wallet_address[:10]}...")

        return ProjectResponse(
            id=project.id,
            wallet_address=project.wallet_address,
            name=project.name,
            description=project.description,
            color=project.color,
            icon=project.icon,
            custom_instructions=project.custom_instructions,
            is_archived=project.is_archived,
            created_at=project.created_at,
            updated_at=project.updated_at,
            file_count=0,
            conversation_count=0
        )

    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=ProjectWithFiles)
async def get_project(
    project_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a project with all its files.

    Enforces wallet-based access control - only the owner can view.
    """
    try:
        # Get project with files
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
            .options(selectinload(Project.files))
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        # Get conversation count
        conv_result = await db.execute(
            select(func.count(Conversation.id))
            .where(Conversation.project_id == project_id)
        )
        conversation_count = conv_result.scalar() or 0

        # Build file responses
        files = [
            ProjectFileResponse(
                id=f.id,
                project_id=f.project_id,
                file_name=f.file_name,
                file_type=f.file_type,
                source_type=f.source_type,
                cid=f.cid,
                integration_ref=f.integration_ref,
                content_preview=f.content_preview,
                file_size=f.file_size,
                created_at=f.created_at
            )
            for f in project.files
        ]

        return ProjectWithFiles(
            id=project.id,
            wallet_address=project.wallet_address,
            name=project.name,
            description=project.description,
            color=project.color,
            icon=project.icon,
            custom_instructions=project.custom_instructions,
            is_archived=project.is_archived,
            created_at=project.created_at,
            updated_at=project.updated_at,
            file_count=len(files),
            conversation_count=conversation_count,
            files=files
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    request: ProjectUpdate,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a project (name, description, instructions, archive).

    Enforces wallet-based access control - only the owner can update.
    """
    try:
        # Get project
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        # Update fields
        if request.name is not None:
            project.name = request.name
        if request.description is not None:
            project.description = request.description
        if request.color is not None:
            project.color = request.color
        if request.icon is not None:
            project.icon = request.icon
        if request.custom_instructions is not None:
            project.custom_instructions = request.custom_instructions
        if request.is_archived is not None:
            project.is_archived = request.is_archived

        await db.commit()
        await db.refresh(project)

        # Get counts
        file_result = await db.execute(
            select(func.count(ProjectFile.id))
            .where(ProjectFile.project_id == project_id)
        )
        file_count = file_result.scalar() or 0

        conv_result = await db.execute(
            select(func.count(Conversation.id))
            .where(Conversation.project_id == project_id)
        )
        conversation_count = conv_result.scalar() or 0

        logger.info(f"Updated project {project_id}")

        return ProjectResponse(
            id=project.id,
            wallet_address=project.wallet_address,
            name=project.name,
            description=project.description,
            color=project.color,
            icon=project.icon,
            custom_instructions=project.custom_instructions,
            is_archived=project.is_archived,
            created_at=project.created_at,
            updated_at=project.updated_at,
            file_count=file_count,
            conversation_count=conversation_count
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update project: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    permanent: bool = Query(False, description="Permanently delete (vs archive)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete or archive a project.

    By default, archives the project. Set permanent=True to delete permanently.
    Enforces wallet-based access control - only the owner can delete.
    """
    try:
        # Get project
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        if permanent:
            # Permanently delete project (cascades to files)
            await db.delete(project)
            await db.commit()
            logger.info(f"Permanently deleted project {project_id}")
            return {
                "success": True,
                "message": "Project deleted permanently",
                "project_id": project_id
            }
        else:
            # Archive project
            project.is_archived = True
            await db.commit()
            logger.info(f"Archived project {project_id}")
            return {
                "success": True,
                "message": "Project archived",
                "project_id": project_id
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Project Files Endpoints ====================

@router.post("/{project_id}/files", response_model=ProjectFileResponse)
async def upload_project_file(
    project_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    file: UploadFile = File(None),
    # Form data for integration files
    source_type: str = Form("upload"),
    file_name: str = Form(None),
    file_type: str = Form(None),
    integration_ref: str = Form(None),  # JSON string
    db: AsyncSession = Depends(get_db)
):
    """
    Add a file to a project.

    Supports two modes:
    1. Upload file: Attach a file to the request
    2. Integration link: Provide integration_ref JSON with {provider, item_id, category, cid}

    Enforces wallet-based access control.
    """
    try:
        # Verify project ownership
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        cid = None
        actual_file_name = file_name
        actual_file_type = file_type
        content_preview = None
        file_size = None
        integration_ref_dict = None

        if source_type == "upload" and file:
            # Handle file upload
            file_content = await file.read()
            file_size = len(file_content)
            actual_file_name = file_name or file.filename

            # Determine file type from extension
            if not actual_file_type and actual_file_name:
                ext = actual_file_name.rsplit('.', 1)[-1].lower() if '.' in actual_file_name else None
                type_map = {
                    'pdf': 'pdf',
                    'doc': 'docx',
                    'docx': 'docx',
                    'xls': 'xlsx',
                    'xlsx': 'xlsx',
                    'txt': 'txt',
                    'md': 'txt',
                    'csv': 'csv',
                    'png': 'image',
                    'jpg': 'image',
                    'jpeg': 'image',
                    'gif': 'image'
                }
                actual_file_type = type_map.get(ext)

            # Extract content preview for text files
            if actual_file_type in ['txt', 'csv']:
                try:
                    content_preview = file_content.decode('utf-8')[:500]
                except:
                    pass

            # Upload to Pinata/Filecoin
            try:
                cid = await filecoin_service.upload_encrypted_file(
                    customer_wallet=wallet_address.lower(),
                    integration="project_files",
                    data_type=f"project_{project_id}",
                    file_content=file_content,
                    filename=actual_file_name,
                    metadata={
                        "project_id": str(project_id),
                        "file_name": actual_file_name,
                        "file_type": actual_file_type
                    }
                )
                logger.info(f"Uploaded project file to Pinata: {cid}")
            except Exception as e:
                logger.warning(f"Failed to upload to Pinata: {e}. Storing reference only.")

        elif source_type == "integration" and integration_ref:
            # Handle integration file link
            try:
                integration_ref_dict = json.loads(integration_ref)
                actual_file_name = file_name or integration_ref_dict.get("file_name", "Unknown")
                cid = integration_ref_dict.get("cid")
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid integration_ref JSON"
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either file (for upload) or integration_ref (for integration link)"
            )

        # Create project file record
        project_file = ProjectFile(
            project_id=project_id,
            wallet_address=wallet_address.lower(),
            file_name=actual_file_name,
            file_type=actual_file_type,
            source_type=source_type,
            cid=cid,
            integration_ref=integration_ref_dict,
            content_preview=content_preview,
            file_size=file_size
        )

        db.add(project_file)
        await db.commit()
        await db.refresh(project_file)

        logger.info(f"Added file '{actual_file_name}' to project {project_id}")

        return ProjectFileResponse(
            id=project_file.id,
            project_id=project_file.project_id,
            file_name=project_file.file_name,
            file_type=project_file.file_type,
            source_type=project_file.source_type,
            cid=project_file.cid,
            integration_ref=project_file.integration_ref,
            content_preview=project_file.content_preview,
            file_size=project_file.file_size,
            created_at=project_file.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add project file: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/files/{file_id}")
async def remove_project_file(
    project_id: int,
    file_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a file from a project.

    Note: This only removes the database reference. The file remains in Pinata/Filecoin.
    Enforces wallet-based access control.
    """
    try:
        # Verify project and file ownership
        result = await db.execute(
            select(ProjectFile)
            .where(
                and_(
                    ProjectFile.id == file_id,
                    ProjectFile.project_id == project_id,
                    ProjectFile.wallet_address == wallet_address.lower()
                )
            )
        )
        project_file = result.scalar_one_or_none()

        if not project_file:
            raise HTTPException(
                status_code=404,
                detail="File not found or access denied"
            )

        file_name = project_file.file_name
        await db.delete(project_file)
        await db.commit()

        logger.info(f"Removed file '{file_name}' from project {project_id}")

        return {
            "success": True,
            "message": "File removed from project",
            "file_id": file_id,
            "project_id": project_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove project file: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files", response_model=List[ProjectFileResponse])
async def list_project_files(
    project_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all files in a project.

    Enforces wallet-based access control.
    """
    try:
        # Verify project ownership
        proj_result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = proj_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        # Get files
        result = await db.execute(
            select(ProjectFile)
            .where(ProjectFile.project_id == project_id)
            .order_by(desc(ProjectFile.created_at))
        )
        files = result.scalars().all()

        return [
            ProjectFileResponse(
                id=f.id,
                project_id=f.project_id,
                file_name=f.file_name,
                file_type=f.file_type,
                source_type=f.source_type,
                cid=f.cid,
                integration_ref=f.integration_ref,
                content_preview=f.content_preview,
                file_size=f.file_size,
                created_at=f.created_at
            )
            for f in files
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list project files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Project Conversations Endpoints ====================

@router.get("/{project_id}/conversations", response_model=List[ConversationResponse])
async def list_project_conversations(
    project_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(50, ge=1, le=100, description="Max conversations to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all conversations in a project.

    Enforces wallet-based access control.
    """
    try:
        # Verify project ownership
        proj_result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = proj_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        # Get conversations with message count
        query = (
            select(
                Conversation,
                func.count(Message.id).label("message_count")
            )
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.project_id == project_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
            .group_by(Conversation.id)
            .order_by(desc(Conversation.last_message_at).nullslast())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        rows = result.all()

        conversations = []
        for row in rows:
            conv = row[0]
            message_count = row[1]
            conversations.append(ConversationResponse(
                id=conv.id,
                wallet_address=conv.wallet_address,
                title=conv.title,
                is_pinned=conv.is_pinned,
                is_archived=conv.is_archived,
                integration=conv.integration,
                project_id=conv.project_id,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message_at=conv.last_message_at,
                message_count=message_count
            ))

        return conversations

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list project conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/conversations/{conversation_id}")
async def add_conversation_to_project(
    project_id: int,
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Move a conversation into a project.

    Enforces wallet-based access control.
    """
    try:
        # Verify project ownership
        proj_result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.wallet_address == wallet_address.lower()
                )
            )
        )
        project = proj_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found or access denied"
            )

        # Verify conversation ownership
        conv_result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or access denied"
            )

        # Update conversation's project
        conversation.project_id = project_id
        await db.commit()

        logger.info(f"Moved conversation {conversation_id} to project {project_id}")

        return {
            "success": True,
            "message": "Conversation added to project",
            "conversation_id": conversation_id,
            "project_id": project_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add conversation to project: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/conversations/{conversation_id}")
async def remove_conversation_from_project(
    project_id: int,
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a conversation from a project (doesn't delete the conversation).

    Enforces wallet-based access control.
    """
    try:
        # Verify conversation ownership and project match
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.project_id == project_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found in this project or access denied"
            )

        # Remove from project
        conversation.project_id = None
        await db.commit()

        logger.info(f"Removed conversation {conversation_id} from project {project_id}")

        return {
            "success": True,
            "message": "Conversation removed from project",
            "conversation_id": conversation_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove conversation from project: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
