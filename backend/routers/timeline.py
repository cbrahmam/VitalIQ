import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from database import get_db_connection
from models.db_models import (
    get_all_reports, get_supplement_history, get_insight_history,
    get_medication_history, get_symptoms_range, get_food_log_range,
    get_goals,
)

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("")
def get_full_timeline(start: str | None = None,
                      end: str | None = None,
                      types: str | None = None,
                      conn: sqlite3.Connection = Depends(get_db_connection)):
    if not end:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not start:
        start = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")

    filter_types = set(types.split(",")) if types else None
    events = []

    if not filter_types or "bloodwork" in filter_types:
        for r in get_all_reports(conn):
            d = r.get("report_date") or r.get("upload_date", "")[:10]
            if d and start <= d <= end:
                events.append({
                    "type": "bloodwork", "date": d, "icon": "flask",
                    "title": f"Blood Work: {r.get('lab_name', 'Lab Report')}",
                    "detail": f"{r['biomarker_count']} biomarkers analyzed",
                    "severity": "info", "id": r["id"],
                })

    if not filter_types or "supplement" in filter_types:
        for sh in get_supplement_history(conn):
            d = sh["date"][:10] if sh["date"] else ""
            if d and start <= d <= end:
                labels = {"started": "Started", "stopped": "Stopped", "changed_dose": "Dose Changed"}
                events.append({
                    "type": "supplement", "date": d, "icon": "pill",
                    "title": f"{labels.get(sh['action'], sh['action'])}: {sh['supplement_name']}",
                    "detail": sh["new_value"] or sh["old_value"] or "",
                    "severity": "info", "id": sh["id"],
                })

    if not filter_types or "medication" in filter_types:
        for mh in get_medication_history(conn):
            d = mh["date"][:10] if mh["date"] else ""
            if d and start <= d <= end:
                labels = {"started": "Started", "stopped": "Stopped", "changed_dose": "Dose Changed"}
                events.append({
                    "type": "medication", "date": d, "icon": "pill-bottle",
                    "title": f"Medication {labels.get(mh['action'], mh['action'])}: {mh['medication_name']}",
                    "detail": mh["new_value"] or mh["old_value"] or "",
                    "severity": "info", "id": mh["id"],
                })

    if not filter_types or "insight" in filter_types:
        seen_titles = set()
        for ins in get_insight_history(conn, limit=100):
            d = ins["generated_at"][:10] if ins["generated_at"] else ""
            if d and start <= d <= end and ins["severity"] in ("warning", "critical"):
                if ins["title"] not in seen_titles:
                    seen_titles.add(ins["title"])
                    events.append({
                        "type": "insight", "date": d, "icon": "brain",
                        "title": ins["title"],
                        "detail": ins["content"][:120],
                        "severity": ins["severity"], "id": ins["id"],
                    })

    if not filter_types or "symptom" in filter_types:
        symptoms = get_symptoms_range(conn, start, end)
        symptom_by_date = {}
        for s in symptoms:
            symptom_by_date.setdefault(s["date"], []).append(s)
        for d, entries in symptom_by_date.items():
            worst = max(entries, key=lambda e: e["severity"])
            names = list(set(e["symptom"] for e in entries))
            severity = "critical" if worst["severity"] >= 8 else "warning" if worst["severity"] >= 5 else "info"
            events.append({
                "type": "symptom", "date": d, "icon": "thermometer",
                "title": f"Symptoms: {', '.join(names[:3])}" + (f" +{len(names)-3}" if len(names) > 3 else ""),
                "detail": f"Worst severity: {worst['severity']}/10",
                "severity": severity, "id": worst["id"],
            })

    if not filter_types or "food" in filter_types:
        food = get_food_log_range(conn, start, end)
        food_by_date = {}
        for f in food:
            food_by_date.setdefault(f["date"], []).append(f)
        for d, entries in food_by_date.items():
            cals = sum(e.get("calories") or 0 for e in entries)
            events.append({
                "type": "food", "date": d, "icon": "utensils",
                "title": f"Nutrition: {len(entries)} items logged",
                "detail": f"{int(cals)} calories" if cals else f"{len(entries)} items",
                "severity": "info", "id": entries[0]["id"],
            })

    if not filter_types or "goal" in filter_types:
        for g in get_goals(conn):
            if g["status"] in ("achieved", "missed"):
                d = g.get("started_at", "")[:10]
                if d and start <= d <= end:
                    events.append({
                        "type": "goal", "date": d, "icon": "target",
                        "title": f"Goal {g['status'].title()}: {g['metric_type']}",
                        "detail": f"Target: {g['target_value']}",
                        "severity": "positive" if g["status"] == "achieved" else "warning",
                        "id": g["id"],
                    })

    events.sort(key=lambda e: e["date"], reverse=True)
    return {"events": events, "start": start, "end": end, "count": len(events)}
