from fastapi.testclient import TestClient

from dependencies import set_repository
from main import app
from models.satellite import SatelliteTle
from repositories.satellite_repository import SatelliteRepository


class FakeSatelliteRepository(SatelliteRepository):
    def __init__(self) -> None:
        self.satellites = [
            SatelliteTle(
                norad_id=25544,
                name="ISS (ZARYA)",
                line1="1 25544U 98067A   24001.00000000  .00016717  00000+0  10270-3 0  9001",
                line2="2 25544  51.6416  20.4020 0006703 130.5360 325.0288 15.50000000  1234",
                inclination=51.6416,
            )
        ]

    async def upsert_many(self, satellites: list[SatelliteTle]) -> int:
        self.satellites = satellites
        return len(satellites)

    async def list_satellites(self, limit: int = 200) -> list[SatelliteTle]:
        return self.satellites[:limit]

    async def find_by_identifier(self, identifier: str) -> SatelliteTle | None:
        for satellite in self.satellites:
            if identifier == str(satellite.norad_id) or identifier.lower() in satellite.name.lower():
                return satellite
        return None


def test_health_endpoint() -> None:
    set_repository(FakeSatelliteRepository())
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_satellite_position_endpoint() -> None:
    set_repository(FakeSatelliteRepository())
    client = TestClient(app)
    response = client.get("/satellites/25544/position")

    assert response.status_code == 200
    body = response.json()
    assert body["norad_id"] == 25544
    assert 300 <= body["altitude_km"] <= 500


def test_agent_endpoint_returns_satellite_metrics() -> None:
    set_repository(FakeSatelliteRepository())
    client = TestClient(app)
    response = client.post("/satellites/agent", json={"query": "return altitude and velocity for 25544"})

    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "satellite_lookup"
    assert body["satellite"]["norad_id"] == 25544
