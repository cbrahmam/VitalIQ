import json
from pathlib import Path

from config import REFERENCE_DATA_DIR

_interactions_path = Path(REFERENCE_DATA_DIR) / "supplement_interactions.json"
with open(_interactions_path) as f:
    SUPPLEMENT_DATA = json.load(f)


def check_interactions(supplements: list[dict]) -> list[dict]:
    active_names = {s["name"] for s in supplements}
    warnings = []

    for supp in supplements:
        info = SUPPLEMENT_DATA.get(supp["name"])
        if not info:
            continue

        for inhibited in info.get("inhibits_absorption", []):
            if inhibited in active_names:
                warnings.append({
                    "supplement_a": supp["name"],
                    "supplement_b": inhibited,
                    "interaction_type": "inhibits_absorption",
                    "recommendation": info.get("timing_note", f"Separate {supp['name']} and {inhibited} by 2+ hours."),
                })

        for enhanced in info.get("enhances_absorption", []):
            if enhanced in active_names:
                warnings.append({
                    "supplement_a": supp["name"],
                    "supplement_b": enhanced,
                    "interaction_type": "enhances_absorption",
                    "recommendation": f"{supp['name']} enhances absorption of {enhanced}. Consider taking together.",
                })

    seen = set()
    unique = []
    for w in warnings:
        key = tuple(sorted([w["supplement_a"], w["supplement_b"]])) + (w["interaction_type"],)
        if key not in seen:
            seen.add(key)
            unique.append(w)

    return unique


def get_supplement_info(name: str) -> dict | None:
    return SUPPLEMENT_DATA.get(name)
