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
from app.schemas.interest import (
    InterestCreate,
    InterestOut,
    InterestResponse,
    InterestRevoke,
)
from app.services.email_service import (
    notify_owner_high_score_interest,
    notify_tenant_interest_response,
)
from app.services.llm_service import get_compatibility_score
from app.utils.logger import logger

router = APIRouter()
HIGH_SCORE_THRESHOLD = 80.0


def _safe_score_method(method_str: str) -> ScoreMethod:
    try:
        return ScoreMethod(method_str)
    except (ValueError, KeyError):
        logger.warning(f"Unknown score method '{method_str}', defaulting to rule_based")
        return ScoreMethod.rule_based


def _interest_to_out(i: Interest, score: CompatibilityScore | None = None) -> dict:
    return InterestOut(
        id=str(i.id),
        tenant_id=i.tenant_id,
        listing_id=i.listing_id,
        status=i.status.value,
        created_at=i.created_at.isoformat(),
        responded_at=i.responded_at.isoformat() if i.responded_at else None,
        revoked_at=i.revoked_at.isoformat() if i.revoked_at else None,
        revoke_reason=i.revoke_reason,
        compatibility_score=score.score if score else None,
        score_explanation=score.explanation if score else None,
    ).model_dump()


async def _get_or_compute_score(
    tenant: User, listing: Listing
) -> CompatibilityScore | None:
    score = await CompatibilityScore.find_one({
        "tenant_id": str(tenant.id),
        "listing_id": str(listing.id),
    })
    if score:
        return score

    profile = await TenantProfile.find_one({"tenant_id": str(tenant.id)})
    if not profile:
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
        method=_safe_score_method(result["method"]),
    )
    try:
        await score.insert()
    except DuplicateKeyError:
        score = await CompatibilityScore.find_one({
            "tenant_id": str(tenant.id),
            "listing_id": str(listing.id),
        })

    return score


# ─────────────────────────────────────────────────────────────────────────────
# CREATE INTEREST
# ─────────────────────────────────────────────────────────────────────────────
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
        # Allow re-applying if previously revoked or declined
        if existing.status in (InterestStatus.revoked, InterestStatus.declined):
            existing.status = InterestStatus.pending
            existing.responded_at = None
            existing.revoked_at = None
            existing.revoke_reason = None
            existing.created_at = datetime.now(timezone.utc)
            await existing.save()
            interest = existing
            logger.info(f"Tenant {current_user.id} re-applied to listing {body.listing_id}")
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Interest already exists with status: {existing.status.value}",
            )
    else:
        interest = Interest(tenant_id=str(current_user.id), listing_id=body.listing_id)
        try:
            await interest.insert()
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Interest already exists")

    try:
        score = await _get_or_compute_score(current_user, listing)
    except Exception as e:
        logger.error(f"Score computation failed: {e}", exc_info=True)
        score = None

    if score and score.score >= HIGH_SCORE_THRESHOLD:
        try:
            owner = await User.get(listing.owner_id)
            if owner:
                await notify_owner_high_score_interest(
                    owner_email=owner.email,
                    owner_name=owner.name,
                    tenant_name=current_user.name,
                    listing_location=listing.location,
                    score=score.score,
                )
        except Exception as e:
            logger.warning(f"Owner notification email failed: {e}")

    return {"success": True, "data": _interest_to_out(interest, score)}


# ─────────────────────────────────────────────────────────────────────────────
# ⚠️ IMPORTANT: STATIC ROUTES MUST COME BEFORE PARAMETRIC ROUTES
# Otherwise FastAPI will match /for-listing/xxx as /{interest_id}
# ─────────────────────────────────────────────────────────────────────────────

# ── MY INTERESTS (tenant) ────────────────────────────────────────────────────
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
        out = _interest_to_out(interest, score)
        listing = await Listing.get(interest.listing_id)
        if listing:
            out["listing_location"] = listing.location
        results.append(out)
    return {"success": True, "data": results}


