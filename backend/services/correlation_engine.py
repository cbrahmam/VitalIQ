import math
import sqlite3
from datetime import datetime, timedelta, timezone

from models.db_models import get_wearable_range, get_all_biomarkers_latest
from services.biomarker_engine import get_biomarker_info

METRIC_PAIRS = [
    ("hrv", "sleep_hours", "HRV vs Sleep", "Better sleep quality often leads to higher HRV, indicating better autonomic recovery."),
    ("resting_hr", "active_calories", "Resting HR vs Activity", "Higher activity levels can improve cardiovascular fitness, lowering resting heart rate over time."),
    ("hrv", "steps", "HRV vs Steps", "Excessive activity without recovery can suppress HRV. A negative correlation may indicate overtraining."),
    ("sleep_hours", "steps", "Sleep vs Activity", "Adequate sleep supports higher activity levels. Poor sleep often correlates with reduced daily movement."),
    ("sleep_hours", "resting_hr", "Sleep vs Resting HR", "Better sleep typically correlates with lower resting heart rate."),
    ("hrv", "resting_hr", "HRV vs Resting HR", "HRV and resting HR are inversely related. Higher HRV with lower RHR indicates good cardiovascular health."),
    ("sleep_hours", "recovery_score", "Sleep vs Recovery", "Sleep is the primary driver of recovery. This shows how strongly your recovery tracks with sleep duration."),
    ("hrv", "recovery_score", "HRV vs Recovery", "HRV is a key component of recovery scoring. High correlation is expected."),
]


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 5:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
    den_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys))
    if den_x == 0 or den_y == 0:
        return None
    return num / (den_x * den_y)


def _strength(r: float) -> str:
    ar = abs(r)
    if ar >= 0.7:
        return "strong"
    if ar >= 0.4:
        return "moderate"
    return "weak"


def find_correlations(conn: sqlite3.Connection, days: int = 30) -> list[dict]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    metric_cache: dict[str, dict[str, float]] = {}

    def get_metric_by_date(metric: str) -> dict[str, float]:
        if metric not in metric_cache:
            data = get_wearable_range(conn, metric, start, today)
            metric_cache[metric] = {d["date"]: d["value"] for d in data}
        return metric_cache[metric]

    results = []

    for metric_a, metric_b, label, interpretation in METRIC_PAIRS:
        data_a = get_metric_by_date(metric_a)
        data_b = get_metric_by_date(metric_b)

        common_dates = sorted(set(data_a.keys()) & set(data_b.keys()))
        if len(common_dates) < 5:
            continue

        xs = [data_a[d] for d in common_dates]
        ys = [data_b[d] for d in common_dates]
        r = _pearson(xs, ys)
        if r is None:
            continue

        if abs(r) < 0.3:
            continue

        results.append({
            "metric_a": metric_a,
            "metric_b": metric_b,
            "label": label,
            "correlation_coefficient": round(r, 3),
            "direction": "positive" if r > 0 else "negative",
            "strength": _strength(r),
            "interpretation": interpretation,
            "data_points": len(common_dates),
            "chart_data": [
                {"date": d, metric_a: data_a[d], metric_b: data_b[d]}
                for d in common_dates
            ],
        })

    results.sort(key=lambda x: abs(x["correlation_coefficient"]), reverse=True)
    return results


def find_biomarker_wearable_links(conn: sqlite3.Connection) -> list[dict]:
    biomarkers = get_all_biomarkers_latest(conn)
    links = []

    for bm in biomarkers:
        if bm["status"] in ("optimal",):
            continue

        info = get_biomarker_info(bm["name"])
        if not info:
            continue

        affected_by = info.get("affected_by", [])
        related_metrics = []

        keywords_to_metrics = {
            "exercise": ["steps", "active_calories"],
            "sleep": ["sleep_hours"],
            "stress": ["hrv", "resting_hr"],
            "inflammation": ["hrv"],
        }

        for factor in affected_by:
            for keyword, metrics in keywords_to_metrics.items():
                if keyword in factor.lower():
                    related_metrics.extend(metrics)

        if related_metrics:
            links.append({
                "biomarker": bm["name"],
                "biomarker_status": bm["status"],
                "biomarker_value": bm["value"],
                "biomarker_unit": bm["unit"],
                "related_metrics": list(set(related_metrics)),
                "description": info.get("description", ""),
            })

    return links
