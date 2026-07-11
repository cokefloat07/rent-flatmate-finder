from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.models.listing import FurnishingStatus, RoomType


class ListingCreate(BaseModel):
    location: str = Field(..., min_length=2, max_length=200)
    rent: float = Field(..., gt=0)
    available_from: date
    room_type: RoomType
    furnishing_status: FurnishingStatus
    photos: list[str] = Field(default_factory=list)


class ListingUpdate(BaseModel):
    location: Optional[str] = Field(None, min_length=2, max_length=200)
    rent: Optional[float] = Field(None, gt=0)
    available_from: Optional[date] = None
    room_type: Optional[RoomType] = None
    furnishing_status: Optional[FurnishingStatus] = None
    photos: Optional[list[str]] = None
    is_filled: Optional[bool] = None


class ListingOut(BaseModel):
    id: str
    owner_id: str
    location: str
    rent: float
    available_from: date
    room_type: str
    furnishing_status: str
    photos: list[str]
    is_filled: bool
    created_at: str

    model_config = {"from_attributes": True}


class ListingWithScore(ListingOut):
    """Listing enriched with an AI/rule-based compatibility score."""
    compatibility_score: Optional[float] = None
    score_explanation: Optional[str] = None
    score_method: Optional[str] = None

class ListingUpdate(BaseModel):
    location: Optional[str] = None
    rent: Optional[float] = None
    available_from: Optional[date] = None
    room_type: Optional[RoomType] = None
    furnishing_status: Optional[FurnishingStatus] = None
    photos: Optional[list[str]] = None
    is_filled: Optional[bool] = None      # ← must exist for mark-as-filled