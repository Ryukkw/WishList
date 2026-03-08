import re
import secrets
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_db
from app.models import User, Wishlist, WishlistItem, Reservation, Contribution
from app.models.wishlist import ItemStatus, ItemType
from app.schemas.wishlist import (
    WishlistCreate,
    WishlistUpdate,
    WishlistResponse,
    WishlistItemCreate,
    WishlistItemUpdate,
    WishlistItemResponse,
    ReorderItemsRequest,
)

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])


def slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "list"
    return f"{base}-{secrets.token_hex(3)}"


async def get_wishlist_owned(
    wishlist_id: int,
    user: User,
    db: AsyncSession,
) -> Wishlist:
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.user_id == user.id)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    return wl


def wishlist_to_response(wl: Wishlist, item_count: int = 0, reserved_count: int = 0, contributions_total: Decimal | None = None) -> WishlistResponse:
    return WishlistResponse(
        id=wl.id,
        title=wl.title,
        slug=wl.slug,
        description=wl.description,
        event_date=wl.event_date,
        is_public=wl.is_public,
        created_at=wl.created_at.isoformat() if wl.created_at else "",
        item_count=item_count,
        reserved_count=reserved_count,
        contributions_total=contributions_total,
    )


def item_to_response(
    item: WishlistItem,
    reservation_count: int = 0,
    contribution_total: Decimal | None = None,
    contribution_percentage: float | None = None,
) -> WishlistItemResponse:
    return WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        title=item.title,
        url=item.url,
        price=item.price,
        image_url=item.image_url,
        description=item.description,
        type=item.type,
        target_amount=item.target_amount,
        position=item.position,
        status=item.status.value,
        created_at=item.created_at.isoformat() if item.created_at else "",
        reservation_count=reservation_count,
        contribution_total=contribution_total,
        contribution_percentage=contribution_percentage,
    )


