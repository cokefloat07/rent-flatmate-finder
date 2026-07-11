from datetime import date, datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field


class TenantProfile(Document):
    tenant_id: str                       # ref to User._id
    preferred_location: str
    budget_min: float
    budget_max: float
    move_in_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tenant_profiles"
        indexes = ["tenant_id"]