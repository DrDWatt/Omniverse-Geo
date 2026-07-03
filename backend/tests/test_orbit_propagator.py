from datetime import datetime, timezone

from models.satellite import SatelliteTle
from services.orbit_propagator import Sgp4OrbitPropagator


ISS_TLE = SatelliteTle(
    norad_id=25544,
    name="ISS (ZARYA)",
    line1="1 25544U 98067A   24001.00000000  .00016717  00000+0  10270-3 0  9001",
    line2="2 25544  51.6416  20.4020 0006703 130.5360 325.0288 15.50000000  1234",
    inclination=51.6416,
)


def test_sgp4_propagator_returns_plausible_position() -> None:
    propagator = Sgp4OrbitPropagator()
    position = propagator.position_at(ISS_TLE, datetime(2024, 1, 1, tzinfo=timezone.utc))

    assert -90 <= position.latitude <= 90
    assert -180 <= position.longitude <= 180
    assert 300 <= position.altitude_km <= 500
    assert 7.0 <= position.velocity_km_s <= 8.0
    assert position.inclination == 51.6416
