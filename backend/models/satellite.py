from datetime import datetime, timezone
UTC = timezone.utc

from pydantic import BaseModel, Field


class SatelliteTle(BaseModel):
    norad_id: int = Field(..., description="NORAD catalog identifier")
    name: str
    line1: str
    line2: str
    inclination: float | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SatellitePosition(BaseModel):
    norad_id: int
    name: str
    latitude: float
    longitude: float
    altitude_km: float
    velocity_km_s: float
    inclination: float | None
    calculated_at: datetime


class AgentRequest(BaseModel):
    query: str


class AgentResponse(BaseModel):
    answer: str
    satellite: SatellitePosition | None = None
    intent: str
