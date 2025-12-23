"""Add NFT tracking columns to purchases table

Revision ID: add_nft_cols_001
Revises: add_team_tables
Create Date: 2025-12-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_nft_cols_001'
down_revision: Union[str, None] = 'add_team_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add NFT tracking columns to purchases table
    # These columns were added to the model but never migrated
    op.add_column('purchases', sa.Column('nft_token_id', sa.Integer(), nullable=True))
    op.add_column('purchases', sa.Column('nft_tx_hash', sa.String(length=66), nullable=True))
    op.add_column('purchases', sa.Column('nft_minted', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    op.drop_column('purchases', 'nft_minted')
    op.drop_column('purchases', 'nft_tx_hash')
    op.drop_column('purchases', 'nft_token_id')
