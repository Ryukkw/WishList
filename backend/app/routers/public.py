from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_db, get_current_user, get_current_user_optional
from app.models import User, Wishlist, WishlistItem, Reservation, Contribution
from app.models.wishlist import ItemStatus, ItemType
from app.rate_limit import rate_limit_public_post
from app.schemas.public import ReserveRequest, UnreserveRequest, ContributeRequest
from app.websocket import manager as ws_manager

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/{slug}")
async def get_public_wishlist(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Get wishlist by slug (no auth)
    result = await db.execute(
        select(Wishlist).where(Wishlist.slug == slug, Wishlist.is_public == True)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    # Load active items ordered by position
    items_result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.wishlist_id == wl.id, WishlistItem.status == ItemStatus.active)
        .order_by(WishlistItem.position, WishlistItem.id)
    )
    items = items_result.scalars().all()
    show_owner = getattr(wl, "show_owner", False)
    show_reserved_to_guests = getattr(wl, "show_reserved_to_guests", False)
    show_who_reserved_guests = show_owner and show_reserved_to_guests
    # Owner name and avatar: real when show_owner, else generic so avatar/line always show
    if show_owner:
        user_result = await db.execute(select(User).where(User.id == wl.user_id))
        owner = user_result.scalar_one_or_none()
        owner_name = (owner.name or owner.email) if owner else None
        owner_avatar_url = owner.avatar_url if owner else None
    else:
        owner_name = "Именинник"  # generic label so "Список от" + avatar placeholder still render
        owner_avatar_url = None
    items_out = []
    for item in items:
        res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.item_id == item.id))
        r_count = res_count.scalar() or 0
        reserved_by = None
        if r_count > 0 and show_who_reserved_guests:
            res_row = await db.execute(
                select(Reservation.guest_name).where(Reservation.item_id == item.id).limit(1)
            )
            reserved_by = res_row.scalar_one_or_none()
        contrib_sum = await db.execute(
            select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.item_id == item.id)
        )
        total = contrib_sum.scalar() or Decimal("0")
        pct = None
        if item.target_amount and item.target_amount > 0:
            pct = round(float(total / item.target_amount * 100), 1)
        item_out = {
            "id": item.id,
            "title": item.title,
            "url": item.url,
            "price": float(item.price) if item.price else None,
            "image_url": item.image_url,
            "description": item.description,
            "type": item.type.value,
            "target_amount": float(item.target_amount) if item.target_amount else None,
            "position": item.position,
            "reservation_count": r_count,
            "contribution_total": float(total),
            "contribution_percentage": pct,
        }
        if reserved_by is not None:
            item_out["reserved_by"] = reserved_by
        items_out.append(item_out)
    out = {
        "id": wl.id,
        "title": wl.title,
        "slug": wl.slug,
        "description": wl.description,
        "event_date": wl.event_date.isoformat() if wl.event_date else None,
        "items": items_out,
        "owner_name": owner_name,
        "owner_avatar_url": owner_avatar_url,
        "show_reserved_to_guests": show_reserved_to_guests,
    }
    return out


