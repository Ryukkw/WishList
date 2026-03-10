"""Add show_reserved_to_owner and show_reserved_to_guests to wishlists

Revision ID: 003
Revises: 002
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("wishlists", sa.Column("show_reserved_to_owner", sa.Boolean(), nullable=True))
    op.add_column("wishlists", sa.Column("show_reserved_to_guests", sa.Boolean(), nullable=True))
    op.execute("UPDATE wishlists SET show_reserved_to_owner = true WHERE show_reserved_to_owner IS NULL")
    op.execute("UPDATE wishlists SET show_reserved_to_guests = false WHERE show_reserved_to_guests IS NULL")
    op.alter_column("wishlists", "show_reserved_to_owner", nullable=False, server_default=sa.text("true"))
    op.alter_column("wishlists", "show_reserved_to_guests", nullable=False, server_default=sa.text("false"))


def downgrade() -> None:
    op.drop_column("wishlists", "show_reserved_to_guests")
    op.drop_column("wishlists", "show_reserved_to_owner")
