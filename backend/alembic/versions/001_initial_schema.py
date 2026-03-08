"""Initial schema: users, wishlists, wishlist_items, reservations, contributions

Revision ID: 001
Revises:
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "wishlists",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wishlists_slug"), "wishlists", ["slug"], unique=True)
    op.create_index(op.f("ix_wishlists_user_id"), "wishlists", ["user_id"], unique=False)

    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("wishlist_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("url", sa.String(2048), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("image_url", sa.String(2048), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", sa.Enum("solo", "group", name="itemtype"), nullable=False),
        sa.Column("target_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("active", "deleted", name="itemstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wishlist_items_wishlist_id"), "wishlist_items", ["wishlist_id"], unique=False)

    op.create_table(
        "reservations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("guest_name", sa.String(255), nullable=False),
        sa.Column("guest_identifier", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["wishlist_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reservations_item_id"), "reservations", ["item_id"], unique=False)
    op.create_index(op.f("ix_reservations_guest_identifier"), "reservations", ["guest_identifier"], unique=False)

    op.create_table(
        "contributions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("guest_name", sa.String(255), nullable=False),
        sa.Column("guest_identifier", sa.String(64), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["wishlist_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contributions_item_id"), "contributions", ["item_id"], unique=False)
    op.create_index(op.f("ix_contributions_guest_identifier"), "contributions", ["guest_identifier"], unique=False)


def downgrade() -> None:
    op.drop_table("contributions")
    op.drop_table("reservations")
    op.drop_table("wishlist_items")
    op.drop_table("wishlists")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS itemstatus")
    op.execute("DROP TYPE IF EXISTS itemtype")
