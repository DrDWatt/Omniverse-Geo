from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import DatabaseSession
from dependencies import set_repository
from repositories.satellite_repository import MongoSatelliteRepository
from routers import satellites
from services.config import get_settings

settings = get_settings()
database_session = DatabaseSession(settings)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await database_session.connect()
    repository = MongoSatelliteRepository(database_session.database())
    await repository.create_indexes()
    set_repository(repository)
    yield
    await database_session.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}

app.include_router(satellites.router)
