from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str
    redis_url: str
    minio_endpoint: str
    app_env: str = "local"
    jwt_secret: str = "local-dev-change-me"
    demo_mode: bool = False
    evidence_dir: str = "/app/data/evidence"


@lru_cache
def get_settings() -> Settings:
    return Settings()
