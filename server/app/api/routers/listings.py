from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_role
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate

router = APIRouter()


def _listing_to_out(listing: Listing) -> dict:
    return ListingOut(
        id=str(listing.id),
        owner_id=listing.owner_id,
        location=listing.location,
        rent=listing.rent,
        available_from=listing.available_from,
        room_type=listing.room_type.value,
        furnishing_status=listing.furnishing_status.value,
        photos=listing.photos,
        is_filled=listing.is_filled,
        created_at=listing.created_at.isoformat(),
    ).model_dump()


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Create a listing (owner only)")
async def create_listing(
    body: ListingCreate,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    listing = Listing(
        owner_id=str(current_user.id),
        **body.model_dump(),
    )
    await listing.insert()
    return {"success": True, "data": _listing_to_out(listing)}


@router.get("/my", summary="List owner's listings")
async def get_my_listings(
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    listings = await Listing.find({"owner_id": str(current_user.id)}).to_list()
    return {"success": True, "data": [_listing_to_out(l) for l in listings]}


@router.get("/{listing_id}", summary="Get listing by ID")
async def get_listing(listing_id: str):
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"success": True, "data": _listing_to_out(listing)}


@router.patch("/{listing_id}", summary="Update a listing")
async def update_listing(
    listing_id: str,
    body: ListingUpdate,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your listing")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(listing, field, value)

    await listing.save()
    return {"success": True, "data": _listing_to_out(listing)}


@router.delete("/{listing_id}", summary="Delete a listing")
async def delete_listing(
    listing_id: str,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your listing")

    await listing.delete()
    return {"success": True, "message": "Listing deleted"}


@router.get("/", summary="Browse available listings with filters")
async def browse_listings(
    location: Optional[str] = Query(None),
    budget_min: Optional[float] = Query(None, ge=0),
    budget_max: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    query_dict = {"is_filled": False}

    if location:
        import re
        query_dict["location"] = {"$regex": re.escape(location), "$options": "i"}

    if budget_min is not None or budget_max is not None:
        rent_filter = {}
        if budget_min is not None:
            rent_filter["$gte"] = budget_min
        if budget_max is not None:
            rent_filter["$lte"] = budget_max
        query_dict["rent"] = rent_filter

    listings = await Listing.find(query_dict).skip(skip).limit(limit).to_list()

    if current_user and current_user.role == UserRole.tenant:
        from app.services.llm_service import get_compatibility_score
        from app.models.tenant_profile import TenantProfile
        from app.models.compatibility_score import CompatibilityScore

        profile = await TenantProfile.find_one({"tenant_id": str(current_user.id)})

        results = []
        for listing in listings:
            listing_out = _listing_to_out(listing)
            if profile:
                cached = await CompatibilityScore.find_one({
                    "tenant_id": str(current_user.id),
                    "listing_id": str(listing.id),
                })
                if cached:
                    score_data = {
                        "score": cached.score,
                        "explanation": cached.explanation,
                        "method": cached.method.value,
                    }
                else:
                    profile_dict = {
                        "preferred_location": profile.preferred_location,
                        "budget_min": profile.budget_min,
                        "budget_max": profile.budget_max,
                        "move_in_date": str(profile.move_in_date),
                    }
                    listing_dict = {
                        "location": listing.location,
                        "rent": listing.rent,
                        "available_from": str(listing.available_from),
                        "room_type": listing.room_type.value,
                        "furnishing_status": listing.furnishing_status.value,
                    }
                    score_data = await get_compatibility_score(profile_dict, listing_dict)

                    from app.models.compatibility_score import ScoreMethod
                    cs = CompatibilityScore(
                        tenant_id=str(current_user.id),
                        listing_id=str(listing.id),
                        score=score_data["score"],
                        explanation=score_data["explanation"],
                        method=ScoreMethod(score_data["method"]),
                    )
                    await cs.insert()

                listing_out["compatibility_score"] = score_data["score"]
                listing_out["score_explanation"] = score_data["explanation"]
                listing_out["score_method"] = score_data["method"]
            results.append(listing_out)

        results.sort(key=lambda x: x.get("compatibility_score") or 0, reverse=True)
        return {"success": True, "data": results}

    return {"success": True, "data": [_listing_to_out(l) for l in listings]}