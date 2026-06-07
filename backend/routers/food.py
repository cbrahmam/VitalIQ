import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from config import REFERENCE_DATA_DIR
from database import get_db_connection
from models.schemas import FoodEntryCreate
from models.db_models import (
    insert_food_entry, get_food_log_by_date, get_food_log_range,
    get_daily_nutrition_summary, get_nutrition_trend, delete_food_entry,
)

router = APIRouter(prefix="/api/food", tags=["food"])

_food_db_path = Path(REFERENCE_DATA_DIR) / "food_nutrients.json"
with open(_food_db_path) as f:
    FOOD_DB = json.load(f)


@router.post("")
def add_food(data: FoodEntryCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    entry = data.model_dump()
    if entry["calories"] is None:
        db_food = FOOD_DB["common_foods"].get(entry["food_name"])
        if db_food:
            for field in ("calories", "protein_g", "carbs_g", "fat_g", "fiber_g"):
                if entry.get(field) is None:
                    entry[field] = db_food.get(field)
            if not entry.get("portion"):
                name = entry["food_name"]
                paren_start = name.find("(")
                if paren_start > 0:
                    entry["portion"] = name[paren_start + 1:name.find(")")].strip()

    entry_id = insert_food_entry(conn, entry)
    return {"id": entry_id, "status": "ok"}


@router.get("")
def list_food(date: str | None = None,
              start: str | None = None,
              end: str | None = None,
              conn: sqlite3.Connection = Depends(get_db_connection)):
    if date:
        entries = get_food_log_by_date(conn, date)
        summary = get_daily_nutrition_summary(conn, date)
        return {"entries": entries, "summary": summary}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    s = start or (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    e = end or today
    return {"entries": get_food_log_range(conn, s, e)}


@router.delete("/{entry_id}")
def remove_food(entry_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    if not delete_food_entry(conn, entry_id):
        raise HTTPException(status_code=404, detail="Food entry not found")
    return {"status": "ok"}


@router.get("/summary/{date}")
def daily_summary(date: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    entries = get_food_log_by_date(conn, date)
    summary = get_daily_nutrition_summary(conn, date)

    by_meal = {}
    for entry in entries:
        meal = entry["meal_type"]
        by_meal.setdefault(meal, {"items": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0})
        by_meal[meal]["items"].append(entry)
        by_meal[meal]["calories"] += entry.get("calories") or 0
        by_meal[meal]["protein"] += entry.get("protein_g") or 0
        by_meal[meal]["carbs"] += entry.get("carbs_g") or 0
        by_meal[meal]["fat"] += entry.get("fat_g") or 0

    return {"date": date, "totals": summary, "by_meal": by_meal}


@router.get("/trends")
def nutrition_trends(days: int = Query(default=7, ge=1, le=90),
                     conn: sqlite3.Connection = Depends(get_db_connection)):
    trend = get_nutrition_trend(conn, days)
    if not trend:
        return {"trend": [], "averages": {}}

    averages = {
        "avg_calories": round(sum(d["total_calories"] or 0 for d in trend) / len(trend), 0),
        "avg_protein": round(sum(d["total_protein"] or 0 for d in trend) / len(trend), 1),
        "avg_carbs": round(sum(d["total_carbs"] or 0 for d in trend) / len(trend), 1),
        "avg_fat": round(sum(d["total_fat"] or 0 for d in trend) / len(trend), 1),
        "avg_fiber": round(sum(d["total_fiber"] or 0 for d in trend) / len(trend), 1),
        "days_logged": len(trend),
    }
    return {"trend": trend, "averages": averages}


@router.get("/search")
def search_foods(q: str = Query(min_length=1)):
    q_lower = q.lower()
    results = [
        {"name": name, **info}
        for name, info in FOOD_DB["common_foods"].items()
        if q_lower in name.lower()
    ]
    return results


@router.get("/categories")
def food_categories():
    return FOOD_DB["categories"]
