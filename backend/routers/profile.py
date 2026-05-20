from fastapi import APIRouter, Depends, HTTPException
import sqlite3

from database import get_db_connection
from models.schemas import HealthProfileCreate, HealthProfileResponse
from models.db_models import upsert_health_profile, get_health_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("", response_model=HealthProfileResponse)
def save_profile(data: HealthProfileCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    result = upsert_health_profile(conn, data.model_dump())
    return result


@router.get("", response_model=HealthProfileResponse)
def read_profile(conn: sqlite3.Connection = Depends(get_db_connection)):
    result = get_health_profile(conn)
    if not result:
        raise HTTPException(status_code=404, detail="Health profile not set. Create one first.")
    return result