# ── INCOMING INTERESTS (owner) ───────────────────────────────────────────────
@router.get("/incoming", summary="List incoming interests")
async def get_incoming_interests(
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    owner_listings = await Listing.find({"owner_id": str(current_user.id)}).to_list()
    listing_ids = [str(l.id) for l in owner_listings]
    listing_map = {str(l.id): l.location for l in owner_listings}

    if not listing_ids:
        return {"success": True, "data": []}

    interests = await Interest.find({"listing_id": {"$in": listing_ids}}).to_list()
    results = []
    for interest in interests:
        score = await CompatibilityScore.find_one({
            "tenant_id": interest.tenant_id,
            "listing_id": interest.listing_id,
        })
        out = _interest_to_out(interest, score)
        out["listing_location"] = listing_map.get(interest.listing_id, "Unknown")

        tenant = await User.get(interest.tenant_id)
        out["tenant_name"] = tenant.name if tenant else "Unknown"

        results.append(out)
    return {"success": True, "data": results}


# ── CHECK INTEREST FOR A SPECIFIC LISTING (⭐ MUST BE BEFORE /{interest_id}) ──
@router.get("/for-listing/{listing_id}", summary="Get my interest for a specific listing")
async def get_my_interest_for_listing(
    listing_id: str,
    current_user: Annotated[User, Depends(require_role(UserRole.tenant))],
):
    interest = await Interest.find_one({
        "tenant_id": str(current_user.id),
        "listing_id": listing_id,
    })

    if not interest:
        return {"success": True, "data": None}

    return {"success": True, "data": _interest_to_out(interest)}


# ─────────────────────────────────────────────────────────────────────────────
# ACTIONS ON SPECIFIC INTEREST BY ID
# ─────────────────────────────────────────────────────────────────────────────

# ── RESPOND TO INTEREST (accept/decline) ─────────────────────────────────────
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
        raise HTTPException(
            status_code=409,
            detail=f"Interest already {interest.status.value}",
        )

    accepted = body.action == "accept"
    interest.status = InterestStatus.accepted if accepted else InterestStatus.declined
    interest.responded_at = datetime.now(timezone.utc)
    await interest.save()

    try:
        tenant = await User.get(interest.tenant_id)
        if tenant:
            await notify_tenant_interest_response(
                tenant_email=tenant.email,
                tenant_name=tenant.name,
                listing_location=listing.location,
                accepted=accepted,
            )
    except Exception as e:
        logger.warning(f"Tenant notification email failed: {e}")

    if accepted:
        listing.is_filled = True
        await listing.save()

        other_pending = await Interest.find({
            "listing_id": interest.listing_id,
            "status": InterestStatus.pending.value,
            "_id": {"$ne": interest.id},
        }).to_list()

        for other in other_pending:
            other.status = InterestStatus.declined
            other.responded_at = datetime.now(timezone.utc)
            await other.save()

            try:
                other_tenant = await User.get(other.tenant_id)
                if other_tenant:
                    await notify_tenant_interest_response(
                        tenant_email=other_tenant.email,
                        tenant_name=other_tenant.name,
                        listing_location=listing.location,
                        accepted=False,
                    )
            except Exception as e:
                logger.warning(f"Competitor notification failed: {e}")

    return {"success": True, "data": _interest_to_out(interest)}


# ── REVOKE ACCEPTED INTEREST ─────────────────────────────────────────────────
@router.patch("/{interest_id}/revoke", summary="Revoke a previously accepted interest")
async def revoke_interest(
    interest_id: str,
    body: InterestRevoke,
    current_user: Annotated[User, Depends(require_role(UserRole.owner))],
):
    interest = await Interest.get(interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")

    listing = await Listing.get(interest.listing_id)
    if not listing or listing.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if interest.status != InterestStatus.accepted:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot revoke — current status is '{interest.status.value}'. Only accepted interests can be revoked.",
        )

    interest.status = InterestStatus.revoked
    interest.revoked_at = datetime.now(timezone.utc)
    interest.revoke_reason = body.reason
    await interest.save()

    listing.is_filled = False
    await listing.save()

    logger.info(
        f"Interest {interest_id} revoked by owner {current_user.id}. "
        f"Listing {listing.id} is available again."
    )

    try:
        tenant = await User.get(interest.tenant_id)
        if tenant:
            await notify_tenant_interest_response(
                tenant_email=tenant.email,
                tenant_name=tenant.name,
                listing_location=listing.location,
                accepted=False,
            )
    except Exception as e:
        logger.warning(f"Revoke notification email failed: {e}")

    return {"success": True, "data": _interest_to_out(interest)}


# ── GET SINGLE INTEREST BY ID (⭐ MUST BE LAST — CATCH-ALL) ──────────────────
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

    out = _interest_to_out(interest)
    if listing:
        out["listing_location"] = listing.location

    tenant = await User.get(interest.tenant_id)
    if tenant:
        out["tenant_name"] = tenant.name

    return {"success": True, "data": out}