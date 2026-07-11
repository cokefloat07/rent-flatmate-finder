def rule_based_score(tenant_profile: dict, listing: dict) -> dict:
    """
    Fallback logic to calculate a score without an LLM.
    Rubric: 50pts for Location, 50pts for Budget.
    """
    score = 0.0
    reasons = []

    # 1. Location Matching (Partial String Match)
    tenant_loc = tenant_profile.get("preferred_location", "").lower()
    listing_loc = listing.get("location", "").lower()

    if tenant_loc in listing_loc or listing_loc in tenant_loc:
        score += 50
        reasons.append("Location matches your preferred area.")
    else:
        reasons.append("Location is outside your preferred area.")

    # 2. Budget Matching
    rent = listing.get("rent", 0)
    b_min = tenant_profile.get("budget_min", 0)
    b_max = tenant_profile.get("budget_max", 0)

    if b_min <= rent <= b_max:
        score += 50
        reasons.append(f"Rent (£{rent}) is within your budget range.")
    elif rent < b_min:
        score += 30
        reasons.append(f"Rent is significantly lower than your expected minimum.")
    else:
        # Calculate how much they are over budget to give partial points
        overage = rent - b_max
        penalty = (overage / b_max) * 50 if b_max > 0 else 50
        remaining = max(0, 50 - penalty)
        score += remaining
        reasons.append(f"Rent is £{overage} over your maximum budget.")

    final_score = round(min(score, 100), 1)
    
    return {
        "score": final_score,
        "explanation": f"{' '.join(reasons)} Total rule-based score: {final_score}/100. (Calculated via rule-based fallback)."
    }