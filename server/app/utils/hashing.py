"""
Deterministic fingerprints for tenant profiles and listings.
Used to detect when a cached compatibility score is stale.
"""
import hashlib
import json
from typing import Any


def _stable_hash(payload: dict[str, Any]) -> str:
    """SHA-256 hash of a dict with sorted keys for determinism."""
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def profile_fingerprint(profile: dict) -> str:
    """Hash only the fields that influence scoring."""
    relevant = {
        "preferred_location": str(profile.get("preferred_location", "")).strip().lower(),
        "budget_min": float(profile.get("budget_min", 0) or 0),
        "budget_max": float(profile.get("budget_max", 0) or 0),
        "move_in_date": str(profile.get("move_in_date", "")),
    }
    return _stable_hash(relevant)


def listing_fingerprint(listing: dict) -> str:
    """Hash only the listing fields that influence scoring."""
    relevant = {
        "location": str(listing.get("location", "")).strip().lower(),
        "rent": float(listing.get("rent", 0) or 0),
        "available_from": str(listing.get("available_from", "")),
        "room_type": str(listing.get("room_type", "")),
        "furnishing_status": str(listing.get("furnishing_status", "")),
    }
    return _stable_hash(relevant)