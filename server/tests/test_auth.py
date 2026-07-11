import pytest

OWNER = {
    "name": "Test Owner",
    "email": "auth_owner@test.com",
    "password": "password123",
    "role": "owner",
}
TENANT = {
    "name": "Test Tenant",
    "email": "auth_tenant@test.com",
    "password": "password123",
    "role": "tenant",
}


@pytest.mark.asyncio
async def test_register_owner(client):
    resp = await client.post("/api/auth/register", json=OWNER)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["user"]["role"] == "owner"
    assert "access_token" in body["data"]["token"]


@pytest.mark.asyncio
async def test_register_tenant(client):
    resp = await client.post("/api/auth/register", json=TENANT)
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["user"]["role"] == "tenant"


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client):
    await client.post("/api/auth/register", json=OWNER)
    resp = await client.post("/api/auth/register", json=OWNER)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/auth/register", json=OWNER)

    resp = await client.post(
        "/api/auth/login",
        json={"email": OWNER["email"], "password": OWNER["password"]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "access_token" in body["data"]["token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json=OWNER)

    resp = await client.post(
        "/api/auth/login",
        json={"email": OWNER["email"], "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client):
    await client.post("/api/auth/register", json=OWNER)
    login = await client.post(
        "/api/auth/login",
        json={"email": OWNER["email"], "password": OWNER["password"]},
    )
    token = login.json()["data"]["token"]["access_token"]

    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["role"] == "owner"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    resp = await client.get("/api/auth/me")
    # HTTPBearer returns 403 when Authorization header is missing entirely
    assert resp.status_code == 403