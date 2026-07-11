import pytest

OWNER = {
    "name": "IO Owner",
    "email": "io_owner@test.com",
    "password": "password123",
    "role": "owner",
}
TENANT = {
    "name": "IO Tenant",
    "email": "io_tenant@test.com",
    "password": "password123",
    "role": "tenant",
}


async def _register_and_login(client, user: dict) -> str:
    """Register a user (idempotent) and return their JWT."""
    await client.post("/api/auth/register", json=user)
    resp = await client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["token"]["access_token"]


async def _create_listing(client, owner_token: str) -> str:
    resp = await client.post(
        "/api/listings/",
        json={
            "location": "London",
            "rent": 1200.0,
            "available_from": "2024-09-01",
            "room_type": "single",
            "furnishing_status": "furnished",
            "photos": [],
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


@pytest.mark.asyncio
async def test_full_interest_flow(client):
    owner_token = await _register_and_login(client, OWNER)
    tenant_token = await _register_and_login(client, TENANT)

    listing_id = await _create_listing(client, owner_token)

    # Tenant creates a profile
    profile_resp = await client.post(
        "/api/profiles/",
        json={
            "preferred_location": "London",
            "budget_min": 1000,
            "budget_max": 1500,
            "move_in_date": "2024-09-01",
        },
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert profile_resp.status_code == 201, profile_resp.text

    # Tenant expresses interest
    interest_resp = await client.post(
        "/api/interests/",
        json={"listing_id": listing_id},
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert interest_resp.status_code == 201, interest_resp.text
    interest_id = interest_resp.json()["data"]["id"]

    # Owner sees the incoming interest
    incoming_resp = await client.get(
        "/api/interests/incoming",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert incoming_resp.status_code == 200
    assert any(i["id"] == interest_id for i in incoming_resp.json()["data"])

    # Owner accepts
    accept_resp = await client.patch(
        f"/api/interests/{interest_id}/respond",
        json={"action": "accept"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == "accepted"

    # Chat history is now accessible (empty at this point)
    chat_resp = await client.get(
        f"/api/chat/{interest_id}/messages",
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert chat_resp.status_code == 200
    assert chat_resp.json()["data"] == []


@pytest.mark.asyncio
async def test_duplicate_interest_rejected(client):
    owner_token = await _register_and_login(client, OWNER)
    tenant_token = await _register_and_login(client, TENANT)

    listing_id = await _create_listing(client, owner_token)

    # First interest — should succeed
    resp1 = await client.post(
        "/api/interests/",
        json={"listing_id": listing_id},
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert resp1.status_code == 201

    # Second attempt — must be rejected as conflict
    resp2 = await client.post(
        "/api/interests/",
        json={"listing_id": listing_id},
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert resp2.status_code == 409