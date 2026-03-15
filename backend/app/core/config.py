from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "Mi Estado de Ánimo API"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite+aiosqlite:///./mood_tracker.db"

    SECRET_KEY: str = "change-this-to-a-secure-random-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    UPLOAD_DIR: Path = Path(__file__).resolve().parent.parent.parent / "uploads"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    OPENAI_API_KEY: str = ""
    WHISPER_MODEL: str = "whisper-1"

    class Config:
        env_file = ".env"


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
