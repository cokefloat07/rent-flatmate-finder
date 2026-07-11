import json


def build_prompt(tenant_profile: dict, listing: dict) -> str:
    """
    Constructs the exact prompt to be sent to the LLM (Ollama or Groq).
    Ensures the LLM understands it must return valid JSON.
    """
    t_clean = {k: v for k, v in tenant_profile.items() if not str(k).startswith('_')}
    l_clean = {k: v for k, v in listing.items() if not str(k).startswith('_')}

    return (
        "You are a rental compatibility scorer. Analyze the match between a tenant "
        "profile and a room listing.\n\n"
        f"TENANT PROFILE:\n{json.dumps(t_clean, indent=2)}\n\n"
        f"ROOM LISTING:\n{json.dumps(l_clean, indent=2)}\n\n"
        "Scoring rubric (total 100 points):\n"
        "- Location match: 50 points (exact or partial match)\n"
        "- Budget fit: 50 points (rent within budget_min and budget_max)\n"
        "- Deduct points for mismatches with brief explanation\n\n"
        "Respond with ONLY valid JSON in this exact format (no markdown, no code fences):\n"
        '{"score": <number 0-100>, "explanation": "<one-sentence explanation>"}'
    )