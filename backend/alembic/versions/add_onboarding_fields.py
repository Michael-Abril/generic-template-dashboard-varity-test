"""Add onboarding and trial fields to user_settings

Revision ID: add_onboarding_fields
Revises: fix_oauth_product_id
Create Date: 2025-12-17

This migration adds new fields to user_settings for:
- Company profile (company_size, primary_goal) for AI personalization
- Trial tracking (trial_tier, trial_start_date, trial_end_date)
- Onboarding status (onboarding_completed, onboarding_completed_at, onboarding_step)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_onboarding_fields'
down_revision: Union[str, None] = 'fix_oauth_product_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add company profile fields for AI personalization
    try:
        with op.batch_alter_table('user_settings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('company_size', sa.String(), nullable=True))
            batch_op.add_column(sa.Column('primary_goal', sa.String(), nullable=True))
    except Exception:
        # Columns might already exist
        pass

    # Add trial and subscription fields
    try:
        with op.batch_alter_table('user_settings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('trial_tier', sa.String(), nullable=True))
            batch_op.add_column(sa.Column('trial_start_date', sa.DateTime(timezone=True), nullable=True))
            batch_op.add_column(sa.Column('trial_end_date', sa.DateTime(timezone=True), nullable=True))
    except Exception:
        # Columns might already exist
        pass

    # Add onboarding tracking fields
    try:
        with op.batch_alter_table('user_settings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=True))
            batch_op.add_column(sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
            batch_op.add_column(sa.Column('onboarding_step', sa.String(), nullable=True))
    except Exception:
        # Columns might already exist
        pass


def downgrade() -> None:
    # Remove all new fields
    with op.batch_alter_table('user_settings', schema=None) as batch_op:
        batch_op.drop_column('onboarding_step')
        batch_op.drop_column('onboarding_completed_at')
        batch_op.drop_column('onboarding_completed')
        batch_op.drop_column('trial_end_date')
        batch_op.drop_column('trial_start_date')
        batch_op.drop_column('trial_tier')
        batch_op.drop_column('primary_goal')
        batch_op.drop_column('company_size')
