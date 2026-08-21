from abc import ABC, abstractmethod

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.satellite import SatelliteTle


class SatelliteRepository(ABC):
    @abstractmethod
    async def upsert_many(self, satellites: list[SatelliteTle]) -> int:
        raise NotImplementedError

    @abstractmethod
    async def list_satellites(self, limit: int = 200) -> list[SatelliteTle]:
        raise NotImplementedError

    @abstractmethod
    async def find_by_identifier(self, identifier: str) -> SatelliteTle | None:
        raise NotImplementedError


class MongoSatelliteRepository(SatelliteRepository):
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["satellites"]

    async def create_indexes(self) -> None:
        await self.collection.create_index("norad_id", unique=True)
        await self.collection.create_index("name")

    async def upsert_many(self, satellites: list[SatelliteTle]) -> int:
        count = 0
        for satellite in satellites:
            payload = satellite.model_dump()
            await self.collection.update_one(
                {"norad_id": satellite.norad_id},
                {"$set": payload},
                upsert=True,
            )
            count += 1
        return count

    async def list_satellites(self, limit: int = 200) -> list[SatelliteTle]:
        cursor = self.collection.find({}, {"_id": 0}).sort("name", 1).limit(limit)
        return [SatelliteTle(**item) async for item in cursor]

    async def find_by_identifier(self, identifier: str) -> SatelliteTle | None:
        normalized = identifier.strip()

        # Try exact NORAD ID first
        if normalized.isdigit():
            document = await self.collection.find_one({"norad_id": int(normalized)}, {"_id": 0})
            if document:
                return SatelliteTle(**document)

        # Fall back to name search (case-insensitive, partial match)
        document = await self.collection.find_one(
            {"name": {"$regex": normalized, "$options": "i"}},
            {"_id": 0},
        )
        return SatelliteTle(**document) if document else None
