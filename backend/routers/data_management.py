import json
import os
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from config import DATABASE_PATH
from database import get_db_connection
from models.db_models import (
    upsert_health_profile, get_health_profile,
    get_all_biomarkers_latest, get_active_supplements,
    get_wearable_latest, get_genetic_markers, get_goals,
    get_latest_insights, get_sync_status,
    insert_wearable_batch,
)

router = APIRouter(prefix="/api/data", tags=["data"])

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample-data"


@router.post("/load-sample")
def load_sample_data(conn: sqlite3.Connection = Depends(get_db_connection)):
    results = {}

    profile = get_health_profile(conn)
    if not profile:
        upsert_health_profile(conn, {
            "name": "Alex", "age": 30, "sex": "male",
            "height_cm": 180, "weight_kg": 77,
        })
        results["profile"] = "created"
    else:
        results["profile"] = "already exists"

    pdf_path = SAMPLE_DIR / "sample_bloodwork.pdf"
    if pdf_path.exists():
        existing = conn.execute("SELECT COUNT(*) FROM biomarkers").fetchone()[0]
        if existing > 0:
            results["bloodwork"] = f"already loaded ({existing} biomarkers)"
        else:
            try:
                from services.pdf_parser import parse_blood_work_pdf
                from services.biomarker_engine import classify_report_biomarkers
                from models.db_models import insert_blood_work_report, insert_biomarker
                parse_result = parse_blood_work_pdf(str(pdf_path))
                sex = "male"
                classified = classify_report_biomarkers(parse_result["biomarkers"], sex)
                report_id = insert_blood_work_report(
                    conn, parse_result["report_date"], parse_result["lab_name"],
                    "sample_bloodwork.pdf", parse_result["raw_text"],
                )
                for bm in classified:
                    insert_biomarker(conn, report_id, parse_result["report_date"],
                                    bm["name"], bm["value"], bm["unit"],
                                    bm["lab_reference_low"], bm["lab_reference_high"],
                                    bm["optimal_low"], bm["optimal_high"],
                                    bm["status"], bm["category"])
                conn.commit()
                results["bloodwork"] = f"{len(classified)} biomarkers"
            except Exception as e:
                results["bloodwork"] = f"error: {str(e)}"
    else:
        results["bloodwork"] = "sample file not found"

    from services.apple_health import parse_apple_health_export
    from services.whoop_parser import parse_whoop_csv
    from services.garmin_parser import parse_garmin_csv

    for source, parser, filename in [
        ("apple_health", parse_apple_health_export, "sample_apple_health.xml"),
        ("whoop", parse_whoop_csv, "sample_whoop.csv"),
        ("garmin", parse_garmin_csv, "sample_garmin.csv"),
    ]:
        path = SAMPLE_DIR / filename
        if path.exists():
            try:
                data = parser(str(path))
                imported, skipped = insert_wearable_batch(conn, data)
                results[source] = f"{imported} imported, {skipped} skipped"
            except Exception as e:
                results[source] = f"error: {str(e)}"
        else:
            results[source] = "sample file not found"

    from services.genetics_parser import parse_23andme_raw
    from models.db_models import upsert_genetic_marker, clear_genetic_markers
    genetics_path = SAMPLE_DIR / "sample_23andme.txt"
    if genetics_path.exists():
        try:
            parsed = parse_23andme_raw(str(genetics_path))
            clear_genetic_markers(conn)
            for marker in parsed:
                upsert_genetic_marker(
                    conn, marker["rsid"], marker["gene"], marker["genotype"],
                    marker["name"], marker["category"], marker["risk_level"],
                    marker["description"],
                )
            conn.commit()
            results["genetics"] = f"{len(parsed)} markers"
        except Exception as e:
            results["genetics"] = f"error: {str(e)}"
    else:
        results["genetics"] = "sample file not found"

    from services.health_engine.factory import get_engine
    try:
        engine = get_engine()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        from models.db_models import insert_insight, clear_insights_by_type

        for itype in ("BloodWorkInsight", "WearableTrendInsight", "CrossSourceCorrelation", "SupplementInsight"):
            clear_insights_by_type(conn, itype)

        insights_data = engine.generate_bloodwork_insights(conn)
        for ins in insights_data:
            insert_insight(conn, ins["insight_type"], ins["title"], ins["content"],
                          ins["severity"], ins.get("data_sources", []), now)

        wearable_insights = engine.generate_wearable_insights(conn)
        for ins in wearable_insights:
            insert_insight(conn, ins["insight_type"], ins["title"], ins["content"],
                          ins["severity"], ins.get("data_sources", []), now)

        corr_insights = engine.generate_cross_correlations(conn)
        for ins in corr_insights:
            insert_insight(conn, ins["insight_type"], ins["title"], ins["content"],
                          ins["severity"], ins.get("data_sources", []), now)

        supp_insights = engine.generate_supplement_insights(conn)
        for ins in supp_insights:
            insert_insight(conn, ins["insight_type"], ins["title"], ins["content"],
                          ins["severity"], ins.get("data_sources", []), now)

        conn.commit()
        total = len(insights_data) + len(wearable_insights) + len(corr_insights) + len(supp_insights)
        results["insights"] = f"{total} generated"
    except Exception as e:
        results["insights"] = f"error: {str(e)}"

    return {"status": "ok", "results": results}


