import json
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from config import REFERENCE_DATA_DIR
from database import get_db_connection
from models.schemas import MedicationCreate, MedicationUpdate
from models.db_models import (
    insert_medication, get_active_medications, get_all_medications,
    get_medication_by_id, update_medication, deactivate_medication,
    get_medication_history, get_active_supplements,
)

router = APIRouter(prefix="/api/medications", tags=["medications"])

_med_db_path = Path(REFERENCE_DATA_DIR) / "medication_interactions.json"
with open(_med_db_path) as f:
    MEDICATION_DB = json.load(f)


@router.post("")
def add_medication(data: MedicationCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    med_id = insert_medication(conn, data.model_dump())
    med = get_medication_by_id(conn, med_id)
    interactions = _check_all_interactions(conn)
    return {"medication": med, "interactions": interactions}


@router.get("")
def list_medications(include_inactive: bool = False,
                     conn: sqlite3.Connection = Depends(get_db_connection)):
    meds = get_all_medications(conn) if include_inactive else get_active_medications(conn)
    interactions = _check_all_interactions(conn)
    return {"medications": meds, "interactions": interactions}


@router.put("/{med_id}")
def edit_medication(med_id: str, data: MedicationUpdate,
                    conn: sqlite3.Connection = Depends(get_db_connection)):
    result = update_medication(conn, med_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Medication not found")
    interactions = _check_all_interactions(conn)
    return {"medication": result, "interactions": interactions}


@router.delete("/{med_id}")
def remove_medication(med_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    success = deactivate_medication(conn, med_id)
    if not success:
        raise HTTPException(status_code=404, detail="Medication not found")
    return {"message": "Medication deactivated"}


@router.get("/history")
def medication_history(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_medication_history(conn)


@router.get("/interactions")
def get_interactions(conn: sqlite3.Connection = Depends(get_db_connection)):
    return _check_all_interactions(conn)


@router.get("/known")
def list_known_medications():
    return [{"name": name, "category": info["category"]} for name, info in MEDICATION_DB.items()]


def _check_all_interactions(conn: sqlite3.Connection) -> dict:
    meds = get_active_medications(conn)
    supplements = get_active_supplements(conn)
    active_supp_names = {s["name"] for s in supplements}

    med_supplement_interactions = []
    nutrient_depletions = []
    biomarker_effects = []

    for med in meds:
        info = MEDICATION_DB.get(med["name"])
        if not info:
            continue

        for depl in info.get("depletes", []):
            is_supplementing = depl in active_supp_names
            nutrient_depletions.append({
                "medication": med["name"],
                "nutrient": depl,
                "is_supplementing": is_supplementing,
                "recommendation": f"{med['name']} depletes {depl}." + (
                    f" You're already supplementing — good." if is_supplementing
                    else f" Consider supplementing {depl}."
                ),
            })

        for interaction in info.get("interacts_with_supplements", []):
            if interaction["supplement"] in active_supp_names:
                med_supplement_interactions.append({
                    "medication": med["name"],
                    "supplement": interaction["supplement"],
                    "severity": interaction["severity"],
                    "note": interaction["note"],
                })

        for biomarker, effect in info.get("affected_biomarkers", {}).items():
            biomarker_effects.append({
                "medication": med["name"],
                "biomarker": biomarker,
                "expected_effect": effect,
            })

    return {
        "med_supplement_interactions": med_supplement_interactions,
        "nutrient_depletions": nutrient_depletions,
        "biomarker_effects": biomarker_effects,
        "monitoring_notes": [
            {"medication": med["name"], "note": MEDICATION_DB[med["name"]]["monitoring_note"]}
            for med in meds if med["name"] in MEDICATION_DB
        ],
    }
