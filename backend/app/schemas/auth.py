from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str | None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    avatar_url: str | None = None
    verification_code: str | None = None  # required when changing email


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class SendVerificationRequest(BaseModel):
    purpose: str = "change_email"  # only email change requires 2FA
    new_email: EmailStr | None = None  # required when purpose is change_email
