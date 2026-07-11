from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_role
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate
from app.utils.logger import logger

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


def _safe_score_method(method_str: str):
    """Safely convert method string to ScoreMethod enum, fallback to rule_based."""
    from app.models.compatibility_score import ScoreMethod
    try:
        return ScoreMethod(method_str)
    except (ValueError, KeyError):
        logger.warning(f"Unknown score method '{method_str}', defaulting to rule_based")
        return ScoreMethod.rule_based


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


@router.patch("/{listing_id}/filled", summary="Toggle listing filled/available status")
async def toggle_listing_filled(
    listing_id: str,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    """Toggle the is_filled status of a listing (owner only)."""
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your listing")

    listing.is_filled = not listing.is_filled
    await listing.save()

    return {
        "success": True,
        "data": {
            **_listing_to_out(listing),
            "message": f"Listing marked as {'filled' if listing.is_filled else 'available'}",
        },
    }


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


@router.delete("/admin/clear-scores", summary="Clear all compatibility scores (dev only)")
async def clear_scores(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    TEMPORARY: Clears all compatibility scores.
    Remove this endpoint after using once to clean old data.
    """
    from app.models.compatibility_score import CompatibilityScore
    result = await CompatibilityScore.delete_all()
    count = result.deleted_count if result else 0
    logger.info(f"Cleared {count} compatibility scores")
    return {"success": True, "message": f"Deleted {count} scores"}


@router.get("/", summary="Browse available listings with filters")
async def browse_listings(
    location: Optional[str] = Query(None),
    budget_min: Optional[float] = Query(None, ge=0),
    budget_max: Optional[float] = Query(None, ge=0),
    room_type: Optional[str] = Query(None),
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

    if room_type:
        query_dict["room_type"] = room_type

    listings = await Listing.find(query_dict).skip(skip).limit(limit).to_list()

    # For tenants: compute AI compatibility scores
    if current_user and current_user.role == UserRole.tenant:
        from app.services.llm_service import get_compatibility_score
        from app.models.tenant_profile import TenantProfile
        from app.models.compatibility_score import CompatibilityScore

        profile = await TenantProfile.find_one({"tenant_id": str(current_user.id)})

        results = []
        for listing in listings:
            listing_out = _listing_to_out(listing)

            if profile:
                try:
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

                        method_enum = _safe_score_method(score_data["method"])

                        cs = CompatibilityScore(
                            tenant_id=str(current_user.id),
                            listing_id=str(listing.id),
                            score=score_data["score"],
                            explanation=score_data["explanation"],
                            method=method_enum,
                        )
                        await cs.insert()

                    listing_out["compatibility_score"] = score_data["score"]
                    listing_out["score_explanation"] = score_data["explanation"]
                    listing_out["score_method"] = score_data["method"]

                except Exception as e:
                    logger.error(
                        f"Failed to compute score for listing {listing.id}: {e}",
                        exc_info=True,
                    )
                    listing_out["compatibility_score"] = None
                    listing_out["score_explanation"] = "Score unavailable"
                    listing_out["score_method"] = "error"
            else:
                listing_out["compatibility_score"] = None
                listing_out["score_explanation"] = "Complete your profile to see match score"
                listing_out["score_method"] = "no-profile"

            results.append(listing_out)

        # Sort by score DESC (None values go to the end)
        results.sort(
            key=lambda x: x.get("compatibility_score") if x.get("compatibility_score") is not None else -1,
            reverse=True,
        )
        return {"success": True, "data": results}

    return {"success": True, "data": [_listing_to_out(l) for l in listings]}