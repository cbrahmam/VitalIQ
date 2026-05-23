import sqlite3
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from database import get_db_connection
from services.report_generator import generate_full_report, generate_doctor_summary

router = APIRouter(prefix="/api/report", tags=["report"])


@router.post("/generate")
def create_report(conn: sqlite3.Connection = Depends(get_db_connection)):
    report = generate_full_report(conn)
    return {"report": report}


@router.get("/doctor-summary", response_class=PlainTextResponse)
def doctor_summary(conn: sqlite3.Connection = Depends(get_db_connection)):
    return generate_doctor_summary(conn)
