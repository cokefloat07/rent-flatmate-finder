from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class TenantProfileCreate(BaseModel):
    preferred_location: str = Field(..., min_length=2, max_length=200)
    budget_min: float = Field(..., ge=0)
    budget_max: float = Field(..., ge=0)
    move_in_date: date

    def model_post_init(self, __context) -> None:
        if self.budget_max < self.budget_min:
            raise ValueError("budget_max must be >= budget_min")


class TenantProfileUpdate(BaseModel):
    preferred_location: Optional[str] = Field(None, min_length=2, max_length=200)
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    move_in_date: Optional[date] = None


class TenantProfileOut(BaseModel):
    id: str
    tenant_id: str
    preferred_location: str
    budget_min: float
    budget_max: float
    move_in_date: date
    created_at: str

    model_config = {"from_attributes": True}