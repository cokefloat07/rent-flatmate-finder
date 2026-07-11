from typing import Optional

from pydantic import BaseModel, Field


class InterestCreate(BaseModel):
    listing_id: str


class InterestResponse(BaseModel):
    """Owner accepting or declining an interest."""
    action: str  # "accept" | "decline"

    def model_post_init(self, __context) -> None:
        if self.action not in ("accept", "decline"):
            raise ValueError('action must be "accept" or "decline"')


class InterestRevoke(BaseModel):
    """Owner revoking a previously accepted interest."""
    reason: Optional[str] = Field(default=None, max_length=500)


class InterestOut(BaseModel):
    id: str
    tenant_id: str
    listing_id: str
    status: str
    created_at: str
    responded_at: Optional[str] = None
    revoked_at: Optional[str] = None
    revoke_reason: Optional[str] = None
    compatibility_score: Optional[float] = None
    score_explanation: Optional[str] = None