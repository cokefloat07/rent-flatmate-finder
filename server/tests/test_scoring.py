import pytest
from unittest.mock import AsyncMock, patch

from app.utils.rule_based_score import rule_based_score
from app.utils.build_prompt import build_prompt


# ── Rule-based scorer unit tests ───────────────────────────────────────────────

def test_rule_based_perfect_match():
    profile = {"preferred_location": "London", "budget_min": 1000, "budget_max": 1500}
    listing = {"location": "London", "rent": 1200}
    result = rule_based_score(profile, listing)
    assert result["score"] == 100.0
    assert "Total rule-based score" in result["explanation"]


def test_rule_based_no_match():
    profile = {"preferred_location": "Manchester", "budget_min": 500, "budget_max": 700}
    listing = {"location": "London", "rent": 2000}
    result = rule_based_score(profile, listing)
    assert result["score"] < 50


def test_rule_based_location_only():
    profile = {"preferred_location": "Bristol", "budget_min": 800, "budget_max": 900}
    listing = {"location": "Bristol", "rent": 2000}
    result = rule_based_score(profile, listing)
    # Location matches (+50), budget doesn't (+0 or partial) — overage is huge
    assert result["score"] <= 60


def test_rule_based_budget_only():
    profile = {"preferred_location": "Edinburgh", "budget_min": 600, "budget_max": 800}
    listing = {"location": "London", "rent": 700}
    result = rule_based_score(profile, listing)
    # Budget matches (+50), location doesn't (+0)
    assert result["score"] == 50.0


def test_rule_based_score_clamped():
    profile = {"preferred_location": "Leeds", "budget_min": 0, "budget_max": 0}
    listing = {"location": "Leeds", "rent": 1000}
    result = rule_based_score(profile, listing)
    assert 0 <= result["score"] <= 100


# ── LLM fallback integration test ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_fallback_on_unavailable():
    """When Ollama is unreachable, the service must return a rule-based score."""
    profile = {"preferred_location": "London", "budget_min": 1000, "budget_max": 1500}
    listing = {"location": "London", "rent": 1200}

    with patch("httpx.AsyncClient.post", side_effect=Exception("Connection refused")):
        from app.services.llm_service import get_compatibility_score
        result = await get_compatibility_score(profile, listing)

    assert result["method"] == "rule-based"
    assert 0 <= result["score"] <= 100


def test_build_prompt_contains_json():
    profile = {"preferred_location": "York", "budget_min": 500, "budget_max": 800}
    listing = {"location": "York", "rent": 650}
    prompt = build_prompt(profile, listing)
    assert "York" in prompt
    assert "650" in prompt
    assert "score" in prompt
    assert "explanation" in prompt