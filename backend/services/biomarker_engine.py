import json
from pathlib import Path

from config import REFERENCE_DATA_DIR

_ranges_path = Path(REFERENCE_DATA_DIR) / "biomarker_ranges.json"
with open(_ranges_path) as f:
    BIOMARKER_RANGES = json.load(f)


def classify_biomarker(name: str, value: float, sex: str = "male") -> dict:
    ref = BIOMARKER_RANGES.get(name)
    if not ref:
        return {
            "status": "unknown",
            "optimal_low": None,
            "optimal_high": None,
            "lab_low": None,
            "lab_high": None,
            "category": "other",
        }

    sex_key = sex if sex in ("male", "female") else "male"
    lab_range = ref["lab_range"].get(sex_key, ref["lab_range"]["male"])
    optimal_range = ref["optimal_range"].get(sex_key, ref["optimal_range"]["male"])

    lab_low, lab_high = lab_range
    opt_low, opt_high = optimal_range

    if value < lab_low * 0.7 or value > lab_high * 1.3:
        status = "critical"
    elif value < lab_low or value > lab_high:
        status = "out_of_range"
    elif opt_low <= value <= opt_high:
        status = "optimal"
    else:
        status = "suboptimal"

    return {
        "status": status,
        "optimal_low": opt_low,
        "optimal_high": opt_high,
        "lab_low": lab_low,
        "lab_high": lab_high,
        "category": ref.get("category", "other"),
    }


def classify_report_biomarkers(biomarkers: list[dict], sex: str = "male") -> list[dict]:
    results = []
    for bm in biomarkers:
        classification = classify_biomarker(bm["name"], bm["value"], sex)
        results.append({
            **bm,
            "status": classification["status"],
            "optimal_low": classification["optimal_low"],
            "optimal_high": classification["optimal_high"],
            "lab_reference_low": bm.get("reference_low") or classification["lab_low"],
            "lab_reference_high": bm.get("reference_high") or classification["lab_high"],
            "category": classification["category"],
        })
    return results


def get_biomarker_info(name: str) -> dict | None:
    return BIOMARKER_RANGES.get(name)


def get_categories() -> list[str]:
    cats = set()
    for data in BIOMARKER_RANGES.values():
        cats.add(data.get("category", "other"))
    return sorted(cats)
