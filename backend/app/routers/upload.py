import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile

from app.auth import get_current_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_BY_TYPE = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_ITEM_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/item-image")
async def upload_item_image(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Upload an image for a wishlist item. Returns the URL path to use as item image_url."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WebP and GIF images are allowed",
        )
    content = await file.read()
    if len(content) > MAX_ITEM_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be under 5 MB",
        )
    upload_dir = Path(settings.upload_dir)
    items_dir = upload_dir / "items"
    ext = EXT_BY_TYPE.get(file.content_type, ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = items_dir / filename
    with open(path, "wb") as f:
        f.write(content)
    return {"image_url": f"/uploads/items/{filename}"}
