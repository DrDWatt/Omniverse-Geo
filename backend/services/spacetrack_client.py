import re
from datetime import UTC, datetime

import httpx

from models.satellite import SatelliteTle
from services.config import Settings


class SpaceTrackClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch_active_tles(self) -> list[SatelliteTle]:
        if not self.settings.spacetrack_user or not self.settings.spacetrack_pass:
            raise ValueError("SPACETRACK_USER and SPACETRACK_PASS are required")

        login_url = f"{self.settings.spacetrack_base_url}/ajaxauth/login"
        tle_url = (
            f"{self.settings.spacetrack_base_url}/basicspacedata/query/class/gp/"
            "decay_date/null-val/orderby/norad_cat_id/format/3le"
        )
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            await client.post(
                login_url,
                data={
                    "identity": self.settings.spacetrack_user,
                    "password": self.settings.spacetrack_pass,
                },
            )
            response = await client.get(tle_url)
            response.raise_for_status()
            return parse_3le(response.text)


def parse_3le(payload: str) -> list[SatelliteTle]:
    lines = [line.strip() for line in payload.splitlines() if line.strip()]
    satellites: list[SatelliteTle] = []
    for index in range(0, len(lines) - 2, 3):
        name, line1, line2 = lines[index : index + 3]
        match = re.search(r"1\s+(\d+)", line1)
        if not match or not line1.startswith("1 ") or not line2.startswith("2 "):
            continue
        inclination = _parse_inclination(line2)
        satellites.append(
            SatelliteTle(
                norad_id=int(match.group(1)),
                name=name,
                line1=line1,
                line2=line2,
                inclination=inclination,
                updated_at=datetime.now(UTC),
            )
        )
    return satellites


def _parse_inclination(line2: str) -> float | None:
    fields = line2.split()
    if len(fields) < 3:
        return None
    try:
        return float(fields[2])
    except ValueError:
        return None
