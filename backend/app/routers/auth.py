import os
import random
import string
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_db, get_current_user, hash_password, verify_password, create_access_token
from app.config import settings
from app.email_sender import send_verification_email
from app.models import User, VerificationCode
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
    SendVerificationRequest,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

VERIFICATION_EXPIRY_MINUTES = 10


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_BY_TYPE = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name or body.email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, avatar_url=user.avatar_url),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, avatar_url=user.avatar_url),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
    )


@router.post("/send-verification-code")
async def send_verification_code(
    body: SendVerificationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Send a 6-digit code to the user's email. Required before changing email."""
    if body.purpose != "change_email":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only email change requires verification")
    new_email: str | None = None
    if body.purpose == "change_email":
        if not body.new_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_email required for change_email")
        new_email = body.new_email.strip().lower()
        if new_email == current_user.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New email is the same as current")
        existing = await db.execute(select(User).where(User.email == new_email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

    if not settings.smtp_configured() and not getattr(settings, "email_echo_code", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email is not configured. Set SMTP_HOST (and related env) or EMAIL_ECHO_CODE=1 for dev.",
        )

    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)
    pending = new_email if body.purpose == "change_email" else None

    await db.execute(delete(VerificationCode).where(
        VerificationCode.user_id == current_user.id,
        VerificationCode.purpose == body.purpose,
    ))
    db.add(VerificationCode(
        user_id=current_user.id,
        purpose=body.purpose,
        code=code,
        expires_at=expires_at,
        pending_value=pending,
    ))
    await db.commit()

    try:
        send_verification_email(current_user.email, code, body.purpose)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    out: dict = {"ok": True}
    if not settings.smtp_configured() and getattr(settings, "email_echo_code", False):
        out["code"] = code  # dev only: return code in response
    return out


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if body.name is not None:
        current_user.name = body.name.strip() or None
    if body.email is not None:
        new_email = body.email.strip().lower()
        if new_email != current_user.email:
            if not (body.verification_code and body.verification_code.strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code required to change email. Request a code first.",
                )
            result = await db.execute(
                select(VerificationCode).where(
                    VerificationCode.user_id == current_user.id,
                    VerificationCode.purpose == "change_email",
                    VerificationCode.code == body.verification_code.strip(),
                    VerificationCode.pending_value == new_email,
                    VerificationCode.expires_at > datetime.utcnow(),
                )
            )
            rec = result.scalar_one_or_none()
            if not rec:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code. Request a new code.",
                )
            await db.execute(delete(VerificationCode).where(VerificationCode.id == rec.id))
            current_user.email = new_email
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url.strip() or None
    await db.commit()
    await db.refresh(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
    )


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WebP and GIF images are allowed",
        )
    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be under 5 MB",
        )
    upload_dir = Path(settings.upload_dir)
    avatars_dir = upload_dir / "avatars"
    ext = EXT_BY_TYPE.get(file.content_type, ".jpg")
    filename = f"{current_user.id}_{int(time.time() * 1000)}{ext}"
    path = avatars_dir / filename
    with open(path, "wb") as f:
        f.write(content)
    if current_user.avatar_url:
        old_name = Path(current_user.avatar_url).name
        old_full = avatars_dir / old_name
        if old_full.exists():
            try:
                os.remove(old_full)
            except OSError:
                pass
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    await db.commit()
    await db.refresh(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"ok": True}
