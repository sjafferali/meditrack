from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application metadata (with defaults)
    PROJECT_NAME: str = "MediTrack"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Medication Tracker Application"
    
    # Essential configuration
    DATABASE_URL: str = "sqlite:///./data/meditrack.db"
    SECRET_KEY: str = "your-secret-key-here"
    
    # Environment settings (with defaults)
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # CORS settings (default to same-origin)
    CORS_ORIGINS: list[str] = ["*"]  # In production, served from same origin

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )


settings = Settings()
