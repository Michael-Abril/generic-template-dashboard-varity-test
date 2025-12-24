"""Add projects tables for AI Assistant project organization

Revision ID: add_projects_tables
Revises: add_nft_cols_001
Create Date: 2025-12-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_projects_tables'
down_revision: Union[str, None] = 'add_nft_cols_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create projects table
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
    op.create_index('idx_projects_wallet', 'projects', ['wallet_address'])
    op.create_index('idx_projects_archived', 'projects', ['is_archived'])

    # Create project_files table - supports both uploads and integration links
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
    op.create_index('idx_project_files_project', 'project_files', ['project_id'])
    op.create_index('idx_project_files_wallet', 'project_files', ['wallet_address'])

    # Add project_id to conversations table
    op.add_column('conversations', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_conversations_project',
        'conversations',
        'projects',
        ['project_id'],
        ['id'],
        ondelete='SET NULL'
    )
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
