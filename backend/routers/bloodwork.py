import os
import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from config import UPLOAD_DIR
from database import get_db_connection
from models.db_models import (
    insert_blood_work_report,
    insert_biomarker,
    get_all_reports,
    get_report_with_biomarkers,
    get_biomarker_history,
    get_health_profile,
)
from services.pdf_parser import parse_blood_work_pdf
from services.biomarker_engine import classify_report_biomarkers

router = APIRouter(prefix="/api", tags=["bloodwork"])


@router.post("/bloodwork/upload")
def upload_bloodwork(file: UploadFile = File(...), conn: sqlite3.Connection = Depends(get_db_connection)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    save_name = f"{uuid4().hex}_{file.filename}"
    save_path = os.path.join(UPLOAD_DIR, save_name)
    with open(save_path, "wb") as f:
        f.write(file.file.read())

    parse_result = parse_blood_work_pdf(save_path)

    profile = get_health_profile(conn)
    sex = profile["sex"] if profile and profile.get("sex") else "male"

    classified = classify_report_biomarkers(parse_result["biomarkers"], sex)

    report_id = insert_blood_work_report(
        conn,
        report_date=parse_result["report_date"],
        lab_name=parse_result["lab_name"],
        filename=save_name,
        raw_text=parse_result["raw_text"],
    )

    biomarker_responses = []
    for bm in classified:
        bm_id = insert_biomarker(
            conn,
            report_id=report_id,
            report_date=parse_result["report_date"],
            name=bm["name"],
            value=bm["value"],
            unit=bm["unit"],
            lab_low=bm["lab_reference_low"],
            lab_high=bm["lab_reference_high"],
            optimal_low=bm["optimal_low"],
            optimal_high=bm["optimal_high"],
            status=bm["status"],
            category=bm["category"],
        )
        biomarker_responses.append({
            "id": bm_id,
            "name": bm["name"],
            "value": bm["value"],
            "unit": bm["unit"],
            "lab_reference_low": bm["lab_reference_low"],
            "lab_reference_high": bm["lab_reference_high"],
            "optimal_low": bm["optimal_low"],
            "optimal_high": bm["optimal_high"],
            "status": bm["status"],
            "category": bm["category"],
        })
    conn.commit()

    return {
        "report_id": report_id,
        "report_date": parse_result["report_date"],
        "lab_name": parse_result["lab_name"],
        "biomarkers": biomarker_responses,
        "parse_method": parse_result["parse_method"],
        "parse_confidence": parse_result["parse_confidence"],
        "warnings": parse_result["warnings"],
    }


@router.get("/bloodwork")
def list_reports(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_all_reports(conn)


@router.get("/bloodwork/{report_id}")
def get_report(report_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    result = get_report_with_biomarkers(conn, report_id)
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return result


@router.get("/biomarkers/{name}/history")
def biomarker_history(name: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_biomarker_history(conn, name)
