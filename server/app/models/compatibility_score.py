from datetime import datetime, timezone
from enum import Enum

from beanie import Document
from pymongo import ASCENDING, IndexModel
from pydantic import Field


class ScoreMethod(str, Enum):
    llm = "llm"
    rule_based = "rule-based"


class CompatibilityScore(Document):
    tenant_id: str
    listing_id: str
    score: float                          # 0–100
    explanation: str
    method: ScoreMethod = ScoreMethod.rule_based
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "compatibility_scores"
        indexes = [
            IndexModel(
                [("tenant_id", ASCENDING), ("listing_id", ASCENDING)],
                unique=True,
                name="unique_tenant_listing_score",
            ),
        ]