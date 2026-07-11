from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Link
from pydantic import Field
from bson import ObjectId


class RoomType(str, Enum):
    single = "single"
    double = "double"
    shared = "shared"
    studio = "studio"


class FurnishingStatus(str, Enum):
    furnished = "furnished"
    semi_furnished = "semi-furnished"
    unfurnished = "unfurnished"


class Listing(Document):
    owner_id: str                        # stored as string ref to User._id
    location: str
    rent: float
    available_from: date
    room_type: RoomType
    furnishing_status: FurnishingStatus
    photos: list[str] = Field(default_factory=list)   # URLs / file paths
    is_filled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "listings"
        indexes = [
            "owner_id",
            "location",
            "rent",
            "is_filled",
        ]