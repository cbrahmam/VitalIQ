import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime

METRIC_MAP = {
    "HKQuantityTypeIdentifierRestingHeartRate": ("resting_hr", "bpm"),
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": ("hrv", "ms"),
    "HKQuantityTypeIdentifierStepCount": ("steps", "count"),
    "HKQuantityTypeIdentifierActiveEnergyBurned": ("active_calories", "kcal"),
    "HKQuantityTypeIdentifierBodyMass": ("weight", "kg"),
    "HKQuantityTypeIdentifierBodyFatPercentage": ("body_fat", "%"),
    "HKQuantityTypeIdentifierVO2Max": ("vo2_max", "mL/kg/min"),
    "HKQuantityTypeIdentifierRespiratoryRate": ("respiratory_rate", "breaths/min"),
    "HKQuantityTypeIdentifierOxygenSaturation": ("spo2", "%"),
    "HKQuantityTypeIdentifierAppleExerciseTime": ("workout_minutes", "min"),
}

SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis"

SLEEP_ASLEEP_VALUES = {
    "HKCategoryValueSleepAnalysisAsleepUnspecified",
    "HKCategoryValueSleepAnalysisAsleepCore",
    "HKCategoryValueSleepAnalysisAsleepDeep",
    "HKCategoryValueSleepAnalysisAsleepREM",
    "HKCategoryValueSleepAnalysisAsleep",
}

SUM_METRICS = {"steps", "active_calories", "workout_minutes"}
AVG_METRICS = {"resting_hr", "hrv", "respiratory_rate", "spo2"}
LATEST_METRICS = {"weight", "body_fat", "vo2_max"}


def _parse_date(date_str: str) -> str | None:
    for fmt in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str[:10] if len(date_str) >= 10 else None


def _parse_datetime(date_str: str) -> datetime | None:
    for fmt in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def parse_apple_health_export(file_path: str, since_date: str | None = None) -> list[dict]:
    raw: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    sleep_durations: dict[str, float] = defaultdict(float)

    context = ET.iterparse(file_path, events=("end",))

    for event, elem in context:
        if elem.tag == "Record":
            record_type = elem.get("type", "")
            start_date_str = elem.get("startDate", "")

            if since_date:
                record_date = _parse_date(start_date_str)
                if record_date and record_date < since_date:
                    elem.clear()
                    continue

            if record_type in METRIC_MAP:
                value_str = elem.get("value", "")
                try:
                    value = float(value_str)
                except (ValueError, TypeError):
                    elem.clear()
                    continue

                day = _parse_date(start_date_str)
                if day:
                    metric_type = METRIC_MAP[record_type][0]
                    raw[metric_type][day].append(value)

            elif record_type == SLEEP_TYPE:
                sleep_value = elem.get("value", "")
                if sleep_value in SLEEP_ASLEEP_VALUES:
                    start_dt = _parse_datetime(start_date_str)
                    end_dt = _parse_datetime(elem.get("endDate", ""))
                    if start_dt and end_dt:
                        duration_hours = (end_dt - start_dt).total_seconds() / 3600
                        sleep_day = start_dt.strftime("%Y-%m-%d")
                        sleep_durations[sleep_day] += duration_hours

            elem.clear()

    results = []

    for metric_type, daily_values in raw.items():
        unit = ""
        for hk_type, (mt, u) in METRIC_MAP.items():
            if mt == metric_type:
                unit = u
                break

        for day, values in daily_values.items():
            if metric_type in SUM_METRICS:
                agg_value = sum(values)
            elif metric_type in AVG_METRICS:
                agg_value = sum(values) / len(values)
            elif metric_type in LATEST_METRICS:
                agg_value = values[-1]
            else:
                agg_value = sum(values) / len(values)

            agg_value = round(agg_value, 2)
            results.append({
                "source": "apple_health",
                "date": day,
                "metric_type": metric_type,
                "value": agg_value,
                "unit": unit,
            })

    for day, hours in sleep_durations.items():
        results.append({
            "source": "apple_health",
            "date": day,
            "metric_type": "sleep_hours",
            "value": round(hours, 2),
            "unit": "hours",
        })

    return results
