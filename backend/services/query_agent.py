import re

from models.satellite import AgentResponse
from repositories.satellite_repository import SatelliteRepository
from services.orbit_propagator import Sgp4OrbitPropagator


class SatelliteQueryAgent:
    def __init__(
        self,
        repository: SatelliteRepository,
        propagator: Sgp4OrbitPropagator,
    ) -> None:
        self.repository = repository
        self.propagator = propagator

    async def answer(self, query: str) -> AgentResponse:
        identifier = _extract_identifier(query)
        if not identifier:
            return AgentResponse(
                intent="unknown",
                answer="Ask for a satellite by name or NORAD ID.",
                satellite=None,
            )

        tle = await self.repository.find_by_identifier(identifier)
        if not tle:
            return AgentResponse(
                intent="satellite_lookup",
                answer=f"No satellite matched '{identifier}'.",
                satellite=None,
            )

        position = self.propagator.position_at(tle)
        details = (
            f"{position.name} is at {position.latitude:.2f} latitude, "
            f"{position.longitude:.2f} longitude, {position.altitude_km:.1f} km altitude, "
            f"moving {position.velocity_km_s:.2f} km/s"
        )
        if position.inclination is not None:
            details += f" with {position.inclination:.2f} degrees inclination."
        else:
            details += "."
        return AgentResponse(intent="satellite_lookup", answer=details, satellite=position)


def _extract_identifier(query: str) -> str | None:
    norad_match = re.search(r"\b(?:norad\s*)?(\d{2,8})\b", query, re.IGNORECASE)
    if norad_match:
        return norad_match.group(1)

    starlink_match = re.search(r"\b(starlink[-\s]?\d+)\b", query, re.IGNORECASE)
    if starlink_match:
        return starlink_match.group(1).replace(" ", "-")

    name_match = re.search(r"(?:satellite|zoom into|show|find)\s+([a-z0-9\- ]+)", query, re.IGNORECASE)
    if name_match:
        return name_match.group(1).strip()
    return query.strip() or None
