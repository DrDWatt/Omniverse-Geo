from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Omniverse-Geo"
    environment: str = "development"
    mongodb_uri: str = "mongodb://mongo:27017"
    mongodb_dev_db: str = "omniverse_geo_dev"
    mongodb_test_db: str = "omniverse_geo_test"
    mongodb_prod_db: str = "omniverse_geo_prod"
    spacetrack_user: str | None = None
    spacetrack_pass: str | None = None
    spacetrack_base_url: str = "https://www.space-track.org"
    cors_origins: str = "http://localhost:19010"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def database_name(self) -> str:
        if self.environment == "production":
            return self.mongodb_prod_db
        if self.environment == "test":
            return self.mongodb_test_db
        return self.mongodb_dev_db

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
