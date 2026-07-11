from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings
from app.utils.logger import logger

_mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
    VALIDATE_CERTS=True,
)

_mailer = FastMail(_mail_config)


async def _send(to: str, subject: str, body_html: str) -> None:
    """
    Internal helper — fires and forgets; logs on failure, never raises.
    """
    try:
        msg = MessageSchema(
            subject=subject,
            recipients=[to],
            body=body_html,
            subtype=MessageType.html,
        )
        await _mailer.send_message(msg)
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as exc:
        # SMTP failure must never crash a request — log and continue
        logger.error(f"Email send failed (to={to}, subject={subject}): {exc}")


async def notify_owner_high_score_interest(
    owner_email: str,
    owner_name: str,
    tenant_name: str,
    listing_location: str,
    score: float,
) -> None:
    """Email the owner when a high-compatibility tenant expresses interest."""
    await _send(
        to=owner_email,
        subject=f"🏠 High-match interest in your listing — {listing_location}",
        body_html=f"""
        <h2>Hi {owner_name},</h2>
        <p>
            <strong>{tenant_name}</strong> has expressed interest in your listing at
            <strong>{listing_location}</strong>.
        </p>
        <p>
            Their compatibility score is <strong>{score}/100</strong> — a great match!
        </p>
        <p>Log in to review their profile and accept or decline.</p>
        <br>
        <p>— The Rent &amp; Flatmate Finder Team</p>
        """,
    )


async def notify_tenant_interest_response(
    tenant_email: str,
    tenant_name: str,
    listing_location: str,
    accepted: bool,
) -> None:
    """Email the tenant when an owner accepts or declines their interest."""
    verb = "accepted" if accepted else "declined"
    emoji = "🎉" if accepted else "😔"
    extra = (
        "<p>Log in to start chatting with the owner!</p>"
        if accepted
        else "<p>Don't be discouraged — keep browsing other listings.</p>"
    )
    await _send(
        to=tenant_email,
        subject=f"{emoji} Your interest was {verb} — {listing_location}",
        body_html=f"""
        <h2>Hi {tenant_name},</h2>
        <p>
            The owner of the listing at <strong>{listing_location}</strong>
            has <strong>{verb}</strong> your interest request.
        </p>
        {extra}
        <br>
        <p>— The Rent &amp; Flatmate Finder Team</p>
        """,
    )