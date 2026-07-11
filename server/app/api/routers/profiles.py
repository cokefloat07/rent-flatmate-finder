from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_role
from app.models.tenant_profile import TenantProfile
from app.models.user import User, UserRole
from app.schemas.tenant_profile import TenantProfileCreate, TenantProfileOut, TenantProfileUpdate

router = APIRouter()


def _profile_to_out(p: TenantProfile) -> dict:
    return TenantProfileOut(
        id=str(p.id),
        tenant_id=p.tenant_id,
        preferred_location=p.preferred_location,
        budget_min=p.budget_min,
        budget_max=p.budget_max,
        move_in_date=p.move_in_date,
        created_at=p.created_at.isoformat(),
    ).model_dump()


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Create tenant profile")
async def create_profile(
    body: TenantProfileCreate,
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    existing = await TenantProfile.find_one({"tenant_id": str(current_user.id)})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists",
        )

    profile = TenantProfile(tenant_id=str(current_user.id), **body.model_dump())
    await profile.insert()
    return {"success": True, "data": _profile_to_out(profile)}


@router.get("/me", summary="Get own profile")
async def get_my_profile(
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    profile = await TenantProfile.find_one({"tenant_id": str(current_user.id)})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": _profile_to_out(profile)}


@router.patch("/me", summary="Update profile")
async def update_my_profile(
    body: TenantProfileUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    profile = await TenantProfile.find_one({"tenant_id": str(current_user.id)})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await profile.save()
    return {"success": True, "data": _profile_to_out(profile)}


@router.delete("/me", summary="Delete profile")
async def delete_my_profile(
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    profile = await TenantProfile.find_one({"tenant_id": str(current_user.id)})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await profile.delete()
    return {"success": True, "message": "Profile deleted"}


@router.get("/{tenant_id}", summary="Get profile by ID (Owner/Admin only)")
async def get_profile_by_id(
    tenant_id: str,
    current_user: Annotated[User, Depends(require_role(UserRole.owner, UserRole.admin))],
):
    profile = await TenantProfile.find_one({"tenant_id": tenant_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": _profile_to_out(profile)}