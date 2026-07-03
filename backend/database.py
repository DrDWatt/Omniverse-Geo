from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from services.config import Settings


class DatabaseSession:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: AsyncIOMotorClient | None = None

    async def connect(self) -> None:
        self.client = AsyncIOMotorClient(self.settings.mongodb_uri)

    async def close(self) -> None:
        if self.client:
            self.client.close()

    def database(self) -> AsyncIOMotorDatabase:
        if not self.client:
            raise RuntimeError("Database client is not connected")
        return self.client[self.settings.database_name]
