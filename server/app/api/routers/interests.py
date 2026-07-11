from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_current_user, require_role
from app.models.compatibility_score import CompatibilityScore, ScoreMethod
from app.models.interest import Interest, InterestStatus
from app.models.listing import Listing
from app.models.tenant_profile import TenantProfile
from app.models.user import User, UserRole
from app.schemas.interest import InterestCreate, InterestOut, InterestResponse
from app.services.email_service import (
    notify_owner_high_score_interest,
    notify_tenant_interest_response,
)
from app.services.llm_service import get_compatibility_score
from app.utils.logger import logger

router = APIRouter()
HIGH_SCORE_THRESHOLD = 80.0


def _interest_to_out(i: Interest, score: CompatibilityScore | None = None) -> dict:
    return InterestOut(
        id=str(i.id),
        tenant_id=i.tenant_id,
        listing_id=i.listing_id,
        status=i.status.value,
        created_at=i.created_at.isoformat(),
        responded_at=i.responded_at.isoformat() if i.responded_at else None,
        compatibility_score=score.score if score else None,
        score_explanation=score.explanation if score else None,
    ).model_dump()


async def _get_or_compute_score(
    tenant: User, listing: Listing
) -> CompatibilityScore | None:
    """
    Look up the cached compatibility score for this tenant/listing pair.
    If none exists, compute one now (LLM with rule-based fallback) and cache it.
    Returns None only if the tenant has no profile.
    """
    score = await CompatibilityScore.find_one({
        "tenant_id": str(tenant.id),
        "listing_id": str(listing.id),
    })
    if score:
        return score

    profile = await TenantProfile.find_one({"tenant_id": str(tenant.id)})
    if not profile:
        logger.warning(
            f"Tenant {tenant.id} has no profile — skipping compatibility scoring"
        )
        return None

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

    result = await get_compatibility_score(profile_dict, listing_dict)

    score = CompatibilityScore(
        tenant_id=str(tenant.id),
        listing_id=str(listing.id),
        score=result["score"],
        explanation=result["explanation"],
        method=ScoreMethod(result["method"]),
    )
    try:
        await score.insert()
    except DuplicateKeyError:
        # Race: another request cached it first — fetch that one
        score = await CompatibilityScore.find_one({
            "tenant_id": str(tenant.id),
            "listing_id": str(listing.id),
        })

    logger.info(
        f"On-demand score computed: tenant={tenant.id}, "
        f"listing={listing.id}, score={score.score if score else 'N/A'}"
    )
    return score


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Express interest")
async def create_interest(
    body: InterestCreate,
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    listing = await Listing.get(body.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.is_filled:
        raise HTTPException(status_code=409, detail="Listing is filled")

    existing = await Interest.find_one({
        "tenant_id": str(current_user.id),
        "listing_id": body.listing_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Interest already exists")

    # Ensure a compatibility score exists BEFORE deciding on the email
    score = await _get_or_compute_score(current_user, listing)

    interest = Interest(tenant_id=str(current_user.id), listing_id=body.listing_id)
    try:
        await interest.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Interest already exists")

    # ── EMAIL 1: notify owner when a high-compatibility tenant is interested ──
    if score and score.score >= HIGH_SCORE_THRESHOLD:
        owner = await User.get(listing.owner_id)
        if owner:
            await notify_owner_high_score_interest(
                owner_email=owner.email,
                owner_name=owner.name,
                tenant_name=current_user.name,
                listing_location=listing.location,
                score=score.score,
            )
            logger.info(
                f"High-score interest email sent to owner {owner.email} "
                f"(score={score.score})"
            )

    return {"success": True, "data": _interest_to_out(interest, score)}


@router.get("/my", summary="List own interests")
async def get_my_interests(
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    interests = await Interest.find({"tenant_id": str(current_user.id)}).to_list()
    results = []
    for interest in interests:
        score = await CompatibilityScore.find_one({
            "tenant_id": interest.tenant_id,
            "listing_id": interest.listing_id,
        })
        results.append(_interest_to_out(interest, score))
    return {"success": True, "data": results}


@router.get("/incoming", summary="List incoming interests")
async def get_incoming_interests(
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    owner_listings = await Listing.find({"owner_id": str(current_user.id)}).to_list()
    listing_ids = [str(l.id) for l in owner_listings]

    if not listing_ids:
        return {"success": True, "data": []}

    interests = await Interest.find({"listing_id": {"$in": listing_ids}}).to_list()
    results = []
    for interest in interests:
        score = await CompatibilityScore.find_one({
            "tenant_id": interest.tenant_id,
            "listing_id": interest.listing_id,
        })
        results.append(_interest_to_out(interest, score))
    return {"success": True, "data": results}


@router.patch("/{interest_id}/respond", summary="Respond to interest")
async def respond_to_interest(
    interest_id: str,
    body: InterestResponse,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    interest = await Interest.get(interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")

    listing = await Listing.get(interest.listing_id)
    if not listing or listing.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if interest.status != InterestStatus.pending:
        raise HTTPException(status_code=409, detail="Already responded")

    accepted = body.action == "accept"
    interest.status = InterestStatus.accepted if accepted else InterestStatus.declined
    interest.responded_at = datetime.now(timezone.utc)
    await interest.save()

    # ── EMAIL 2: notify tenant of the owner's decision ─────────────────────
    tenant = await User.get(interest.tenant_id)
    if tenant:
        await notify_tenant_interest_response(
            tenant_email=tenant.email,
            tenant_name=tenant.name,
            listing_location=listing.location,
            accepted=accepted,
        )
        logger.info(
            f"Interest-response email sent to tenant {tenant.email} "
            f"(accepted={accepted})"
        )

    # ── MARK FILLED + auto-decline competing interests ─────────────────────
    if accepted:
        listing.is_filled = True
        await listing.save()
        logger.info(f"Listing {listing.id} marked as filled (interest accepted)")

        other_pending = await Interest.find({
            "listing_id": interest.listing_id,
            "status": InterestStatus.pending.value,
            "_id": {"$ne": interest.id},
        }).to_list()

        for other in other_pending:
            other.status = InterestStatus.declined
            other.responded_at = datetime.now(timezone.utc)
            await other.save()

            other_tenant = await User.get(other.tenant_id)
            if other_tenant:
                await notify_tenant_interest_response(
                    tenant_email=other_tenant.email,
                    tenant_name=other_tenant.name,
                    listing_location=listing.location,
                    accepted=False,
                )

        if other_pending:
            logger.info(
                f"Auto-declined {len(other_pending)} competing interests "
                f"on filled listing {listing.id}"
            )

    return {"success": True, "data": _interest_to_out(interest)}


@router.get("/{interest_id}", summary="Get interest by ID")
async def get_interest(
    interest_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    interest = await Interest.get(interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")

    listing = await Listing.get(interest.listing_id)
    is_tenant = interest.tenant_id == str(current_user.id)
    is_owner = listing and listing.owner_id == str(current_user.id)
    is_admin = current_user.role == UserRole.admin

    if not (is_tenant or is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")

    return {"success": True, "data": _interest_to_out(interest)}