import sqlite3
from fastapi import APIRouter, Depends, HTTPException

from database import get_db_connection
from models.db_models import (
    insert_insight, get_latest_insights, get_insight_history,
    dismiss_insight as db_dismiss_insight, clear_insights_by_type,
    now_iso, get_health_profile,
)
from models.schemas import (
    GenerateInsightsRequest, HealthInsightsResponse, HealthScoreResponse,
    HealthScoreBreakdown, InsightResponse, AskQuestionRequest, AskQuestionResponse,
)
from services.health_engine.factory import get_engine

router = APIRouter(prefix="/api/insights", tags=["insights"])

DISCLAIMER = (
    "These insights are for informational purposes only. "
    "Consult your healthcare provider before making any changes to your health regimen."
)


def _store_insights(conn: sqlite3.Connection, insights: list[dict], generated_at: str) -> list[dict]:
    stored = []
    for insight in insights:
        insight_id = insert_insight(
            conn,
            insight["insight_type"],
            insight["title"],
            insight["content"],
            insight["severity"],
            insight["data_sources"],
            generated_at,
        )
        stored.append({
            "id": insight_id,
            "insight_type": insight["insight_type"],
            "title": insight["title"],
            "content": insight["content"],
            "severity": insight["severity"],
            "data_sources": insight["data_sources"],
            "generated_at": generated_at,
            "dismissed": False,
        })
    conn.commit()
    return stored


@router.post("/generate", response_model=HealthInsightsResponse)
def generate_insights(body: GenerateInsightsRequest = GenerateInsightsRequest(),
                      conn: sqlite3.Connection = Depends(get_db_connection)):
    if not body.force:
        existing = get_latest_insights(conn, limit=1)
        if existing:
            from datetime import datetime, timezone, timedelta
            last = datetime.fromisoformat(existing[0]["generated_at"])
            if datetime.now(timezone.utc) - last < timedelta(minutes=5):
                all_insights = get_latest_insights(conn)
                engine = get_engine()
                score = engine.compute_health_score(conn)
                action_items = _build_action_items(all_insights)
                return HealthInsightsResponse(
                    health_score=HealthScoreResponse(
                        score=score["score"],
                        breakdown=HealthScoreBreakdown(**score["breakdown"]),
                        factors=score["factors"],
                    ),
                    insights=[InsightResponse(**i) for i in all_insights],
                    action_items=action_items,
                    generated_at=existing[0]["generated_at"],
                    disclaimer=DISCLAIMER,
                )

    engine = get_engine()
    profile = get_health_profile(conn)
    sex = profile.get("sex", "male") if profile else "male"
    generated_at = now_iso()

    for itype in ("BloodWorkInsight", "WearableTrendInsight", "CrossSourceCorrelation",
                   "SupplementInsight", "DailySnapshot"):
        clear_insights_by_type(conn, itype)

    all_raw = []
    all_raw.extend(engine.generate_bloodwork_insights(conn, sex))
    all_raw.extend(engine.generate_wearable_insights(conn))
    all_raw.extend(engine.generate_cross_correlations(conn))
    all_raw.extend(engine.generate_supplement_insights(conn))
    all_raw.extend(engine.generate_daily_snapshot(conn))

    stored = _store_insights(conn, all_raw, generated_at)
    score = engine.compute_health_score(conn)
    action_items = _build_action_items(stored)

    return HealthInsightsResponse(
        health_score=HealthScoreResponse(
            score=score["score"],
            breakdown=HealthScoreBreakdown(**score["breakdown"]),
            factors=score["factors"],
        ),
        insights=[InsightResponse(**i) for i in stored],
        action_items=action_items,
        generated_at=generated_at,
        disclaimer=DISCLAIMER,
    )


@router.post("/daily")
def generate_daily(conn: sqlite3.Connection = Depends(get_db_connection)):
    engine = get_engine()
    generated_at = now_iso()
    clear_insights_by_type(conn, "DailySnapshot")
    snapshots = engine.generate_daily_snapshot(conn)
    stored = _store_insights(conn, snapshots, generated_at)
    return {"insights": stored, "generated_at": generated_at}


@router.get("/latest")
def latest_insights(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_latest_insights(conn)


@router.get("/history")
def insight_history(type: str | None = None,
                    conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_insight_history(conn, insight_type=type)


@router.post("/dismiss/{insight_id}")
def dismiss(insight_id: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    if not db_dismiss_insight(conn, insight_id):
        raise HTTPException(status_code=404, detail="Insight not found")
    return {"ok": True}


@router.post("/ask", response_model=AskQuestionResponse)
def ask_question(body: AskQuestionRequest,
                 conn: sqlite3.Connection = Depends(get_db_connection)):
    engine = get_engine()
    result = engine.answer_question(conn, body.question)
    return AskQuestionResponse(**result)


def _build_action_items(insights: list[dict]) -> list[dict]:
    items = []
    priority_order = {"critical": 0, "warning": 1, "info": 2, "positive": 3}

    for insight in insights:
        severity = insight.get("severity", "info")
        if severity in ("critical", "warning"):
            items.append({
                "priority": severity,
                "text": insight["title"],
                "category": insight["insight_type"],
            })

    items.sort(key=lambda x: priority_order.get(x["priority"], 4))
    return items[:10]
