from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenData, UserOut

router = APIRouter()


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new owner or tenant account",
)
async def register(body: RegisterRequest):
    # Dict-based query
    existing = await User.find_one({"email": body.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole(body.role),
    )
    await user.insert()

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role.value, "name": user.name},
    )

    return {
        "success": True,
        "data": {
            "user": UserOut(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role.value,
            ),
            "token": TokenData(access_token=token),
        },
    }


@router.post("/login", summary="Authenticate and receive a JWT")
async def login(body: LoginRequest):
    # Dict-based query
    user = await User.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role.value, "name": user.name},
    )

    return {
        "success": True,
        "data": {
            "user": UserOut(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role.value,
            ),
            "token": TokenData(access_token=token),
        },
    }


@router.get("/me", summary="Return the authenticated user's profile")
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return {
        "success": True,
        "data": UserOut(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            role=current_user.role.value,
        ),
    }