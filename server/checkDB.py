import asyncio

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


async def check() -> None:
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000,
    )
    try:
        result = await client.admin.command("ping")
        print("MongoDB connection successful:", result)
        print("Application database:", settings.MONGO_DB_NAME)
    finally:
        client.close()


asyncio.run(check())