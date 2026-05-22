import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db_connection
from models.db_models import (
    get_health_profile, get_all_reports, get_wearable_latest,
    get_latest_insights, get_all_biomarkers_latest, get_biomarker_trend,
    get_active_supplements, get_wearable_period_averages, get_wearable_range,
)
from services.trend_analyzer import analyze_trend
from services.correlation_engine import find_correlations, find_biomarker_wearable_links
from services.health_engine.factory import get_engine
from services.biomarker_engine import get_biomarker_info, BIOMARKER_RANGES
from services.supplement_analyzer import SUPPLEMENT_DATA

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard(conn: sqlite3.Connection = Depends(get_db_connection)):
    engine = get_engine()

    profile = get_health_profile(conn)
    latest_metrics = get_wearable_latest(conn)
    metrics_map = {m["metric_type"]: m for m in latest_metrics}
    score = engine.compute_health_score(conn)
    insights = get_latest_insights(conn, limit=5)
    reports = get_all_reports(conn)
    supplements = get_active_supplements(conn)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    prev_week = (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%Y-%m-%d")

    metric_cards = []
    for metric_type, label, unit, icon in [
        ("resting_hr", "Resting HR", "bpm", "heart"),
        ("hrv", "HRV", "ms", "brain"),
        ("sleep_hours", "Sleep", "hrs", "moon"),
        ("steps", "Steps", "steps", "footprints"),
    ]:
        m = metrics_map.get(metric_type)
        if not m:
            continue

        current = get_wearable_period_averages(conn, metric_type, week_ago, today)
        previous = get_wearable_period_averages(conn, metric_type, prev_week, week_ago)

        trend_pct = 0
        if current["avg"] and previous["avg"] and previous["avg"] != 0:
            trend_pct = ((current["avg"] - previous["avg"]) / abs(previous["avg"])) * 100

        metric_cards.append({
            "metric": metric_type,
            "label": label,
            "value": m["value"],
            "unit": unit,
            "date": m["date"],
            "icon": icon,
            "avg_7day": round(current["avg"], 1) if current["avg"] else None,
            "trend_pct": round(trend_pct, 1),
        })

    daily_snapshot = None
    snapshot_insights = [i for i in insights if i["insight_type"] == "DailySnapshot"]
    if snapshot_insights:
        daily_snapshot = snapshot_insights[0]

    return {
        "profile": profile,
        "health_score": score,
        "metric_cards": metric_cards,
        "daily_snapshot": daily_snapshot,
        "recent_insights": [i for i in insights if i["insight_type"] != "DailySnapshot"][:5],
        "reports_count": len(reports),
        "supplements_count": len(supplements),
    }


@router.get("/trends/{metric_type}")
def get_trend(metric_type: str,
              days: int = Query(default=30, ge=7, le=365),
              conn: sqlite3.Connection = Depends(get_db_connection)):
    result = analyze_trend(conn, metric_type, days)
    if result["data_points"] == 0:
        raise HTTPException(status_code=404, detail=f"No data for metric: {metric_type}")
    return result


@router.get("/correlations")
def get_correlations(days: int = Query(default=30, ge=7, le=365),
                     conn: sqlite3.Connection = Depends(get_db_connection)):
    wearable_correlations = find_correlations(conn, days)
    biomarker_links = find_biomarker_wearable_links(conn)
    return {
        "wearable_correlations": wearable_correlations,
        "biomarker_links": biomarker_links,
    }


@router.get("/timeline")
def get_timeline(start: str | None = None, end: str | None = None,
                 conn: sqlite3.Connection = Depends(get_db_connection)):
    if not end:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not start:
        start = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")

    events = []

    # Blood work uploads
    reports = get_all_reports(conn)
    for r in reports:
        report_date = r.get("report_date") or r.get("upload_date", "")[:10]
        if start <= report_date <= end:
            events.append({
                "type": "bloodwork",
                "date": report_date,
                "title": f"Blood Work: {r.get('lab_name', 'Lab Report')}",
                "detail": f"{r['biomarker_count']} biomarkers analyzed",
                "severity": "info",
                "id": r["id"],
            })

    # Supplement changes
    from models.db_models import get_supplement_history
    supp_history = get_supplement_history(conn)
    for sh in supp_history:
        event_date = sh["date"][:10] if sh["date"] else ""
        if event_date and start <= event_date <= end:
            action_labels = {
                "started": "Started",
                "stopped": "Stopped",
                "changed_dose": "Dose Changed",
            }
            events.append({
                "type": "supplement",
                "date": event_date,
                "title": f"{action_labels.get(sh['action'], sh['action'])}: {sh['supplement_name']}",
                "detail": sh["new_value"] or sh["old_value"] or "",
                "severity": "info",
                "id": sh["id"],
            })

    # Insight events (significant ones)
    from models.db_models import get_insight_history
    all_insights = get_insight_history(conn, limit=100)
    seen_titles = set()
    for ins in all_insights:
        ins_date = ins["generated_at"][:10] if ins["generated_at"] else ""
        if ins_date and start <= ins_date <= end and ins["severity"] in ("warning", "critical"):
            if ins["title"] not in seen_titles:
                seen_titles.add(ins["title"])
                events.append({
                    "type": "insight",
                    "date": ins_date,
                    "title": ins["title"],
                    "detail": ins["content"][:120],
                    "severity": ins["severity"],
                    "id": ins["id"],
                })

    events.sort(key=lambda e: e["date"], reverse=True)
    return events


@router.get("/biomarkers/{name}/deep-dive")
def biomarker_deep_dive(name: str,
                        conn: sqlite3.Connection = Depends(get_db_connection)):
    info = get_biomarker_info(name)
    if not info:
        for bm_name, bm_info in BIOMARKER_RANGES.items():
            if name.lower() == bm_name.lower():
                info = bm_info
                name = bm_name
                break

    if not info:
        raise HTTPException(status_code=404, detail=f"Biomarker not found: {name}")

    trend = get_biomarker_trend(conn, name, limit=20)

    profile = get_health_profile(conn)
    sex = profile.get("sex", "male") if profile else "male"
    sex_key = sex if sex in ("male", "female") else "male"
    optimal_range = info["optimal_range"].get(sex_key, info["optimal_range"].get("male"))
    lab_range = info["lab_range"].get(sex_key, info["lab_range"].get("male"))

    supplements = get_active_supplements(conn)
    related_supplements = []
    for supp in supplements:
        supp_info = SUPPLEMENT_DATA.get(supp["name"])
        if supp_info and name in supp_info.get("relevant_biomarkers", []):
            related_supplements.append({
                "name": supp["name"],
                "dosage": supp["dosage"],
                "started_date": supp["started_date"][:10] if supp["started_date"] else None,
            })

    chart_data = []
    for point in trend:
        chart_data.append({
            "date": point["report_date"],
            "value": point["value"],
            "status": point["status"],
        })

    related_metrics = []
    affected_by = info.get("affected_by", [])
    keywords_to_metrics = {
        "exercise": "steps", "sleep": "sleep_hours",
        "stress": "hrv", "inflammation": "hrv",
    }
    for factor in affected_by:
        for keyword, metric in keywords_to_metrics.items():
            if keyword in factor.lower() and metric not in related_metrics:
                related_metrics.append(metric)

    return {
        "name": name,
        "unit": info.get("unit", ""),
        "category": info.get("category", "other"),
        "description": info.get("description", ""),
        "optimal_range": {"low": optimal_range[0], "high": optimal_range[1]},
        "lab_range": {"low": lab_range[0], "high": lab_range[1]},
        "current": trend[-1] if trend else None,
        "history": chart_data,
        "related_supplements": related_supplements,
        "related_metrics": related_metrics,
        "affected_by": affected_by,
        "suggested_supplements": info.get("related_supplements", []),
    }
