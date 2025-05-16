from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "MediTrack"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Medication Tracker API"

    DATABASE_URL: str = "sqlite:///./data/meditrack.db"
    SECRET_KEY: str = "your-secret-key-here"

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )


settings = Settings()
