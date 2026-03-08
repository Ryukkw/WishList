from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from app.models.wishlist import ItemType


class WishlistCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: date | None = None


class WishlistUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: date | None = None


class WishlistResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str | None
    event_date: date | None
    is_public: bool
    created_at: str
    item_count: int = 0
    reserved_count: int = 0
    contributions_total: Decimal | None = None

    class Config:
        from_attributes = True


class WishlistItemCreate(BaseModel):
    title: str
    url: str | None = None
    price: Decimal | None = None
    image_url: str | None = None
    description: str | None = None
    type: ItemType = ItemType.solo
    target_amount: Decimal | None = None


class WishlistItemUpdate(BaseModel):
    title: str | None = None
    url: str | None = None
    price: Decimal | None = None
    image_url: str | None = None
    description: str | None = None
    type: ItemType | None = None
    target_amount: Decimal | None = None


class WishlistItemResponse(BaseModel):
    id: int
    wishlist_id: int
    title: str
    url: str | None
    price: Decimal | None
    image_url: str | None
    description: str | None
    type: ItemType
    target_amount: Decimal | None
    position: int
    status: str
    created_at: str
    reservation_count: int = 0
    contribution_total: Decimal | None = None
    contribution_percentage: float | None = None

    class Config:
        from_attributes = True


class ReorderItemsRequest(BaseModel):
    item_ids: list[int]  # ordered list of item ids
