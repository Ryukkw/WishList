"""Send verification emails. Requires SMTP config or email_echo_code for dev."""
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import settings


def send_verification_email(to_email: str, code: str, purpose: str) -> None:
    """
    Send a 6-digit verification code to the user.
    Raises RuntimeError if SMTP not configured and email_echo_code is False.
    """
    if not settings.smtp_configured():
        if getattr(settings, "email_echo_code", False):
            # Dev only: just log; caller may return code in response
            print(f"[DEV] Verification code for {to_email} ({purpose}): {code}")
            return
        raise RuntimeError("Email is not configured. Set SMTP_HOST and related env vars to enable verification.")

    subject = "Код подтверждения — WishList"
    if purpose == "change_password":
        body = f"Ваш код для смены пароля: {code}\n\nКод действителен 10 минут.\n\nЕсли вы не запрашивали смену пароля, проигнорируйте это письмо."
    else:
        body = f"Ваш код для смены email: {code}\n\nКод действителен 10 минут.\n\nЕсли вы не запрашивали смену email, проигнорируйте это письмо."

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr(("WishList", settings.email_from))
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.email_from, [to_email], msg.as_string())