async def _get_wishlist_by_slug(slug: str, db: AsyncSession) -> Wishlist:
    result = await db.execute(
        select(Wishlist).where(Wishlist.slug == slug, Wishlist.is_public == True)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    return wl


async def _get_item_for_wishlist(
    db: AsyncSession, wishlist_id: int, item_id: int
) -> WishlistItem:
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.wishlist_id == wishlist_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("/{slug}/check-owner")
async def check_owner(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return { is_owner: true } if the authenticated user owns this list. For owner banner on public page."""
    result = await db.execute(
        select(Wishlist).where(Wishlist.slug == slug, Wishlist.user_id == current_user.id)
    )
    wl = result.scalar_one_or_none()
    return {"is_owner": wl is not None}


@router.get("/{slug}/social")
async def get_public_wishlist_social(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
):
    """Same as GET /{slug} but includes contributor names per item (for guests to avoid duplicates). Owner must not get this."""
    wl = await _get_wishlist_by_slug(slug, db)
    if current_user and current_user.id == wl.user_id:
        raise HTTPException(status_code=403, detail="Owner cannot request social view")
    items_result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.wishlist_id == wl.id, WishlistItem.status == ItemStatus.active)
        .order_by(WishlistItem.position, WishlistItem.id)
    )
    items = items_result.scalars().all()
    items_out = []
    for item in items:
        res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.item_id == item.id))
        contrib_sum = await db.execute(
            select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.item_id == item.id)
        )
        total = contrib_sum.scalar() or Decimal("0")
        pct = None
        if item.target_amount and item.target_amount > 0:
            pct = round(float(total / item.target_amount * 100), 1)
        contrib_names = []
        if item.type == ItemType.group:
            names_result = await db.execute(
                select(Contribution.guest_name).where(Contribution.item_id == item.id).distinct()
            )
            contrib_names = [r[0] for r in names_result.fetchall()]
        items_out.append({
            "id": item.id,
            "title": item.title,
            "url": item.url,
            "price": float(item.price) if item.price else None,
            "image_url": item.image_url,
            "description": item.description,
            "type": item.type.value,
            "target_amount": float(item.target_amount) if item.target_amount else None,
            "position": item.position,
            "reservation_count": res_count.scalar() or 0,
            "contribution_total": float(total),
            "contribution_percentage": pct,
            "contributor_names": contrib_names,
        })
    return {
        "id": wl.id,
        "title": wl.title,
        "slug": wl.slug,
        "description": wl.description,
        "event_date": wl.event_date.isoformat() if wl.event_date else None,
        "items": items_out,
    }


@router.post("/{slug}/items/{item_id}/reserve", dependencies=[Depends(rate_limit_public_post)])
async def reserve_item(
    slug: str,
    item_id: int,
    body: ReserveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await _get_wishlist_by_slug(slug, db)
    item = await _get_item_for_wishlist(db, wl.id, item_id)
    if item.status != ItemStatus.active:
        raise HTTPException(status_code=400, detail="Item is not available")
    if item.type != ItemType.solo:
        raise HTTPException(status_code=400, detail="Only solo items can be reserved")
    existing = await db.execute(select(Reservation).where(Reservation.item_id == item_id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Кто-то только что забрал этот подарок",
        )
    r = Reservation(
        item_id=item_id,
        guest_name=body.guest_name.strip() or "Гость",
        guest_identifier=body.guest_identifier,
    )
    db.add(r)
    await db.commit()
    res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.item_id == item_id))
    await ws_manager.broadcast(slug, {
        "type": "gift_reserved",
        "item_id": item_id,
        "reserved_count": res_count.scalar() or 0,
        "reserved_by": r.guest_name,
    })
    return {"ok": True}


@router.delete("/{slug}/items/{item_id}/reserve", dependencies=[Depends(rate_limit_public_post)])
async def unreserve_item(
    slug: str,
    item_id: int,
    body: UnreserveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await _get_wishlist_by_slug(slug, db)
    await _get_item_for_wishlist(db, wl.id, item_id)
    result = await db.execute(
        select(Reservation).where(
            Reservation.item_id == item_id,
            Reservation.guest_identifier == body.guest_identifier,
        )
    )
    r = result.scalar_one_or_none()
    if r:
        await db.delete(r)
        await db.commit()
        await ws_manager.broadcast(slug, {"type": "gift_unreserved", "item_id": item_id})
    return {"ok": True}


@router.post("/{slug}/items/{item_id}/contribute", dependencies=[Depends(rate_limit_public_post)])
async def contribute_item(
    slug: str,
    item_id: int,
    body: ContributeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    wl = await _get_wishlist_by_slug(slug, db)
    item = await _get_item_for_wishlist(db, wl.id, item_id)
    if item.status != ItemStatus.active:
        raise HTTPException(status_code=400, detail="Item is not available")
    if item.type != ItemType.group:
        raise HTTPException(status_code=400, detail="Only group items accept contributions")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    c = Contribution(
        item_id=item_id,
        guest_name=body.guest_name.strip() or "Гость",
        guest_identifier=body.guest_identifier,
        amount=body.amount,
    )
    db.add(c)
    await db.commit()
    contrib_sum = await db.execute(
        select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.item_id == item_id)
    )
    total = contrib_sum.scalar() or Decimal("0")
    pct = None
    if item.target_amount and item.target_amount > 0:
        pct = round(float(total / item.target_amount * 100), 1)
    await ws_manager.broadcast(slug, {
        "type": "contribution_added",
        "item_id": item_id,
        "total_amount": float(total),
        "percentage": pct,
    })
    return {"ok": True}
