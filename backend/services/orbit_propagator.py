from datetime import datetime, timezone
from math import atan2, cos, degrees, fmod, pi, sin, sqrt

from sgp4.api import Satrec, jday

from models.satellite import SatellitePosition, SatelliteTle

EARTH_RADIUS_KM = 6378.137
EARTH_ROTATION_RATE_RAD_S = 7.2921159e-5
J2000_UNIX_SECONDS = 946728000.0


class OrbitPropagationError(Exception):
    pass


class Sgp4OrbitPropagator:
    def position_at(
        self,
        satellite: SatelliteTle,
        when: datetime | None = None,
    ) -> SatellitePosition:
        calculated_at = when or datetime.now(timezone.utc)
        if calculated_at.tzinfo is None:
            calculated_at = calculated_at.replace(tzinfo=timezone.utc)

        satrec = Satrec.twoline2rv(satellite.line1, satellite.line2)
        jd, fraction = jday(
            calculated_at.year,
            calculated_at.month,
            calculated_at.day,
            calculated_at.hour,
            calculated_at.minute,
            calculated_at.second + calculated_at.microsecond / 1_000_000,
        )
        error, position, velocity = satrec.sgp4(jd, fraction)
        if error:
            raise OrbitPropagationError(f"SGP4 propagation failed with code {error}")

        latitude, longitude, altitude = _eci_to_geodetic(position, calculated_at)
        velocity_km_s = sqrt(sum(component * component for component in velocity))
        return SatellitePosition(
            norad_id=satellite.norad_id,
            name=satellite.name,
            latitude=latitude,
            longitude=longitude,
            altitude_km=altitude,
            velocity_km_s=velocity_km_s,
            inclination=satellite.inclination,
            calculated_at=calculated_at,
        )


def _eci_to_geodetic(position_km: tuple[float, float, float], when: datetime) -> tuple[float, float, float]:
    elapsed = when.timestamp() - J2000_UNIX_SECONDS
    theta = fmod(EARTH_ROTATION_RATE_RAD_S * elapsed, 2 * pi)
    x_eci, y_eci, z_eci = position_km
    x = cos(theta) * x_eci + sin(theta) * y_eci
    y = -sin(theta) * x_eci + cos(theta) * y_eci
    radius = sqrt(x * x + y * y + z_eci * z_eci)
    latitude = degrees(atan2(z_eci, sqrt(x * x + y * y)))
    longitude = _normalize_longitude(degrees(atan2(y, x)))
    altitude = radius - EARTH_RADIUS_KM
    return latitude, longitude, altitude


def _normalize_longitude(value: float) -> float:
    return ((value + 180.0) % 360.0) - 180.0
