from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field


class Message(Document):
    interest_id: str      # chat room key
    sender_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None

    class Settings:
        name = "messages"
        indexes = [
            "interest_id",
            "sender_id",
            [("interest_id", 1), ("created_at", 1)],   # fast pagination
        ]