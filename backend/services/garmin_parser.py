import csv
from datetime import datetime

COLUMN_MAP = {
    "steps": ["Steps", "steps", "Total Steps", "Daily Steps"],
    "resting_hr": ["Resting HR", "Resting Heart Rate", "resting_hr", "RHR"],
    "sleep_hours": ["Sleep Hours", "Total Sleep", "sleep_hours", "Sleep Duration"],
    "active_calories": ["Active Calories", "Calories", "active_calories", "Calories Burned"],
    "workout_minutes": ["Active Minutes", "Workout Minutes", "workout_minutes", "Exercise Minutes"],
    "weight": ["Weight", "weight", "Body Weight", "Weight (kg)"],
    "body_fat": ["Body Fat", "body_fat", "Body Fat %", "Body Fat Percentage"],
}

UNIT_MAP = {
    "steps": "count",
    "resting_hr": "bpm",
    "sleep_hours": "hours",
    "active_calories": "kcal",
    "workout_minutes": "min",
    "weight": "kg",
    "body_fat": "%",
}

DATE_COLUMNS = ["Date", "date", "Day", "Summary Date"]


def _find_column(headers: list[str], variants: list[str]) -> str | None:
    header_lower = {h.lower().strip(): h for h in headers}
    for v in variants:
        if v.lower().strip() in header_lower:
            return header_lower[v.lower().strip()]
    return None


def _parse_date(date_str: str) -> str | None:
    date_str = date_str.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str if len(date_str) == 10 else None


def _parse_float(val: str) -> float | None:
    try:
        return float(val.strip().replace(",", ""))
    except (ValueError, TypeError, AttributeError):
        return None


def parse_garmin_csv(file_path: str) -> list[dict]:
    results = []

    with open(file_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        date_col = _find_column(headers, DATE_COLUMNS)
        if not date_col:
            return results

        metric_cols = {}
        for metric_type, variants in COLUMN_MAP.items():
            col = _find_column(headers, variants)
            if col:
                metric_cols[metric_type] = col

        for row in reader:
            date = _parse_date(row.get(date_col, ""))
            if not date:
                continue

            for metric_type, col_name in metric_cols.items():
                value = _parse_float(row.get(col_name, ""))
                if value is not None:
                    results.append({
                        "source": "garmin",
                        "date": date,
                        "metric_type": metric_type,
                        "value": round(value, 2),
                        "unit": UNIT_MAP.get(metric_type, ""),
                    })

    return results
