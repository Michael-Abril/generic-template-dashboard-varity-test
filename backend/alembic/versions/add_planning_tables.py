"""Add planning tables for tasks and milestones

Revision ID: add_planning_tables
Revises: add_projects_tables
Create Date: 2025-12-28

This migration adds the tasks and milestones tables for business planning.
Tasks are to-do items, milestones are company roadmap goals.
Both support RAG integration for AI-powered insights.

This migration is idempotent - checks for existence before creating objects.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'add_planning_tables'
down_revision: Union[str, None] = 'add_projects_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table_name)"
    ), {"table_name": table_name})
    return result.scalar()


def index_exists(index_name: str) -> bool:
    """Check if an index exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = :index_name)"
    ), {"index_name": index_name})
    return result.scalar()


def upgrade() -> None:
    # Create tasks table (to-do items)
    if not table_exists('tasks'):
        op.create_table(
            'tasks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(255), nullable=False),
            # Task details
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            # Categorization
            sa.Column('priority', sa.String(20), nullable=True, server_default='medium'),
            sa.Column('category', sa.String(50), nullable=True, server_default='operations'),
            # Status
            sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            # Due date
            sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
            # RAG tracking
            sa.Column('rag_indexed', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('rag_indexed_at', sa.DateTime(timezone=True), nullable=True),
            # Timestamps
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    # Create indexes for tasks
    if not index_exists('idx_tasks_wallet'):
        op.create_index('idx_tasks_wallet', 'tasks', ['wallet_address'])

    if not index_exists('idx_tasks_priority'):
        op.create_index('idx_tasks_priority', 'tasks', ['priority'])

    if not index_exists('idx_tasks_completed'):
        op.create_index('idx_tasks_completed', 'tasks', ['is_completed'])

    if not index_exists('idx_tasks_due_date'):
        op.create_index('idx_tasks_due_date', 'tasks', ['due_date'])

    if not index_exists('idx_tasks_category'):
        op.create_index('idx_tasks_category', 'tasks', ['category'])

    # Create milestones table (company roadmap goals)
    if not table_exists('milestones'):
        op.create_table(
            'milestones',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(255), nullable=False),
            # Milestone details
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            # Timeline
            sa.Column('timeframe_type', sa.String(20), nullable=True, server_default='quarterly'),
            sa.Column('timeframe_value', sa.String(100), nullable=False),
            sa.Column('target_date', sa.DateTime(timezone=True), nullable=True),
            # Progress tracking
            sa.Column('progress_percent', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('status', sa.String(20), nullable=True, server_default='planned'),
            # Goal category
            sa.Column('goal_type', sa.String(50), nullable=True, server_default='growth'),
            # Visual
            sa.Column('color', sa.String(7), nullable=True, server_default='#3B82F6'),
            # RAG tracking
            sa.Column('rag_indexed', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('rag_indexed_at', sa.DateTime(timezone=True), nullable=True),
            # Timestamps
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    # Create indexes for milestones
    if not index_exists('idx_milestones_wallet'):
        op.create_index('idx_milestones_wallet', 'milestones', ['wallet_address'])

    if not index_exists('idx_milestones_timeframe'):
        op.create_index('idx_milestones_timeframe', 'milestones', ['timeframe_type', 'timeframe_value'])

    if not index_exists('idx_milestones_status'):
        op.create_index('idx_milestones_status', 'milestones', ['status'])

    if not index_exists('idx_milestones_goal_type'):
        op.create_index('idx_milestones_goal_type', 'milestones', ['goal_type'])


def downgrade() -> None:
    # Drop milestones indexes and table
    if index_exists('idx_milestones_goal_type'):
        op.drop_index('idx_milestones_goal_type', table_name='milestones')
    if index_exists('idx_milestones_status'):
        op.drop_index('idx_milestones_status', table_name='milestones')
    if index_exists('idx_milestones_timeframe'):
        op.drop_index('idx_milestones_timeframe', table_name='milestones')
    if index_exists('idx_milestones_wallet'):
        op.drop_index('idx_milestones_wallet', table_name='milestones')
    if table_exists('milestones'):
        op.drop_table('milestones')

    # Drop tasks indexes and table
    if index_exists('idx_tasks_category'):
        op.drop_index('idx_tasks_category', table_name='tasks')
    if index_exists('idx_tasks_due_date'):
        op.drop_index('idx_tasks_due_date', table_name='tasks')
    if index_exists('idx_tasks_completed'):
        op.drop_index('idx_tasks_completed', table_name='tasks')
    if index_exists('idx_tasks_priority'):
        op.drop_index('idx_tasks_priority', table_name='tasks')
    if index_exists('idx_tasks_wallet'):
        op.drop_index('idx_tasks_wallet', table_name='tasks')
    if table_exists('tasks'):
        op.drop_table('tasks')
