from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_role
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.auth import UserOut

router = APIRouter()
AdminUser = Annotated[User, Depends(require_role(UserRole.admin))]


@router.get("/users", summary="List users")
async def list_users(
    _: AdminUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = Query(None),
):
    query_dict = {}
    if role:
        try:
            role_enum = UserRole(role)
            query_dict["role"] = role_enum
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")

    users = await User.find(query_dict).skip(skip).limit(limit).to_list()
    return {
        "success": True,
        "data": [
            UserOut(
                id=str(u.id),
                name=u.name,
                email=u.email,
                role=u.role.value,
            ).model_dump()
            for u in users
        ],
    }


@router.delete("/users/{user_id}", summary="Delete user")
async def delete_user(user_id: str, _: AdminUser):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Cannot delete admin")
    await user.delete()
    return {"success": True, "message": "User deleted"}


@router.get("/listings", summary="List all listings")
async def list_all_listings(
    _: AdminUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_filled: Optional[bool] = Query(None),
):
    query_dict = {}
    if is_filled is not None:
        query_dict["is_filled"] = is_filled

    listings = await Listing.find(query_dict).skip(skip).limit(limit).to_list()
    return {
        "success": True,
        "data": [
            {
                "id": str(l.id),
                "owner_id": l.owner_id,
                "location": l.location,
                "rent": l.rent,
                "is_filled": l.is_filled,
                "room_type": l.room_type.value,
                "created_at": l.created_at.isoformat(),
            }
            for l in listings
        ],
    }


@router.delete("/listings/{listing_id}", summary="Delete listing")
async def admin_delete_listing(listing_id: str, _: AdminUser):
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    await listing.delete()
    return {"success": True, "message": "Listing deleted"}


@router.get("/activity", summary="Activity feed")
async def activity_feed(_: AdminUser):
    from app.models.interest import Interest
    from app.models.message import Message

    user_count = await User.count()
    listing_count = await Listing.count()
    interest_count = await Interest.count()
    message_count = await Message.count()

    recent_users = await User.find().sort("-created_at").limit(5).to_list()
    recent_listings = await Listing.find().sort("-created_at").limit(5).to_list()

    return {
        "success": True,
        "data": {
            "counts": {
                "users": user_count,
                "listings": listing_count,
                "interests": interest_count,
                "messages": message_count,
            },
            "recent_users": [
                {"id": str(u.id), "name": u.name, "role": u.role.value, "created_at": u.created_at.isoformat()}
                for u in recent_users
            ],
            "recent_listings": [
                {"id": str(l.id), "location": l.location, "rent": l.rent, "created_at": l.created_at.isoformat()}
                for l in recent_listings
            ],
        },
    }