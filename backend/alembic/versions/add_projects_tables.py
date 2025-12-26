"""Add projects tables for AI Assistant project organization

Revision ID: add_projects_tables
Revises: add_nft_cols_001
Create Date: 2025-12-24

This migration is idempotent - checks for existence before creating objects.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'add_projects_tables'
down_revision: Union[str, None] = 'add_nft_cols_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table_name)"
    ), {"table_name": table_name})
    return result.scalar()


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = :table_name AND column_name = :column_name)"
    ), {"table_name": table_name, "column_name": column_name})
    return result.scalar()


def index_exists(index_name: str) -> bool:
    """Check if an index exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = :index_name)"
    ), {"index_name": index_name})
    return result.scalar()


def constraint_exists(constraint_name: str) -> bool:
    """Check if a constraint exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = :constraint_name)"
    ), {"constraint_name": constraint_name})
    return result.scalar()


def upgrade() -> None:
    # Create projects table (idempotent - check if exists first)
    if not table_exists('projects'):
        op.create_table(
            'projects',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(255), nullable=False),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('color', sa.String(7), nullable=True, server_default='#3B82F6'),
            sa.Column('icon', sa.String(50), nullable=True, server_default='folder'),
            sa.Column('custom_instructions', sa.Text(), nullable=True),
            sa.Column('is_archived', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    if not index_exists('idx_projects_wallet'):
        op.create_index('idx_projects_wallet', 'projects', ['wallet_address'])

    if not index_exists('idx_projects_archived'):
        op.create_index('idx_projects_archived', 'projects', ['is_archived'])

    # Create project_files table - supports both uploads and integration links (idempotent)
    if not table_exists('project_files'):
        op.create_table(
            'project_files',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(255), nullable=False),
            sa.Column('file_name', sa.String(255), nullable=False),
            sa.Column('file_type', sa.String(50), nullable=True),
            sa.Column('source_type', sa.String(20), nullable=False, server_default='upload'),
            sa.Column('cid', sa.String(255), nullable=True),
            sa.Column('integration_ref', postgresql.JSONB(), nullable=True),
            sa.Column('content_preview', sa.Text(), nullable=True),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    if not index_exists('idx_project_files_project'):
        op.create_index('idx_project_files_project', 'project_files', ['project_id'])

    if not index_exists('idx_project_files_wallet'):
        op.create_index('idx_project_files_wallet', 'project_files', ['wallet_address'])

    # Add project_id to conversations table (idempotent)
    if not column_exists('conversations', 'project_id'):
        op.add_column('conversations', sa.Column('project_id', sa.Integer(), nullable=True))

    if not constraint_exists('fk_conversations_project'):
        op.create_foreign_key(
            'fk_conversations_project',
            'conversations',
            'projects',
            ['project_id'],
            ['id'],
            ondelete='SET NULL'
        )

    if not index_exists('idx_conversations_project'):
        op.create_index('idx_conversations_project', 'conversations', ['project_id'])


def downgrade() -> None:
    # Remove project_id from conversations
    op.drop_index('idx_conversations_project', table_name='conversations')
    op.drop_constraint('fk_conversations_project', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'project_id')

    # Drop project_files table
    op.drop_index('idx_project_files_wallet', table_name='project_files')
    op.drop_index('idx_project_files_project', table_name='project_files')
    op.drop_table('project_files')

    # Drop projects table
    op.drop_index('idx_projects_archived', table_name='projects')
    op.drop_index('idx_projects_wallet', table_name='projects')
    op.drop_table('projects')
