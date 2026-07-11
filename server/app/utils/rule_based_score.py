def rule_based_score(tenant_profile: dict, listing: dict) -> dict:
    """
    Fallback logic to calculate a compatibility score without an LLM.
    Rubric: 50pts for Location, 50pts for Budget.
    """
    score = 0.0
    reasons = []

    # ── 1. Location Matching ──────────────────────────────────────────────
    tenant_loc = str(tenant_profile.get("preferred_location", "")).strip().lower()
    listing_loc = str(listing.get("location", "")).strip().lower()

    location_match = False

    if not tenant_loc or not listing_loc:
        reasons.append("Location information missing.")
    else:
        # Split by common separators (comma, space) and check word overlap
        tenant_words = {w.strip() for w in tenant_loc.replace(',', ' ').split() if len(w.strip()) > 2}
        listing_words = {w.strip() for w in listing_loc.replace(',', ' ').split() if len(w.strip()) > 2}

        # Check exact match or word intersection
        common_words = tenant_words & listing_words

        if tenant_loc == listing_loc:
            score += 50
            location_match = True
            reasons.append(f"Exact location match: {listing.get('location')}.")
        elif common_words:
            score += 50
            location_match = True
            reasons.append(
                f"Location matches your preferred area (matched: {', '.join(common_words)})."
            )
        else:
            reasons.append(
                f"Location '{listing.get('location')}' is outside your preferred area "
                f"'{tenant_profile.get('preferred_location')}'."
            )

    # ── 2. Budget Matching ────────────────────────────────────────────────
    try:
        rent = float(listing.get("rent", 0))
        b_min = float(tenant_profile.get("budget_min", 0))
        b_max = float(tenant_profile.get("budget_max", 0))
    except (TypeError, ValueError):
        rent = 0
        b_min = 0
        b_max = 0

    if b_max <= 0:
        reasons.append("Budget information missing.")
    elif b_min <= rent <= b_max:
        score += 50
        reasons.append(f"Rent (₹{int(rent):,}) fits within your budget range.")
    elif rent < b_min:
        # Slightly under budget — still good
        score += 40
        reasons.append(
            f"Rent (₹{int(rent):,}) is below your minimum budget of ₹{int(b_min):,}."
        )
    else:
        # Over budget — penalty scales with how much over
        overage = rent - b_max
        overage_pct = (overage / b_max) * 100 if b_max > 0 else 100

        if overage_pct <= 10:
            score += 35
            reasons.append(
                f"Rent (₹{int(rent):,}) is slightly over your budget by ₹{int(overage):,}."
            )
        elif overage_pct <= 25:
            score += 20
            reasons.append(
                f"Rent (₹{int(rent):,}) is ₹{int(overage):,} over your maximum budget."
            )
        elif overage_pct <= 50:
            score += 10
            reasons.append(
                f"Rent (₹{int(rent):,}) is significantly over your budget."
            )
        else:
            reasons.append(
                f"Rent (₹{int(rent):,}) is far above your budget of ₹{int(b_max):,}."
            )

    final_score = round(min(max(score, 0), 100), 1)

    # Better explanation summary
    if final_score >= 80:
        summary = "Excellent match!"
    elif final_score >= 60:
        summary = "Good match."
    elif final_score >= 40:
        summary = "Fair match."
    else:
        summary = "Poor match."

    return {
        "score": final_score,
        "explanation": f"{summary} {' '.join(reasons)}",
    }