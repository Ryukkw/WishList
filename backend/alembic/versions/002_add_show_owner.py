"""Add show_owner to wishlists

Revision ID: 002
Revises: 001
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("wishlists", sa.Column("show_owner", sa.Boolean(), nullable=True))
    op.execute("UPDATE wishlists SET show_owner = false WHERE show_owner IS NULL")
    op.alter_column("wishlists", "show_owner", nullable=False, server_default=sa.false())


def downgrade() -> None:
    op.drop_column("wishlists", "show_owner")
