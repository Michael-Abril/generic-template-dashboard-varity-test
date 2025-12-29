"""
Planning API Endpoints - Tasks and Company Roadmap

This module provides endpoints for business planning features:
- Tasks: To-do list with priorities, categories, and due dates
- Milestones: Company roadmap with progress tracking

All data is indexed in Qdrant for AI-powered insights.
Target users: 30-60 year old business owners (non-technical language).
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import logging

from app.core.database import get_db
from app.models.planning import (
    Task,
    Milestone,
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneResponse,
    RoadmapResponse
)
from app.services.encryption_service import normalize_wallet_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/planning", tags=["planning"])

# Try to import RAG service for indexing
try:
    from app.services.rag_service import rag_service
    RAG_AVAILABLE = rag_service is not None
except ImportError:
    rag_service = None
    RAG_AVAILABLE = False
    logger.warning("RAG service not available for planning indexing")


# Rate limiting for reindex endpoint (60 second cooldown per wallet)
_reindex_cooldowns: Dict[str, datetime] = {}
REINDEX_COOLDOWN_SECONDS = 60


# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

def get_current_quarter() -> str:
    """Get current quarter in format Q1 2025"""
    now = datetime.utcnow()
    quarter = (now.month - 1) // 3 + 1
    return f"Q{quarter} {now.year}"


def get_relative_due_date(due_date: Optional[datetime]) -> str:
    """Convert due date to user-friendly relative format"""
    if not due_date:
        return ""

    today = date.today()
    due = due_date.date() if isinstance(due_date, datetime) else due_date
    delta = (due - today).days

    if delta < 0:
        return f"Past due by {abs(delta)} day{'s' if abs(delta) != 1 else ''}"
    elif delta == 0:
        return "Due today"
    elif delta == 1:
        return "Due tomorrow"
    elif delta <= 7:
        return f"Due in {delta} days"
    else:
        return due_date.strftime("%b %d, %Y")


async def index_task_in_rag(task: Task, wallet_address: str) -> bool:
    """Index a task in Qdrant for AI queries"""
    if not RAG_AVAILABLE or not rag_service:
        return False

    try:
        # Create searchable text representation
        text = f"Task: {task.title}."
        text += f" Priority: {task.priority}."
        text += f" Category: {task.category}."

        if task.description:
            text += f" Details: {task.description}"

        if task.due_date:
            text += f" Due: {task.due_date.strftime('%B %d, %Y')}."

        if task.is_completed:
            text += " Status: Completed."
        else:
            text += " Status: Pending."

        # Generate unique CID-like identifier
        item_cid = f"planning-task-{task.id}"

        await rag_service.index_business_data(
            business_wallet=normalize_wallet_address(wallet_address),
            cid=item_cid,
            data={
                "text": text,
                "type": "task",
                "id": task.id,
                "title": task.title,
                "priority": task.priority,
                "category": task.category,
                "is_completed": task.is_completed,
                "due_date": task.due_date.isoformat() if task.due_date else None
            },
            integration="varity",
            data_type="planning"
        )

        logger.info(f"Indexed task {task.id} in RAG")
        return True

    except Exception as e:
        logger.error(f"Failed to index task {task.id} in RAG: {e}")
        return False


async def index_milestone_in_rag(milestone: Milestone, wallet_address: str) -> bool:
    """Index a milestone in Qdrant for AI queries"""
    if not RAG_AVAILABLE or not rag_service:
        return False

    try:
        # Create searchable text representation
        text = f"Company Goal: {milestone.title} for {milestone.timeframe_value}."
        text += f" Progress: {milestone.progress_percent}%."

        # Use user-friendly status labels
        status_labels = {
            "planned": "Not started",
            "in_progress": "Working on it",
            "completed": "Complete",
            "at_risk": "Needs attention"
        }
        text += f" Status: {status_labels.get(milestone.status, milestone.status)}."

        # Use user-friendly goal type labels
        goal_labels = {
            "growth": "Growth",
            "revenue": "Revenue",
            "product": "Product",
            "operations": "Operations"
        }
        text += f" Type: {goal_labels.get(milestone.goal_type, milestone.goal_type)} goal."

        if milestone.description:
            text += f" Details: {milestone.description}"

        # Generate unique CID-like identifier
        item_cid = f"planning-milestone-{milestone.id}"

        await rag_service.index_business_data(
            business_wallet=normalize_wallet_address(wallet_address),
            cid=item_cid,
            data={
                "text": text,
                "type": "milestone",
                "id": milestone.id,
                "title": milestone.title,
                "timeframe_type": milestone.timeframe_type,
                "timeframe_value": milestone.timeframe_value,
                "progress_percent": milestone.progress_percent,
                "status": milestone.status,
                "goal_type": milestone.goal_type
            },
            integration="varity",
            data_type="planning"
        )

        logger.info(f"Indexed milestone {milestone.id} in RAG")
        return True

    except Exception as e:
        logger.error(f"Failed to index milestone {milestone.id} in RAG: {e}")
        return False


async def delete_task_from_rag(task_id: int, wallet_address: str) -> bool:
    """Remove a task from Qdrant when deleted"""
    if not RAG_AVAILABLE or not rag_service:
        return False

    try:
        item_cid = f"planning-task-{task_id}"
        result = await rag_service.delete_point_by_cid(
            business_wallet=normalize_wallet_address(wallet_address),
            cid=item_cid
        )
        if result:
            logger.info(f"Deleted task {task_id} from RAG")
        return result
    except Exception as e:
        logger.error(f"Failed to delete task {task_id} from RAG: {e}")
        return False


async def delete_milestone_from_rag(milestone_id: int, wallet_address: str) -> bool:
    """Remove a milestone from Qdrant when deleted"""
    if not RAG_AVAILABLE or not rag_service:
        return False

    try:
        item_cid = f"planning-milestone-{milestone_id}"
        result = await rag_service.delete_point_by_cid(
            business_wallet=normalize_wallet_address(wallet_address),
            cid=item_cid
        )
        if result:
            logger.info(f"Deleted milestone {milestone_id} from RAG")
        return result
    except Exception as e:
        logger.error(f"Failed to delete milestone {milestone_id} from RAG: {e}")
        return False


# =====================================================================
# TASK ENDPOINTS
# =====================================================================

@router.get("/tasks", response_model=TaskListResponse)
async def get_tasks(
    wallet_address: str = Query(..., description="User's wallet address"),
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    limit: int = Query(50, description="Maximum number of tasks to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's tasks with optional filters

    Returns tasks sorted by due date (soonest first), then by priority.
    Includes summary statistics for task counts.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Build query
        query = select(Task).where(Task.wallet_address == normalized_wallet)

        if category:
            query = query.where(Task.category == category)
        if priority:
            query = query.where(Task.priority == priority)
        if completed is not None:
            query = query.where(Task.is_completed == completed)

        # Order by due date (nulls last), then priority, then created date
        query = query.order_by(
            Task.due_date.nullslast(),
            Task.priority.desc(),
            Task.created_at.desc()
        ).limit(limit)

        result = await db.execute(query)
        tasks = result.scalars().all()

        # Calculate stats
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)

        total_count = len(tasks)
        completed_count = len([t for t in tasks if t.is_completed])
        overdue_count = len([
            t for t in tasks
            if not t.is_completed and t.due_date and t.due_date < today
        ])
        today_count = len([
            t for t in tasks
            if not t.is_completed and t.due_date and today <= t.due_date < tomorrow
        ])

        # Convert to response format
        task_responses = [TaskResponse.model_validate(t) for t in tasks]

        return TaskListResponse(
            tasks=task_responses,
            total_count=total_count,
            completed_count=completed_count,
            overdue_count=overdue_count,
            today_count=today_count
        )

    except Exception as e:
        logger.error(f"Error fetching tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new task

    Automatically indexes the task in Qdrant for AI queries.
    """
    try:
        normalized_wallet = normalize_wallet_address(task_data.wallet_address)

        # Create task
        task = Task(
            wallet_address=normalized_wallet,
            title=task_data.title,
            description=task_data.description,
            priority=task_data.priority,
            category=task_data.category,
            due_date=task_data.due_date,
            is_completed=False
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        # Index in RAG
        indexed = await index_task_in_rag(task, normalized_wallet)
        if indexed:
            task.rag_indexed = True
            task.rag_indexed_at = datetime.utcnow()
            await db.commit()

        logger.info(f"Created task {task.id} for wallet {normalized_wallet[:15]}...")

        return TaskResponse.model_validate(task)

    except Exception as e:
        logger.error(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task")


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing task

    Re-indexes the task in Qdrant after update.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find task
        query = select(Task).where(
            and_(Task.id == task_id, Task.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        task = result.scalar_one_or_none()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Update fields
        if task_data.title is not None:
            task.title = task_data.title
        if task_data.description is not None:
            task.description = task_data.description
        if task_data.priority is not None:
            task.priority = task_data.priority
        if task_data.category is not None:
            task.category = task_data.category
        if task_data.due_date is not None:
            task.due_date = task_data.due_date
        if task_data.is_completed is not None:
            task.is_completed = task_data.is_completed
            if task_data.is_completed:
                task.completed_at = datetime.utcnow()
            else:
                task.completed_at = None

        await db.commit()
        await db.refresh(task)

        # Re-index in RAG and update tracking fields
        indexed = await index_task_in_rag(task, normalized_wallet)
        if indexed:
            task.rag_indexed = True
            task.rag_indexed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(task)

        logger.info(f"Updated task {task_id} (RAG indexed: {indexed})")

        return TaskResponse.model_validate(task)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task")


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a task

    Also removes the task from Qdrant index.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find task
        query = select(Task).where(
            and_(Task.id == task_id, Task.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        task = result.scalar_one_or_none()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Remove from Qdrant index first (before DB delete)
        rag_deleted = await delete_task_from_rag(task_id, normalized_wallet)

        await db.delete(task)
        await db.commit()

        logger.info(f"Deleted task {task_id} (RAG cleanup: {rag_deleted})")

        return {"success": True, "message": "Task deleted", "rag_deleted": rag_deleted}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task")


@router.post("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a task as complete

    Convenience endpoint for quickly completing tasks.
    Returns the updated task for animation purposes.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find task
        query = select(Task).where(
            and_(Task.id == task_id, Task.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        task = result.scalar_one_or_none()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        task.is_completed = True
        task.completed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(task)

        # Re-index in RAG with updated completion status
        indexed = await index_task_in_rag(task, normalized_wallet)
        if indexed:
            task.rag_indexed = True
            task.rag_indexed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(task)

        logger.info(f"Completed task {task_id} (RAG indexed: {indexed})")

        return TaskResponse.model_validate(task)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete task")


# =====================================================================
# MILESTONE/ROADMAP ENDPOINTS
# =====================================================================

@router.get("/roadmap", response_model=RoadmapResponse)
async def get_roadmap(
    wallet_address: str = Query(..., description="User's wallet address"),
    timeframe_type: Optional[str] = Query(None, description="Filter by timeframe type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get company roadmap with milestones

    Returns milestones grouped by timeframe with overall progress stats.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Build query
        query = select(Milestone).where(Milestone.wallet_address == normalized_wallet)

        if timeframe_type:
            query = query.where(Milestone.timeframe_type == timeframe_type)
        if status:
            query = query.where(Milestone.status == status)

        # Order by timeframe value, then by created date
        query = query.order_by(
            Milestone.timeframe_value,
            Milestone.created_at.desc()
        )

        result = await db.execute(query)
        milestones = result.scalars().all()

        # Calculate stats
        total_count = len(milestones)
        completed_count = len([m for m in milestones if m.status == "completed"])
        in_progress_count = len([m for m in milestones if m.status == "in_progress"])
        at_risk_count = len([m for m in milestones if m.status == "at_risk"])

        # Calculate overall progress (average of all milestone progress)
        overall_progress = 0
        if total_count > 0:
            overall_progress = sum(m.progress_percent for m in milestones) // total_count

        # Convert to response format
        milestone_responses = [MilestoneResponse.model_validate(m) for m in milestones]

        return RoadmapResponse(
            milestones=milestone_responses,
            current_timeframe=get_current_quarter(),
            overall_progress=overall_progress,
            total_count=total_count,
            completed_count=completed_count,
            in_progress_count=in_progress_count,
            at_risk_count=at_risk_count
        )

    except Exception as e:
        logger.error(f"Error fetching roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch roadmap")


@router.post("/roadmap/milestones", response_model=MilestoneResponse)
async def create_milestone(
    milestone_data: MilestoneCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new milestone

    Automatically indexes the milestone in Qdrant for AI queries.
    """
    try:
        normalized_wallet = normalize_wallet_address(milestone_data.wallet_address)

        # Create milestone
        milestone = Milestone(
            wallet_address=normalized_wallet,
            title=milestone_data.title,
            description=milestone_data.description,
            timeframe_type=milestone_data.timeframe_type,
            timeframe_value=milestone_data.timeframe_value,
            target_date=milestone_data.target_date,
            goal_type=milestone_data.goal_type,
            color=milestone_data.color,
            progress_percent=0,
            status="planned"
        )

        db.add(milestone)
        await db.commit()
        await db.refresh(milestone)

        # Index in RAG
        indexed = await index_milestone_in_rag(milestone, normalized_wallet)
        if indexed:
            milestone.rag_indexed = True
            milestone.rag_indexed_at = datetime.utcnow()
            await db.commit()

        logger.info(f"Created milestone {milestone.id} for wallet {normalized_wallet[:15]}...")

        return MilestoneResponse.model_validate(milestone)

    except Exception as e:
        logger.error(f"Error creating milestone: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create milestone")


@router.patch("/roadmap/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: int,
    milestone_data: MilestoneUpdate,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing milestone

    Re-indexes the milestone in Qdrant after update.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find milestone
        query = select(Milestone).where(
            and_(Milestone.id == milestone_id, Milestone.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        milestone = result.scalar_one_or_none()

        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")

        # Update fields
        if milestone_data.title is not None:
            milestone.title = milestone_data.title
        if milestone_data.description is not None:
            milestone.description = milestone_data.description
        if milestone_data.timeframe_type is not None:
            milestone.timeframe_type = milestone_data.timeframe_type
        if milestone_data.timeframe_value is not None:
            milestone.timeframe_value = milestone_data.timeframe_value
        if milestone_data.target_date is not None:
            milestone.target_date = milestone_data.target_date
        if milestone_data.progress_percent is not None:
            milestone.progress_percent = milestone_data.progress_percent
            # Auto-update status based on progress
            if milestone.progress_percent >= 100:
                milestone.status = "completed"
                milestone.completed_at = datetime.utcnow()
            elif milestone.progress_percent > 0 and milestone.status == "planned":
                milestone.status = "in_progress"
        if milestone_data.status is not None:
            milestone.status = milestone_data.status
            if milestone_data.status == "completed":
                milestone.completed_at = datetime.utcnow()
        if milestone_data.goal_type is not None:
            milestone.goal_type = milestone_data.goal_type
        if milestone_data.color is not None:
            milestone.color = milestone_data.color

        await db.commit()
        await db.refresh(milestone)

        # Re-index in RAG and update tracking fields
        indexed = await index_milestone_in_rag(milestone, normalized_wallet)
        if indexed:
            milestone.rag_indexed = True
            milestone.rag_indexed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(milestone)

        logger.info(f"Updated milestone {milestone_id} (RAG indexed: {indexed})")

        return MilestoneResponse.model_validate(milestone)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone {milestone_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update milestone")


@router.delete("/roadmap/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: int,
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a milestone

    Also removes the milestone from Qdrant index.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find milestone
        query = select(Milestone).where(
            and_(Milestone.id == milestone_id, Milestone.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        milestone = result.scalar_one_or_none()

        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")

        # Remove from Qdrant index first (before DB delete)
        rag_deleted = await delete_milestone_from_rag(milestone_id, normalized_wallet)

        await db.delete(milestone)
        await db.commit()

        logger.info(f"Deleted milestone {milestone_id} (RAG cleanup: {rag_deleted})")

        return {"success": True, "message": "Milestone deleted", "rag_deleted": rag_deleted}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting milestone {milestone_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete milestone")


@router.post("/roadmap/milestones/{milestone_id}/progress", response_model=MilestoneResponse)
async def update_milestone_progress(
    milestone_id: int,
    progress: int = Query(..., ge=0, le=100, description="Progress percentage (0-100)"),
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update milestone progress

    Convenience endpoint for quickly updating progress.
    Automatically updates status based on progress.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Find milestone
        query = select(Milestone).where(
            and_(Milestone.id == milestone_id, Milestone.wallet_address == normalized_wallet)
        )
        result = await db.execute(query)
        milestone = result.scalar_one_or_none()

        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")

        milestone.progress_percent = progress

        # Auto-update status
        if progress >= 100:
            milestone.status = "completed"
            milestone.completed_at = datetime.utcnow()
        elif progress > 0 and milestone.status == "planned":
            milestone.status = "in_progress"

        await db.commit()
        await db.refresh(milestone)

        # Re-index in RAG and update tracking fields
        indexed = await index_milestone_in_rag(milestone, normalized_wallet)
        if indexed:
            milestone.rag_indexed = True
            milestone.rag_indexed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(milestone)

        logger.info(f"Updated milestone {milestone_id} progress to {progress}% (RAG indexed: {indexed})")

        return MilestoneResponse.model_validate(milestone)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update milestone progress")


# =====================================================================
# RAG MONITORING & MAINTENANCE ENDPOINTS
# =====================================================================

@router.get("/rag-health")
async def get_rag_health(
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Get RAG health status for planning data

    Returns:
    - Qdrant connection status
    - Collection stats (document count)
    - Recent indexing activity
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        if not RAG_AVAILABLE or not rag_service:
            return {
                "status": "unavailable",
                "message": "RAG service not configured",
                "collection_exists": False,
                "document_count": 0
            }

        # Check Qdrant health
        is_healthy = await rag_service.health_check()

        if not is_healthy:
            return {
                "status": "unhealthy",
                "message": "Qdrant connection failed",
                "collection_exists": False,
                "document_count": 0
            }

        # Get collection stats
        try:
            stats = await rag_service.get_collection_stats(normalized_wallet)
            return {
                "status": "healthy",
                "message": "RAG service operational",
                "collection_exists": stats.get("exists", False),
                "document_count": stats.get("count", 0),
                "indexed_vectors": stats.get("vectors_count", 0)
            }
        except Exception as stats_error:
            logger.warning(f"Could not get collection stats: {stats_error}")
            return {
                "status": "healthy",
                "message": "RAG service operational (stats unavailable)",
                "collection_exists": False,
                "document_count": 0
            }

    except Exception as e:
        logger.error(f"Error checking RAG health: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "collection_exists": False,
            "document_count": 0
        }


@router.post("/reindex")
async def reindex_planning_data(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-index all planning data (tasks and milestones) in Qdrant

    Useful for:
    - Recovery after Qdrant outages
    - Fixing missing or corrupted RAG entries
    - Manual re-sync after issues
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        # Check rate limit
        now = datetime.utcnow()
        last_reindex = _reindex_cooldowns.get(normalized_wallet)
        if last_reindex:
            elapsed = (now - last_reindex).total_seconds()
            if elapsed < REINDEX_COOLDOWN_SECONDS:
                retry_after = int(REINDEX_COOLDOWN_SECONDS - elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limited. Please wait {retry_after} seconds before re-indexing.",
                    headers={"Retry-After": str(retry_after)}
                )

        # Update cooldown timestamp
        _reindex_cooldowns[normalized_wallet] = now

        # Clean old entries to prevent memory leak (older than 5 minutes)
        cutoff = now - timedelta(minutes=5)
        for wallet in list(_reindex_cooldowns.keys()):
            if _reindex_cooldowns[wallet] < cutoff:
                del _reindex_cooldowns[wallet]

        if not RAG_AVAILABLE or not rag_service:
            raise HTTPException(
                status_code=503,
                detail="RAG service not available"
            )

        # Get all tasks for this wallet
        tasks_query = select(Task).where(Task.wallet_address == normalized_wallet)
        tasks_result = await db.execute(tasks_query)
        tasks = tasks_result.scalars().all()

        # Get all milestones for this wallet
        milestones_query = select(Milestone).where(Milestone.wallet_address == normalized_wallet)
        milestones_result = await db.execute(milestones_query)
        milestones = milestones_result.scalars().all()

        # Re-index all tasks
        tasks_indexed = 0
        tasks_failed = 0
        for task in tasks:
            try:
                indexed = await index_task_in_rag(task, normalized_wallet)
                if indexed:
                    task.rag_indexed = True
                    task.rag_indexed_at = datetime.utcnow()
                    tasks_indexed += 1
                else:
                    tasks_failed += 1
            except Exception as e:
                logger.error(f"Failed to reindex task {task.id}: {e}")
                tasks_failed += 1

        # Re-index all milestones
        milestones_indexed = 0
        milestones_failed = 0
        for milestone in milestones:
            try:
                indexed = await index_milestone_in_rag(milestone, normalized_wallet)
                if indexed:
                    milestone.rag_indexed = True
                    milestone.rag_indexed_at = datetime.utcnow()
                    milestones_indexed += 1
                else:
                    milestones_failed += 1
            except Exception as e:
                logger.error(f"Failed to reindex milestone {milestone.id}: {e}")
                milestones_failed += 1

        # Commit rag_indexed updates
        await db.commit()

        logger.info(
            f"Re-indexing complete for {normalized_wallet[:15]}...: "
            f"tasks={tasks_indexed}/{len(tasks)}, milestones={milestones_indexed}/{len(milestones)}"
        )

        return {
            "success": True,
            "tasks": {
                "total": len(tasks),
                "indexed": tasks_indexed,
                "failed": tasks_failed
            },
            "milestones": {
                "total": len(milestones),
                "indexed": milestones_indexed,
                "failed": milestones_failed
            },
            "message": f"Re-indexed {tasks_indexed} tasks and {milestones_indexed} milestones"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error re-indexing planning data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to re-index planning data")
