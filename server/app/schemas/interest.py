from typing import Optional

from pydantic import BaseModel


class InterestCreate(BaseModel):
    listing_id: str


class InterestResponse(BaseModel):
    """Owner accepting or declining an interest."""
    action: str  # "accept" | "decline"

    def model_post_init(self, __context) -> None:
        if self.action not in ("accept", "decline"):
            raise ValueError('action must be "accept" or "decline"')


class InterestOut(BaseModel):
    id: str
    tenant_id: str
    listing_id: str
    status: str
    created_at: str
    responded_at: Optional[str] = None
    compatibility_score: Optional[float] = None
    score_explanation: Optional[str] = None