"""Add feedback tables for trial milestone feedback collection

Revision ID: add_feedback_tables
Revises: add_onboarding_fields
Create Date: 2025-12-18

This migration creates tables for:
- feedback: User feedback submitted during trial milestones (Day 7, 25, 30)
- feedback_summary: Aggregated feedback statistics for admin dashboard
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_feedback_tables'
down_revision: Union[str, None] = 'add_onboarding_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wallet_address', sa.String(), nullable=False),
        sa.Column('feedback_type', sa.String(), nullable=False),
        sa.Column('trial_days_remaining', sa.Integer(), nullable=True),
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('industry', sa.String(), nullable=True),
        sa.Column('responses', sa.JSON(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('session_duration_days', sa.Integer(), nullable=True),
        sa.Column('integrations_connected', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedback_id'), 'feedback', ['id'], unique=False)
    op.create_index(op.f('ix_feedback_wallet_address'), 'feedback', ['wallet_address'], unique=False)

    # Create feedback_summary table
    op.create_table(
        'feedback_summary',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('feedback_type', sa.String(), nullable=False),
        sa.Column('total_submissions', sa.Integer(), server_default='0', nullable=True),
        sa.Column('avg_nps_score', sa.Integer(), nullable=True),
        sa.Column('promoters_count', sa.Integer(), nullable=True),
        sa.Column('passives_count', sa.Integer(), nullable=True),
        sa.Column('detractors_count', sa.Integer(), nullable=True),
        sa.Column('avg_satisfaction', sa.Integer(), nullable=True),
        sa.Column('upgrade_count', sa.Integer(), nullable=True),
        sa.Column('need_more_time_count', sa.Integer(), nullable=True),
        sa.Column('not_right_fit_count', sa.Integer(), nullable=True),
        sa.Column('too_expensive_count', sa.Integer(), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedback_summary_id'), 'feedback_summary', ['id'], unique=False)

    # Add contact info fields to user_settings (if not already present from previous migration)
    # These might already exist if add_onboarding_fields was modified, but we use batch_alter_table
    # with exception handling to be safe
    try:
        with op.batch_alter_table('user_settings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('contact_email', sa.String(), nullable=True))
            batch_op.add_column(sa.Column('contact_name', sa.String(), nullable=True))
            batch_op.add_column(sa.Column('referral_source', sa.String(), nullable=True))
    except Exception:
        # Columns might already exist from a previous deployment
        pass


def downgrade() -> None:
    # Drop indexes and tables
    op.drop_index(op.f('ix_feedback_summary_id'), table_name='feedback_summary')
    op.drop_table('feedback_summary')
    op.drop_index(op.f('ix_feedback_wallet_address'), table_name='feedback')
    op.drop_index(op.f('ix_feedback_id'), table_name='feedback')
    op.drop_table('feedback')

    # Remove contact info fields from user_settings
    try:
        with op.batch_alter_table('user_settings', schema=None) as batch_op:
            batch_op.drop_column('referral_source')
            batch_op.drop_column('contact_name')
            batch_op.drop_column('contact_email')
    except Exception:
        pass
