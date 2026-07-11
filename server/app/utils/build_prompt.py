import json

def build_prompt(tenant_profile: dict, listing: dict) -> str:
    """
    Constructs the exact prompt to be sent to the Ollama LLM.
    Ensures the LLM understands it must return valid JSON.
    """
    # Remove sensitive or unnecessary fields before stringifying
    t_clean = {k: v for k, v in tenant_profile.items() if not k.startswith('_')}
    l_clean = {k: v for k, v in listing.items() if not k.startswith('_')}

    return (
        f"Given this room listing: {json.dumps(l_clean)} "
        f"and this tenant profile: {json.dumps(t_clean)}, "
        "compute a compatibility score from 0 to 100 based on budget and location match. "
        "Return strictly valid JSON in this format: "
        '{ "score": number, "explanation": "string" }'
    )