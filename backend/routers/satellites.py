from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from dependencies import get_repository, get_spacetrack_client
from models.satellite import AgentRequest, AgentResponse, SatellitePosition, SatelliteTle
from repositories.satellite_repository import SatelliteRepository
from services.orbit_propagator import OrbitPropagationError, Sgp4OrbitPropagator
from services.query_agent import SatelliteQueryAgent
from services.spacetrack_client import SpaceTrackClient

router = APIRouter(prefix="/satellites", tags=["satellites"])
propagator = Sgp4OrbitPropagator()


@router.get("", response_model=list[SatelliteTle])
async def list_satellites(repository: SatelliteRepository = Depends(get_repository)) -> list[SatelliteTle]:
    return await repository.list_satellites()


@router.get("/{identifier}/position", response_model=SatellitePosition)
async def satellite_position(
    identifier: str,
    repository: SatelliteRepository = Depends(get_repository),
) -> SatellitePosition:
    satellite = await repository.find_by_identifier(identifier)
    if not satellite:
        raise HTTPException(status_code=404, detail="Satellite not found")
    try:
        return propagator.position_at(satellite)
    except OrbitPropagationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/{identifier}/orbit")
async def satellite_orbit(
    identifier: str,
    minutes: int = 90,
    step_seconds: int = 60,
    repository: SatelliteRepository = Depends(get_repository),
) -> dict:
    """Return orbit track positions over the given time window for animation."""
    satellite = await repository.find_by_identifier(identifier)
    if not satellite:
        raise HTTPException(status_code=404, detail="Satellite not found")

    now = datetime.now(timezone.utc)
    positions = []
    for i in range(0, minutes * 60, step_seconds):
        t = now + timedelta(seconds=i)
        try:
            pos = propagator.position_at(satellite, when=t)
            positions.append({
                "time": t.isoformat(),
                "latitude": pos.latitude,
                "longitude": pos.longitude,
                "altitude_km": pos.altitude_km,
            })
        except OrbitPropagationError:
            continue

    return {
        "norad_id": satellite.norad_id,
        "name": satellite.name,
        "inclination": satellite.inclination,
        "positions": positions,
    }


@router.post("/ingest")
async def ingest_tles(
    repository: SatelliteRepository = Depends(get_repository),
    client: SpaceTrackClient = Depends(get_spacetrack_client),
) -> dict[str, int]:
    satellites = await client.fetch_active_tles()
    count = await repository.upsert_many(satellites)
    return {"ingested": count}


@router.post("/agent", response_model=AgentResponse)
async def query_agent(
    request: AgentRequest,
    repository: SatelliteRepository = Depends(get_repository),
) -> AgentResponse:
    agent = SatelliteQueryAgent(repository, propagator)
    return await agent.answer(request.query)
