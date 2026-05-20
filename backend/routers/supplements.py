import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from database import get_db_connection
from models.schemas import SupplementCreate, SupplementUpdate
from models.db_models import (
    insert_supplement,
    get_active_supplements,
    get_supplement_by_id,
    update_supplement,
    deactivate_supplement,
    get_supplement_history,
)
from services.supplement_analyzer import check_interactions

router = APIRouter(prefix="/api/supplements", tags=["supplements"])


@router.post("")
def add_supplement(data: SupplementCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    supplement_id = insert_supplement(conn, data.model_dump())
    supplement = get_supplement_by_id(conn, supplement_id)
    active = get_active_supplements(conn)
    interactions = check_interactions(active)
    return {"supplement": supplement, "interactions": interactions}


@router.get("")
def list_supplements(conn: sqlite3.Connection = Depends(get_db_connection)):
    active = get_active_supplements(conn)
    interactions = check_interactions(active)
    return {"supplements": active, "interactions": interactions}


@router.put("/{supplement_id}")
def edit_supplement(supplement_id: str, data: SupplementUpdate,
                    conn: sqlite3.Connection = Depends(get_db_connection)):
    result = update_supplement(conn, supplement_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Supplement not found")
    active = get_active_supplements(conn)
    interactions = check_interactions(active)
    return {"supplement": result, "interactions": interactions}


@router.delete("/{supplement_id}")
def remove_supplement(supplement_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    success = deactivate_supplement(conn, supplement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Supplement not found")
    return {"message": "Supplement deactivated"}


@router.get("/history")
def supplement_history(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_supplement_history(conn)
