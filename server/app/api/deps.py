from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from jose import JWTError

from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.utils.logger import logger

_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> User:
    """
    FastAPI dependency: extract + verify the Bearer JWT, return the User document.

    Raises HTTP 401 on missing/invalid token, HTTP 404 if the user no longer exists.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def require_role(*roles: UserRole):
    """
    Dependency factory: ensure the current user holds one of *roles*.

    Usage::

        @router.delete("/{id}", dependencies=[Depends(require_role(UserRole.admin))])
        async def delete_user(...):
            ...
    """

    async def _check(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {[r.value for r in roles]}",
            )
        return current_user

    return _check