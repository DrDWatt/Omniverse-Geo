from repositories.satellite_repository import SatelliteRepository
from services.config import get_settings
from services.spacetrack_client import SpaceTrackClient

repository_instance: SatelliteRepository | None = None


def set_repository(repository: SatelliteRepository) -> None:
    global repository_instance
    repository_instance = repository


def get_repository() -> SatelliteRepository:
    if repository_instance is None:
        raise RuntimeError("Satellite repository is not initialized")
    return repository_instance


def get_spacetrack_client() -> SpaceTrackClient:
    return SpaceTrackClient(get_settings())
