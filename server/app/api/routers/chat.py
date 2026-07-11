from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.models.interest import Interest, InterestStatus
from app.models.listing import Listing
from app.models.message import Message
from app.models.user import User, UserRole
from app.schemas.chat import MessageOut

router = APIRouter()


@router.get("/{interest_id}/messages", summary="Get room messages")
async def get_messages(
    interest_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    interest = await Interest.get(interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")

    if interest.status != InterestStatus.accepted:
        raise HTTPException(status_code=403, detail="Chat not available")

    listing = await Listing.get(interest.listing_id)
    is_tenant = interest.tenant_id == str(current_user.id)
    is_owner = listing and listing.owner_id == str(current_user.id)
    is_admin = current_user.role == UserRole.admin

    if not (is_tenant or is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")

    messages = (
        await Message.find({"interest_id": interest_id})
        .sort("+created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return {
        "success": True,
        "data": [
            MessageOut(
                id=str(m.id),
                interest_id=m.interest_id,
                sender_id=m.sender_id,
                content=m.content,
                created_at=m.created_at.isoformat(),
                read_at=m.read_at.isoformat() if m.read_at else None,
            ).model_dump()
            for m in messages
        ],
    }