from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt has a 72-byte password limit — we truncate to be safe
_BCRYPT_MAX_BYTES = 72

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate_password(plain: str) -> str:
    """
    Bcrypt only uses the first 72 bytes of a password.
    Truncate explicitly so newer bcrypt versions don't raise ValueError.
    """
    encoded = plain.encode("utf-8")
    if len(encoded) > _BCRYPT_MAX_BYTES:
        return encoded[:_BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore")
    return plain


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    return _pwd_context.hash(_truncate_password(plain))


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    return _pwd_context.verify(_truncate_password(plain), hashed)


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    """
    Create a signed JWT.
    *subject* is typically the user's string ID.
    *extra_claims* can carry role, name, etc. — nothing sensitive.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT.
    Raises `jose.JWTError` if the token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])