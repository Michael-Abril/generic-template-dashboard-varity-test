"""Add team management tables

Revision ID: add_team_tables
Revises: add_feedback_tables
Create Date: 2025-12-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_team_tables'
down_revision = 'add_feedback_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create teams table
    op.create_table(
        'teams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_wallet', sa.String(42), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_wallet', name='uq_teams_owner_wallet')
    )
    op.create_index('idx_teams_owner_wallet', 'teams', ['owner_wallet'])

    # Create team_members table
    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('wallet_address', sa.String(42), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'email', name='uq_team_member_email')
    )
    op.create_index('idx_team_member_email', 'team_members', ['email'])
    op.create_index('idx_team_member_wallet', 'team_members', ['wallet_address'])
    op.create_index('idx_team_member_status', 'team_members', ['status'])
    op.create_index('idx_team_member_team_id', 'team_members', ['team_id'])

    # Create team_invitations table
    op.create_table(
        'team_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('invited_by_wallet', sa.String(42), nullable=False),
        sa.Column('invited_by_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['member_id'], ['team_members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token', name='uq_invitation_token')
    )
    op.create_index('idx_invitation_token', 'team_invitations', ['token'])
    op.create_index('idx_invitation_status', 'team_invitations', ['status'])
    op.create_index('idx_invitation_email', 'team_invitations', ['email'])
    op.create_index('idx_invitation_team_id', 'team_invitations', ['team_id'])


def downgrade() -> None:
    op.drop_table('team_invitations')
    op.drop_table('team_members')
    op.drop_table('teams')
