import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Use /app/uploads in Docker/cloud, fallback to local path in dev
_default_upload_dir = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
_default_db = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR / 'cleantrack.db'}"
)

class Settings(BaseModel):
    PROJECT_NAME: str = "CleanTrack AI 2.0"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cleantrack_super_secure_jwt_secret_key_2026_dev_env")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = _default_db

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    UPLOAD_DIR: Path = Path(_default_upload_dir)
    MAX_IMAGE_SIZE_MB: int = 10

settings = Settings()
try:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"[CleanTrack] Warning: Could not create upload dir {settings.UPLOAD_DIR}: {e}")
