from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document
from pymongo import ASCENDING, IndexModel
from pydantic import Field


class InterestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    revoked = "revoked"     # NEW: owner revoked after accepting


class Interest(Document):
    tenant_id: str
    listing_id: str
    status: InterestStatus = InterestStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responded_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None       # NEW
    revoke_reason: Optional[str] = None         # NEW

    class Settings:
        name = "interests"
        indexes = [
            "tenant_id",
            "listing_id",
            IndexModel(
                [("tenant_id", ASCENDING), ("listing_id", ASCENDING)],
                unique=True,
                name="unique_tenant_listing_interest",
            ),
        ]