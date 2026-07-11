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
        self.score = round(min(max(float(self.score), 0.0), 100.0), 1)


def _parse_llm_response(raw: str) -> dict:
    """
    Attempt to parse the LLM's JSON response.
    Strips markdown fences if the model wrapped JSON in ```json ... ```.
    """
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


# ────────────────────────────────────────────────────────────────
# Ollama Provider
# ────────────────────────────────────────────────────────────────
async def _call_ollama(prompt: str) -> str:
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
        return resp.json().get("response", "")


# ────────────────────────────────────────────────────────────────
# Groq Provider (OpenAI-compatible)
# ────────────────────────────────────────────────────────────────
async def _call_groq(prompt: str) -> str:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY missing in environment")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.GROQ_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a strict JSON generator. "
                            "Always respond with valid JSON only. "
                            "Do not include markdown, code fences, or extra text."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 512,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ────────────────────────────────────────────────────────────────
# Provider Dispatcher
# ────────────────────────────────────────────────────────────────
async def _call_llm(prompt: str) -> str:
    provider = settings.LLM_PROVIDER.lower().strip()

    if provider == "groq":
        return await _call_groq(prompt)
    elif provider == "ollama":
        return await _call_ollama(prompt)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")


# ────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────
async def get_compatibility_score(tenant_profile: dict, listing: dict) -> dict:
    """
    Compute an AI compatibility score for a tenant/listing pair.

    Uses either Ollama or Groq depending on LLM_PROVIDER env var.
    Falls back to rule-based scoring on any failure.
    """
    prompt = build_prompt(tenant_profile, listing)
    provider = settings.LLM_PROVIDER.lower().strip()

    for attempt in (1, 2):  # one retry on malformed JSON
        try:
            raw_response = await _call_llm(prompt)
            parsed = _parse_llm_response(raw_response)

            logger.info(
                f"LLM score computed: {parsed['score']} "
                f"(provider={provider}, attempt={attempt})"
            )
            return {**parsed, "method": f"llm-{provider}"}

        except ValueError as exc:
            logger.warning(f"LLM JSON parse failed (attempt {attempt}): {exc}")
            if attempt == 2:
                break
            continue

        except Exception as exc:
            logger.warning(
                f"LLM ({provider}) unavailable, using rule-based fallback: {exc}"
            )
            return {
                **rule_based_score(tenant_profile, listing),
                "method": "rule-based",
            }

    logger.warning(
        f"LLM ({provider}) returned malformed JSON twice — using rule-based fallback"
    )
    return {
        **rule_based_score(tenant_profile, listing),
        "method": "rule-based",
    }