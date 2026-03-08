from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
import enum
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ItemType(str, enum.Enum):
    solo = "solo"      # подарить целиком
    group = "group"    # скинуться вместе


class ItemStatus(str, enum.Enum):
    active = "active"
    deleted = "deleted"


class Wishlist(Base):
    __tablename__ = "wishlists"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_public: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="wishlists")
    items: Mapped[list["WishlistItem"]] = relationship(
        "WishlistItem", back_populates="wishlist", order_by="WishlistItem.position"
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wishlist_id: Mapped[int] = mapped_column(ForeignKey("wishlists.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[ItemType] = mapped_column(nullable=False, default=ItemType.solo)
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)  # for group
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[ItemStatus] = mapped_column(nullable=False, default=ItemStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    wishlist: Mapped["Wishlist"] = relationship("Wishlist", back_populates="items")
    reservations: Mapped[list["Reservation"]] = relationship("Reservation", back_populates="item")
    contributions: Mapped[list["Contribution"]] = relationship("Contribution", back_populates="item")
