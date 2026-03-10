"""Add verification_codes table for 2FA (password/email change)

Revision ID: 004
Revises: 003
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "verification_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(32), nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("pending_value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_verification_codes_user_id"), "verification_codes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_verification_codes_user_id"), table_name="verification_codes")
    op.drop_table("verification_codes")
