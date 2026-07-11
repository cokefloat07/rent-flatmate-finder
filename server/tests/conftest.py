import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.compatibility_score import CompatibilityScore
from app.models.interest import Interest
from app.models.listing import Listing
from app.models.message import Message
from app.models.tenant_profile import TenantProfile
from app.models.user import User

TEST_DB_NAME = f"{settings.MONGO_DB_NAME}_test"
ALL_MODELS = [User, Listing, TenantProfile, Interest, Message, CompatibilityScore]


@pytest_asyncio.fixture(scope="function")
async def client():
    """
    Function-scoped fixture: creates a fresh Motor client + Beanie binding
    on the *same* event loop that runs the test, then yields an httpx
    AsyncClient pointing at the FastAPI ASGI app.

    Cleans all documents before and closes the Mongo connection after.
    """
    # 1. Create Motor client on THIS test's loop
    mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    database = mongo_client[TEST_DB_NAME]

    # 2. Initialise Beanie on THIS test's loop
    await init_beanie(database=database, document_models=ALL_MODELS)

    # 3. Clean slate — delete all docs from previous test runs
    for model in ALL_MODELS:
        await model.delete_all()

    # 4. Import app AFTER Beanie init so it uses the same client
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac

    # 5. Cleanup
    for model in ALL_MODELS:
        await model.delete_all()
    mongo_client.close()