@router.get("/export")
def export_all_data(conn: sqlite3.Connection = Depends(get_db_connection)):
    tables = ["health_profile", "blood_work_reports", "biomarkers",
              "wearable_data", "supplements", "supplement_history",
              "ai_insights", "genetic_markers", "health_goals"]
    data = {}
    for table in tables:
        rows = conn.execute(f"SELECT * FROM {table}").fetchall()
        data[table] = [dict(r) for r in rows]
    return data


@router.delete("/clear")
def clear_all_data(conn: sqlite3.Connection = Depends(get_db_connection)):
    tables = ["ai_insights", "health_goals", "genetic_markers",
              "supplement_history", "supplements", "biomarkers",
              "blood_work_reports", "wearable_data", "health_profile"]
    for table in tables:
        conn.execute(f"DELETE FROM {table}")
    conn.commit()
    return {"status": "ok", "message": "All data cleared"}


@router.delete("/clear/{source}")
def clear_source_data(source: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    if source == "bloodwork":
        conn.execute("DELETE FROM biomarkers")
        conn.execute("DELETE FROM blood_work_reports")
    elif source == "wearables":
        conn.execute("DELETE FROM wearable_data")
    elif source == "supplements":
        conn.execute("DELETE FROM supplement_history")
        conn.execute("DELETE FROM supplements")
    elif source == "genetics":
        conn.execute("DELETE FROM genetic_markers")
    elif source == "insights":
        conn.execute("DELETE FROM ai_insights")
    elif source == "goals":
        conn.execute("DELETE FROM health_goals")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")
    conn.commit()
    return {"status": "ok", "message": f"{source} data cleared"}


@router.get("/has-data")
def check_has_data(conn: sqlite3.Connection = Depends(get_db_connection)):
    profile = get_health_profile(conn)
    bm_count = conn.execute("SELECT COUNT(*) FROM biomarkers").fetchone()[0]
    w_count = conn.execute("SELECT COUNT(*) FROM wearable_data").fetchone()[0]
    s_count = conn.execute("SELECT COUNT(*) FROM supplements WHERE active = 1").fetchone()[0]
    g_count = conn.execute("SELECT COUNT(*) FROM genetic_markers").fetchone()[0]
    return {
        "has_profile": profile is not None,
        "has_bloodwork": bm_count > 0,
        "has_wearables": w_count > 0,
        "has_supplements": s_count > 0,
        "has_genetics": g_count > 0,
        "has_any": any([profile, bm_count, w_count, s_count, g_count]),
    }
