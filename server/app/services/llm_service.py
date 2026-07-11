import json
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.utils.build_prompt import build_prompt
from app.utils.logger import logger
from app.utils.rule_based_score import rule_based_score


class _ScoreShape(BaseModel):
    """Validates that the LLM returned the expected JSON structure."""
    score: float
    explanation: str

    def model_post_init(self, __context: Any) -> None:
        # Clamp score to valid range
        self.score = round(min(max(float(self.score), 0.0), 100.0), 1)


def _parse_llm_response(raw: str) -> dict:
    """
    Attempt to parse the LLM's JSON response.

    The LLM sometimes wraps the JSON in markdown code fences — strip them.
    Raises ValueError if the shape is wrong after two attempts.
    """
    # Strip markdown fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        ).strip()

    try:
        data = json.loads(cleaned)
        validated = _ScoreShape(**data)
        return {"score": validated.score, "explanation": validated.explanation}
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise ValueError(f"Malformed LLM response: {exc}") from exc


async def get_compatibility_score(tenant_profile: dict, listing: dict) -> dict:
    """
    Compute an AI compatibility score for a tenant/listing pair.

    Attempts to call the local Ollama API. On any failure (network error,
    timeout, malformed JSON), falls back to the rule-based scorer.

    Returns:
        dict with keys: score (float), explanation (str), method (str)
    """
    prompt = build_prompt(tenant_profile, listing)

    for attempt in (1, 2):  # One retry on malformed JSON
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.LLM_BASE_URL}/api/generate",
                    json={
                        "model": settings.LLM_MODEL,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                    },
                )
                resp.raise_for_status()

            raw_response = resp.json().get("response", "")
            parsed = _parse_llm_response(raw_response)
            logger.info(
                f"LLM score computed: {parsed['score']} "
                f"(model={settings.LLM_MODEL}, attempt={attempt})"
            )
            return {**parsed, "method": "llm"}

        except ValueError as exc:
            # Malformed JSON from LLM — retry once, then fall back
            logger.warning(f"LLM JSON parse failed (attempt {attempt}): {exc}")
            if attempt == 2:
                break
            continue

        except Exception as exc:
            # Network error, timeout, Ollama not running, etc. — go straight to fallback
            logger.warning(f"LLM unavailable, using rule-based fallback: {exc}")
            return {**rule_based_score(tenant_profile, listing), "method": "rule-based"}

    # Reached here only after 2 failed JSON parses
    logger.warning("LLM returned malformed JSON twice — using rule-based fallback")
    return {**rule_based_score(tenant_profile, listing), "method": "rule-based"}