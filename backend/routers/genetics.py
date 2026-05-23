import os
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from config import UPLOAD_DIR
from database import get_db_connection
from models.db_models import (
    upsert_genetic_marker, get_genetic_markers, clear_genetic_markers,
    get_all_biomarkers_latest,
)
from services.genetics_parser import parse_23andme_raw, get_genetic_implications

router = APIRouter(prefix="/api/genetics", tags=["genetics"])

DISCLAIMER = (
    "Genetic insights are for educational purposes only. "
    "Consult a genetic counselor for medical decisions."
)


@router.post("/upload")
async def upload_genetics(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    save_path = os.path.join(UPLOAD_DIR, f"genetics_{file.filename}")
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    return _process_genetics_upload(save_path)


def _process_genetics_upload(save_path: str):
    import sqlite3 as _sqlite3
    from config import DATABASE_PATH

    try:
        parsed = parse_23andme_raw(save_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse genetics file: {str(e)}")

    if not parsed:
        raise HTTPException(status_code=422, detail="No recognized SNPs found in the file")

    conn = _sqlite3.connect(DATABASE_PATH)
    conn.row_factory = _sqlite3.Row
    try:
        clear_genetic_markers(conn)
        for marker in parsed:
            upsert_genetic_marker(
                conn, marker["rsid"], marker["gene"], marker["genotype"],
                marker["name"], marker["category"], marker["risk_level"],
                marker["description"],
            )
        conn.commit()
    finally:
        conn.close()

    categories = {}
    for m in parsed:
        cat = m["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "elevated": 0, "moderate": 0}
        categories[cat]["total"] += 1
        if m["risk_level"] == "elevated":
            categories[cat]["elevated"] += 1
        elif m["risk_level"] == "moderate":
            categories[cat]["moderate"] += 1

    return {
        "markers_found": len(parsed),
        "categories": categories,
        "markers": parsed,
        "disclaimer": DISCLAIMER,
    }


@router.get("")
def get_markers(conn: sqlite3.Connection = Depends(get_db_connection)):
    markers = get_genetic_markers(conn)
    return {"markers": markers, "disclaimer": DISCLAIMER}


@router.get("/implications")
def get_implications(conn: sqlite3.Connection = Depends(get_db_connection)):
    markers = get_genetic_markers(conn)
    if not markers:
        return {"implications": [], "disclaimer": DISCLAIMER}

    biomarkers = get_all_biomarkers_latest(conn)

    marker_dicts = []
    from services.genetics_parser import _load_snp_db
    snp_db = _load_snp_db()
    for m in markers:
        snp = snp_db.get(m["rsid"], {})
        marker_dicts.append({
            **m,
            "affected_biomarkers": snp.get("affected_biomarkers", []),
            "supplement_implication": snp.get("supplement_implications", {}).get(m["risk_level"]),
            "name": m.get("significance", m["gene"]),
        })

    implications = get_genetic_implications(marker_dicts, biomarkers)
    return {"implications": implications, "disclaimer": DISCLAIMER}
