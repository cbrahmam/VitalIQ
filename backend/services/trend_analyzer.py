import math
import sqlite3
from datetime import datetime, timedelta, timezone

from models.db_models import get_wearable_range


def _linear_regression(xs: list[float], ys: list[float]) -> tuple[float, float]:
    n = len(xs)
    if n < 2:
        return 0.0, ys[0] if ys else 0.0
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_x2 = sum(x * x for x in xs)
    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return 0.0, sum_y / n
    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _std_dev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def _moving_average(values: list[float], window: int) -> list[float | None]:
    result = []
    for i in range(len(values)):
        if i < window - 1:
            result.append(None)
        else:
            result.append(sum(values[i - window + 1:i + 1]) / window)
    return result


def analyze_trend(conn: sqlite3.Connection, metric_type: str, days: int = 30) -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    data = get_wearable_range(conn, metric_type, start, today)

    if not data:
        return {
            "metric_type": metric_type,
            "period_days": days,
            "data_points": 0,
            "data": [],
        }

    values = [d["value"] for d in data]
    dates = [d["date"] for d in data]

    # x as day index for regression
    base_date = datetime.strptime(dates[0], "%Y-%m-%d")
    xs = [(datetime.strptime(d, "%Y-%m-%d") - base_date).days for d in dates]
    slope, intercept = _linear_regression([float(x) for x in xs], values)

    # trend direction based on slope relative to mean
    mean_val = sum(values) / len(values)
    weekly_change = slope * 7
    weekly_pct = (weekly_change / abs(mean_val) * 100) if mean_val != 0 else 0

    if abs(weekly_pct) < 2:
        direction = "stable"
    elif weekly_pct > 0:
        direction = "improving"
    else:
        direction = "declining"

    # higher_is_better metrics: HRV, steps, sleep_hours, vo2_max, spo2
    # lower_is_better metrics: resting_hr, body_fat
    lower_is_better = metric_type in ("resting_hr", "body_fat")
    if lower_is_better:
        if weekly_pct < -2:
            direction = "improving"
        elif weekly_pct > 2:
            direction = "declining"

    volatility = _std_dev(values)
    is_significant = len(values) >= 5 and abs(weekly_pct) > 3

    ma7 = _moving_average(values, min(7, len(values)))
    ma30 = _moving_average(values, min(30, len(values))) if len(values) >= 10 else [None] * len(values)

    avg_7 = sum(values[-7:]) / min(7, len(values)) if values else 0
    avg_30 = sum(values[-30:]) / min(30, len(values)) if values else 0

    chart_data = []
    for i, d in enumerate(data):
        point = {"date": d["date"], "value": d["value"]}
        if ma7[i] is not None:
            point["ma7"] = round(ma7[i], 2)
        if ma30[i] is not None:
            point["ma30"] = round(ma30[i], 2)
        chart_data.append(point)

    return {
        "metric_type": metric_type,
        "period_days": days,
        "data_points": len(values),
        "current_value": values[-1],
        "avg_7day": round(avg_7, 2),
        "avg_30day": round(avg_30, 2),
        "trend_direction": direction,
        "change_rate_per_week": round(weekly_pct, 2),
        "volatility": round(volatility, 2),
        "min_value": min(values),
        "max_value": max(values),
        "is_significant": is_significant,
        "data": chart_data,
    }
