import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db_connection
from models.schemas import SymptomCreate
from models.db_models import (
    insert_symptom, get_symptoms_by_date, get_symptoms_range,
    get_symptom_summary, delete_symptom,
    get_wearable_range, get_all_biomarkers_latest,
    get_active_supplements, get_active_medications,
)

router = APIRouter(prefix="/api/symptoms", tags=["symptoms"])

COMMON_SYMPTOMS = [
    "Fatigue", "Brain Fog", "Headache", "Joint Pain", "Muscle Soreness",
    "Poor Sleep", "Anxiety", "Low Mood", "Bloating", "Nausea",
    "Dizziness", "Heart Palpitations", "Shortness of Breath",
    "Skin Issues", "Hair Loss", "Cold Hands/Feet", "Night Sweats",
    "Low Libido", "Irritability", "Difficulty Concentrating",
]


@router.post("")
def add_symptom(data: SymptomCreate, conn: sqlite3.Connection = Depends(get_db_connection)):
    if not 1 <= data.severity <= 10:
        raise HTTPException(status_code=400, detail="Severity must be 1-10")
    symptom_id = insert_symptom(conn, data.model_dump())
    return {"id": symptom_id, "status": "ok"}


@router.get("")
def list_symptoms(date: str | None = None,
                  start: str | None = None,
                  end: str | None = None,
                  conn: sqlite3.Connection = Depends(get_db_connection)):
    if date:
        return get_symptoms_by_date(conn, date)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    s = start or (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    e = end or today
    return get_symptoms_range(conn, s, e)


@router.delete("/{symptom_id}")
def remove_symptom(symptom_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    if not delete_symptom(conn, symptom_id):
        raise HTTPException(status_code=404, detail="Symptom entry not found")
    return {"status": "ok"}


@router.get("/summary")
def symptom_summary(days: int = Query(default=30, ge=7, le=365),
                    conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_symptom_summary(conn, days)


@router.get("/common")
def common_symptoms():
    return COMMON_SYMPTOMS


@router.get("/correlations")
def symptom_correlations(days: int = Query(default=30, ge=7, le=90),
                         conn: sqlite3.Connection = Depends(get_db_connection)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    symptoms = get_symptoms_range(conn, start, today)

    if not symptoms:
        return {"correlations": [], "patterns": []}

    symptom_by_date = {}
    for s in symptoms:
        symptom_by_date.setdefault(s["date"], []).append(s)

    wearable_metrics = ["sleep_hours", "hrv", "resting_hr", "steps"]
    wearable_by_date = {}
    for metric in wearable_metrics:
        data = get_wearable_range(conn, metric, start, today)
        for d in data:
            wearable_by_date.setdefault(d["date"], {})[metric] = d["value"]

    correlations = []
    for symptom_name in set(s["symptom"] for s in symptoms):
        symptom_dates = {
            d: max(e["severity"] for e in entries if e["symptom"] == symptom_name)
            for d, entries in symptom_by_date.items()
            if any(e["symptom"] == symptom_name for e in entries)
        }

        for metric in wearable_metrics:
            paired = [
                (symptom_dates[d], wearable_by_date[d][metric])
                for d in symptom_dates
                if d in wearable_by_date and metric in wearable_by_date[d]
            ]
            if len(paired) < 5:
                continue

            sev_vals = [p[0] for p in paired]
            met_vals = [p[1] for p in paired]
            r = _pearson(sev_vals, met_vals)
            if r is not None and abs(r) > 0.3:
                direction = "worse when" if r > 0 else "better when"
                if metric in ("sleep_hours", "hrv", "steps"):
                    direction = "worse when" if r < 0 else "better when"
                    r = -r

                correlations.append({
                    "symptom": symptom_name,
                    "metric": metric,
                    "correlation": round(r, 2),
                    "data_points": len(paired),
                    "insight": f"{symptom_name} tends to be {direction} {_metric_label(metric)} is {'low' if r > 0 else 'high'}",
                })

    patterns = _find_patterns(symptom_by_date)
    correlations.sort(key=lambda c: abs(c["correlation"]), reverse=True)

    return {"correlations": correlations, "patterns": patterns}


def _pearson(x, y):
    n = len(x)
    if n < 3:
        return None
    mx = sum(x) / n
    my = sum(y) / n
    num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
    dx = (sum((xi - mx) ** 2 for xi in x)) ** 0.5
    dy = (sum((yi - my) ** 2 for yi in y)) ** 0.5
    if dx == 0 or dy == 0:
        return None
    return num / (dx * dy)


def _metric_label(metric):
    return {
        "sleep_hours": "sleep",
        "hrv": "HRV",
        "resting_hr": "heart rate",
        "steps": "activity",
    }.get(metric, metric)


def _find_patterns(symptom_by_date):
    patterns = []
    all_symptoms = {}
    for date, entries in symptom_by_date.items():
        for e in entries:
            all_symptoms.setdefault(e["symptom"], []).append(date)

    for symptom, dates in all_symptoms.items():
        if len(dates) < 3:
            continue
        from datetime import datetime as dt
        parsed = sorted(dt.strptime(d, "%Y-%m-%d") for d in dates)
        weekdays = [d.weekday() for d in parsed]
        from collections import Counter
        day_counts = Counter(weekdays)
        most_common_day, count = day_counts.most_common(1)[0]
        if count >= 3 and count / len(dates) > 0.4:
            day_name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][most_common_day]
            patterns.append({
                "symptom": symptom,
                "pattern": "day_of_week",
                "detail": f"{symptom} occurs most often on {day_name}s ({count}/{len(dates)} occurrences)",
            })

        times = [e.get("time_of_day") for entries in symptom_by_date.values()
                 for e in entries if e["symptom"] == symptom and e.get("time_of_day")]
        if times:
            time_counts = Counter(times)
            most_common_time, t_count = time_counts.most_common(1)[0]
            if t_count >= 3 and t_count / len(times) > 0.5:
                patterns.append({
                    "symptom": symptom,
                    "pattern": "time_of_day",
                    "detail": f"{symptom} occurs most often in the {most_common_time} ({t_count}/{len(times)} occurrences)",
                })

    return patterns
