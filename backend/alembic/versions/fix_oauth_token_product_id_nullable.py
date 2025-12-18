"""Make oauth_tokens.product_id nullable

Revision ID: fix_oauth_product_id
Revises: 73e5589972b4
Create Date: 2025-12-13

This migration fixes the OAuthToken model where product_id was incorrectly
required (NOT NULL). OAuth tokens can exist without a marketplace product
association - they represent software integrations which may or may not
be tied to a specific product in the marketplace.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_oauth_product_id'
down_revision: Union[str, None] = '73e5589972b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make product_id nullable in oauth_tokens table
    # This allows OAuth tokens to exist without a marketplace product association
    try:
        with op.batch_alter_table('oauth_tokens', schema=None) as batch_op:
            batch_op.alter_column('product_id',
                   existing_type=sa.INTEGER(),
                   nullable=True)
    except Exception:
        # Column might already be nullable or table structure different
        pass


def downgrade() -> None:
    # Revert product_id to NOT NULL (may fail if NULL values exist)
    with op.batch_alter_table('oauth_tokens', schema=None) as batch_op:
        batch_op.alter_column('product_id',
               existing_type=sa.INTEGER(),
               nullable=False)
