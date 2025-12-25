"""
Conversation History API Endpoints

CRUD operations for managing AI chat conversations and messages.
Supports multi-tenant isolation - each wallet only accesses their own conversations.

Features:
- Create, read, update, delete conversations
- Pin/unpin conversations
- Rename conversations
- Archive conversations
- Add messages to conversations
- List conversations with pagination
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.models.conversation import (
    Conversation,
    Message,
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessages,
    MessageCreate,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Conversation Endpoints ====================

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    wallet_address: str = Query(..., description="User's wallet address"),
    include_archived: bool = Query(False, description="Include archived conversations"),
    pinned_first: bool = Query(True, description="Show pinned conversations first"),
    limit: int = Query(50, ge=1, le=100, description="Max conversations to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all conversations for a wallet address.

    Returns conversations sorted by:
    1. Pinned status (pinned first if pinned_first=True)
    2. Last message time (most recent first)
    """
    try:
        # Build query
        conditions = [Conversation.wallet_address == wallet_address.lower()]

        if not include_archived:
            conditions.append(Conversation.is_archived == False)  # noqa: E712

        # Query with message count subquery
        query = (
            select(
                Conversation,
                func.count(Message.id).label("message_count")
            )
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(and_(*conditions))
            .group_by(Conversation.id)
        )

        # Order by pinned first, then by last_message_at
        if pinned_first:
            query = query.order_by(
                desc(Conversation.is_pinned),
                desc(Conversation.last_message_at).nullslast()
            )
        else:
            query = query.order_by(desc(Conversation.last_message_at).nullslast())

        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        rows = result.all()

        # Build response
        conversations = []
        for row in rows:
            conv = row[0]
            message_count = row[1]
            conv_dict = {
                "id": conv.id,
                "wallet_address": conv.wallet_address,
                "title": conv.title,
                "is_pinned": conv.is_pinned,
                "is_archived": conv.is_archived,
                "integration": conv.integration,
                "project_id": conv.project_id,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "last_message_at": conv.last_message_at,
                "message_count": message_count
            }
            conversations.append(ConversationResponse(**conv_dict))

        logger.info(f"Listed {len(conversations)} conversations for wallet {wallet_address[:10]}...")
        return conversations

    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new conversation for a wallet address.
    """
    try:
        conversation = Conversation(
            wallet_address=request.wallet_address.lower(),
            title=request.title or "New Conversation",
            integration=request.integration,
            project_id=request.project_id,
            is_pinned=False,
            is_archived=False
        )

        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

        logger.info(f"Created conversation {conversation.id} for wallet {request.wallet_address[:10]}...")

        return ConversationResponse(
            id=conversation.id,
            wallet_address=conversation.wallet_address,
            title=conversation.title,
            is_pinned=conversation.is_pinned,
            is_archived=conversation.is_archived,
            integration=conversation.integration,
            project_id=conversation.project_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at,
            message_count=0
        )

    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a conversation with all its messages.

    Enforces wallet-based access control - only the owner can view.
    """
    try:
        # Get conversation with messages
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
            .options(selectinload(Conversation.messages))
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or access denied"
            )

        # Build message responses
        messages = [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                rag_sources=msg.rag_sources or [],
                web_sources=msg.web_sources or [],
                message_metadata=msg.message_metadata or {},
                created_at=msg.created_at
            )
            for msg in conversation.messages
        ]

        return ConversationWithMessages(
            id=conversation.id,
            wallet_address=conversation.wallet_address,
            title=conversation.title,
            is_pinned=conversation.is_pinned,
            is_archived=conversation.is_archived,
            integration=conversation.integration,
            project_id=conversation.project_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at,
            message_count=len(messages),
            messages=messages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    request: ConversationUpdate,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a conversation (rename, pin/unpin, archive).

    Enforces wallet-based access control - only the owner can update.
    """
    try:
        # Get conversation
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or access denied"
            )

        # Update fields
        if request.title is not None:
            conversation.title = request.title
        if request.is_pinned is not None:
            conversation.is_pinned = request.is_pinned
        if request.is_archived is not None:
            conversation.is_archived = request.is_archived
        if request.project_id is not None:
            conversation.project_id = request.project_id

        await db.commit()
        await db.refresh(conversation)

        # Get message count
        count_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.conversation_id == conversation_id)
        )
        message_count = count_result.scalar() or 0

        logger.info(f"Updated conversation {conversation_id}")

        return ConversationResponse(
            id=conversation.id,
            wallet_address=conversation.wallet_address,
            title=conversation.title,
            is_pinned=conversation.is_pinned,
            is_archived=conversation.is_archived,
            integration=conversation.integration,
            project_id=conversation.project_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at,
            message_count=message_count
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update conversation: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a conversation and all its messages.

    Enforces wallet-based access control - only the owner can delete.
    """
    try:
        # Get conversation
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or access denied"
            )

        # Delete conversation (cascades to messages)
        await db.delete(conversation)
        await db.commit()

        logger.info(f"Deleted conversation {conversation_id}")

        return {
            "success": True,
            "message": "Conversation deleted successfully",
            "conversation_id": conversation_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Message Endpoints ====================

@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(
    conversation_id: int,
    request: MessageCreate,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a message to a conversation.

    Enforces wallet-based access control - only the owner can add messages.
    """
    try:
        # Verify conversation ownership
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.wallet_address == wallet_address.lower()
                )
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or access denied"
            )

        # Create message
        message = Message(
            conversation_id=conversation_id,
            role=request.role,
            content=request.content,
            rag_sources=request.rag_sources,
            web_sources=request.web_sources,
            message_metadata=request.message_metadata
        )

        db.add(message)

        # Update conversation's last_message_at
        conversation.last_message_at = datetime.utcnow()

        # Auto-generate title from first user message if still default
        if conversation.title == "New Conversation" and request.role == "user":
            # Use first 50 chars of message as title
            conversation.title = request.content[:50] + ("..." if len(request.content) > 50 else "")

        await db.commit()
        await db.refresh(message)

        logger.info(f"Added message to conversation {conversation_id}")

        return MessageResponse(
            id=message.id,
            conversation_id=message.conversation_id,
            role=message.role,
            content=message.content,
            rag_sources=message.rag_sources or [],
            web_sources=message.web_sources or [],
            message_metadata=message.message_metadata or {},
            created_at=message.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add message: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max messages to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get messages for a conversation with pagination.

    Enforces wallet-based access control - only the owner can view.
    """
    try:
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

        # Get messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .offset(offset)
            .limit(limit)
        )
        messages = result.scalars().all()

        return [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                rag_sources=msg.rag_sources or [],
                web_sources=msg.web_sources or [],
                message_metadata=msg.message_metadata or {},
                created_at=msg.created_at
            )
            for msg in messages
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Utility Endpoints ====================

@router.post("/{conversation_id}/pin")
async def pin_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Pin a conversation (shortcut for update with is_pinned=True)"""
    request = ConversationUpdate(is_pinned=True)
    return await update_conversation(conversation_id, request, wallet_address, db)


@router.post("/{conversation_id}/unpin")
async def unpin_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Unpin a conversation (shortcut for update with is_pinned=False)"""
    request = ConversationUpdate(is_pinned=False)
    return await update_conversation(conversation_id, request, wallet_address, db)


@router.post("/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Archive a conversation (shortcut for update with is_archived=True)"""
    request = ConversationUpdate(is_archived=True)
    return await update_conversation(conversation_id, request, wallet_address, db)


@router.post("/{conversation_id}/unarchive")
async def unarchive_conversation(
    conversation_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """Unarchive a conversation (shortcut for update with is_archived=False)"""
    request = ConversationUpdate(is_archived=False)
    return await update_conversation(conversation_id, request, wallet_address, db)
