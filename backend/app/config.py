from pathlib import Path

from pydantic_settings import BaseSettings


def _default_upload_dir() -> str:
    return str(Path(__file__).resolve().parent.parent / "uploads")


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://wishlist:wishlist@localhost:5432/wishlist"
    secret_key: str = "change-me-in-production"
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = _default_upload_dir()
    # SMTP for sending verification codes (2FA). If not set, verification endpoints return 503.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    email_from: str = "noreply@wishlist.local"
    # If True and SMTP not configured, verification code is logged and can be returned in API response (dev only).
    email_echo_code: bool = False

    def smtp_configured(self) -> bool:
        return bool(self.smtp_host.strip())

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