@router.get("", response_model=list[WishlistResponse])
async def list_wishlists(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == current_user.id).order_by(Wishlist.created_at.desc())
    )
    wishlists = result.scalars().all()
    out = []
    for wl in wishlists:
        items_result = await db.execute(
            select(func.count(WishlistItem.id)).where(
                WishlistItem.wishlist_id == wl.id, WishlistItem.status == ItemStatus.active
            )
        )
        item_count = items_result.scalar() or 0
        res_result = await db.execute(
            select(func.count(Reservation.id)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
        )
        reserved_count = res_result.scalar() or 0
        contrib_result = await db.execute(
            select(func.coalesce(func.sum(Contribution.amount), 0)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
        )
        contributions_total = contrib_result.scalar() or Decimal("0")
        out.append(wishlist_to_response(wl, item_count=item_count, reserved_count=reserved_count, contributions_total=contributions_total))
    return out


@router.post("", response_model=WishlistResponse, status_code=status.HTTP_201_CREATED)
async def create_wishlist(
    body: WishlistCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    slug = slugify(body.title)
    existing = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    while existing.scalar_one_or_none():
        slug = slugify(body.title)  # new random suffix each time
        existing = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    wl = Wishlist(
        user_id=current_user.id,
        title=body.title,
        slug=slug,
        description=body.description,
        event_date=body.event_date,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return wishlist_to_response(wl)


@router.get("/{wishlist_id}", response_model=WishlistResponse)
async def get_wishlist(
    wishlist_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await get_wishlist_owned(wishlist_id, current_user, db)
    items_result = await db.execute(
        select(func.count(WishlistItem.id)).where(
            WishlistItem.wishlist_id == wl.id, WishlistItem.status == ItemStatus.active
        )
    )
    item_count = items_result.scalar() or 0
    res_result = await db.execute(
        select(func.count(Reservation.id)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
    )
    reserved_count = res_result.scalar() or 0
    contrib_result = await db.execute(
        select(func.coalesce(func.sum(Contribution.amount), 0)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
    )
    contributions_total = contrib_result.scalar() or Decimal("0")
    return wishlist_to_response(wl, item_count=item_count, reserved_count=reserved_count, contributions_total=contributions_total)


@router.put("/{wishlist_id}", response_model=WishlistResponse)
async def update_wishlist(
    wishlist_id: int,
    body: WishlistUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await get_wishlist_owned(wishlist_id, current_user, db)
    if body.title is not None:
        wl.title = body.title
    if body.description is not None:
        wl.description = body.description
    if body.event_date is not None:
        wl.event_date = body.event_date
    await db.commit()
    await db.refresh(wl)
    items_result = await db.execute(
        select(func.count(WishlistItem.id)).where(
            WishlistItem.wishlist_id == wl.id, WishlistItem.status == ItemStatus.active
        )
    )
    item_count = items_result.scalar() or 0
    res_result = await db.execute(
        select(func.count(Reservation.id)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
    )
    reserved_count = res_result.scalar() or 0
    contrib_result = await db.execute(
        select(func.coalesce(func.sum(Contribution.amount), 0)).join(WishlistItem).where(WishlistItem.wishlist_id == wl.id)
    )
    contributions_total = contrib_result.scalar() or Decimal("0")
    return wishlist_to_response(wl, item_count=item_count, reserved_count=reserved_count, contributions_total=contributions_total)


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
    wishlist_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await get_wishlist_owned(wishlist_id, current_user, db)
    await db.delete(wl)
    await db.commit()


# ---------- Items ----------


@router.get("/{wishlist_id}/items", response_model=list[WishlistItemResponse])
async def list_items(
    wishlist_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await get_wishlist_owned(wishlist_id, current_user, db)
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist_id).order_by(WishlistItem.position, WishlistItem.id)
    )
    items = result.scalars().all()
    out = []
    for item in items:
        res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.item_id == item.id))
        contrib_sum = await db.execute(select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.item_id == item.id))
        total = contrib_sum.scalar() or Decimal("0")
        pct = None
        if item.target_amount and item.target_amount > 0:
            pct = float(total / item.target_amount * 100)
        out.append(item_to_response(
            item,
            reservation_count=res_count.scalar() or 0,
            contribution_total=total,
            contribution_percentage=round(pct, 1) if pct is not None else None,
        ))
    return out


@router.post("/{wishlist_id}/items", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    wishlist_id: int,
    body: WishlistItemCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await get_wishlist_owned(wishlist_id, current_user, db)
    max_pos = await db.execute(select(func.coalesce(func.max(WishlistItem.position), -1)).where(WishlistItem.wishlist_id == wishlist_id))
    position = (max_pos.scalar() or 0) + 1
    item = WishlistItem(
        wishlist_id=wishlist_id,
        title=body.title,
        url=body.url,
        price=body.price,
        image_url=body.image_url,
        description=body.description,
        type=body.type,
        target_amount=body.target_amount,
        position=position,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item_to_response(item)


@router.put("/{wishlist_id}/items/{item_id}", response_model=WishlistItemResponse)
async def update_item(
    wishlist_id: int,
    item_id: int,
    body: WishlistItemUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await get_wishlist_owned(wishlist_id, current_user, db)
    result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.title is not None:
        item.title = body.title
    if body.url is not None:
        item.url = body.url
    if body.price is not None:
        item.price = body.price
    if body.image_url is not None:
        item.image_url = body.image_url
    if body.description is not None:
        item.description = body.description
    if body.type is not None:
        item.type = body.type
    if body.target_amount is not None:
        item.target_amount = body.target_amount
    await db.commit()
    await db.refresh(item)
    res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.item_id == item.id))
    contrib_sum = await db.execute(select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.item_id == item.id))
    total = contrib_sum.scalar() or Decimal("0")
    pct = None
    if item.target_amount and item.target_amount > 0:
        pct = float(total / item.target_amount * 100)
    return item_to_response(
        item,
        reservation_count=res_count.scalar() or 0,
        contribution_total=total,
        contribution_percentage=round(pct, 1) if pct is not None else None,
    )


@router.delete("/{wishlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    wishlist_id: int,
    item_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await get_wishlist_owned(wishlist_id, current_user, db)
    result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.status = ItemStatus.deleted
    await db.commit()


@router.patch("/{wishlist_id}/items/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_items(
    wishlist_id: int,
    body: ReorderItemsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await get_wishlist_owned(wishlist_id, current_user, db)
    for pos, item_id in enumerate(body.item_ids):
        result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist_id))
        item = result.scalar_one_or_none()
        if item:
            item.position = pos
    await db.commit()
    return None
