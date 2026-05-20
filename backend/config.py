import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = os.environ.get("DATABASE_PATH", str(BASE_DIR / "health_data" / "vitaliq.db"))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(BASE_DIR / "uploads"))
REFERENCE_DATA_DIR = str(BASE_DIR / "reference_data")
CORS_ORIGINS = ["http://localhost:5173"]


def ensure_directories():
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
