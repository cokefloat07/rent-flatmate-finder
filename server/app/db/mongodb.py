from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.utils.logger import logger

# Module-level client — reused across the app lifetime
_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Create Motor client and initialise Beanie ODM with all Document models."""
    global _client

    # Import models here (after they are fully defined) to avoid circular imports
    from app.models.user import User
    from app.models.listing import Listing
    from app.models.tenant_profile import TenantProfile
    from app.models.interest import Interest
    from app.models.message import Message
    from app.models.compatibility_score import CompatibilityScore

    _client = AsyncIOMotorClient(settings.MONGO_URI)
    database = _client[settings.MONGO_DB_NAME]

    await init_beanie(
        database=database,
        document_models=[
            User,
            Listing,
            TenantProfile,
            Interest,
            Message,
            CompatibilityScore,
        ],
    )
    logger.info(f"Connected to MongoDB: {settings.MONGO_DB_NAME}")


async def close_db() -> None:
    """Close the Motor client on app shutdown."""
    global _client
    if _client is not None:
        _client.close()
        logger.info("MongoDB connection closed")