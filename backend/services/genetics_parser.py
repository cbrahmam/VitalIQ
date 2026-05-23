import csv
import json
from pathlib import Path

from config import REFERENCE_DATA_DIR

_snp_path = Path(REFERENCE_DATA_DIR) / "snp_database.json"


def _load_snp_db() -> dict:
    with open(_snp_path) as f:
        return json.load(f)


def parse_23andme_raw(file_path: str) -> list[dict]:
    snp_db = _load_snp_db()
    results = []

    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            parts = line.split("\t")
            if len(parts) < 4:
                continue

            rsid = parts[0].strip()
            genotype = parts[3].strip().upper()

            if rsid not in snp_db:
                continue

            snp = snp_db[rsid]
            variant_info = snp.get("variants", {}).get(genotype)

            if not variant_info:
                sorted_gt = "".join(sorted(genotype))
                variant_info = snp["variants"].get(sorted_gt)

            if not variant_info:
                for var_gt, var_info in snp["variants"].items():
                    if set(var_gt) == set(genotype):
                        variant_info = var_info
                        break

            if not variant_info:
                variant_info = {"risk": "unknown", "description": f"Genotype {genotype} not in database for {snp['name']}"}

            risk = variant_info["risk"]
            supp_impl = snp.get("supplement_implications", {}).get(risk)

            results.append({
                "rsid": rsid,
                "gene": snp["gene"],
                "name": snp["name"],
                "genotype": genotype,
                "category": snp["category"],
                "risk_level": risk,
                "description": variant_info["description"],
                "affected_biomarkers": snp.get("affected_biomarkers", []),
                "supplement_implication": supp_impl,
            })

    return results


def get_genetic_implications(markers: list[dict], biomarkers: list[dict]) -> list[dict]:
    bm_by_name = {bm["name"]: bm for bm in biomarkers}
    implications = []

    for marker in markers:
        if marker["risk_level"] in ("normal", "unknown", "protective"):
            continue

        for bm_name in marker.get("affected_biomarkers", []):
            bm = bm_by_name.get(bm_name)

            implication = {
                "rsid": marker["rsid"],
                "gene": marker["gene"],
                "genotype": marker["genotype"],
                "risk_level": marker["risk_level"],
                "biomarker": bm_name,
                "biomarker_value": bm["value"] if bm else None,
                "biomarker_status": bm["status"] if bm else None,
                "implication": "",
                "supplement_recommendation": marker.get("supplement_implication"),
            }

            if bm and bm["status"] in ("suboptimal", "out_of_range", "critical"):
                implication["implication"] = (
                    f"Your {marker['gene']} {marker['genotype']} variant ({marker['risk_level']} risk) "
                    f"may be contributing to your {bm_name} level of {bm['value']} {bm.get('unit', '')} "
                    f"({bm['status']}). {marker['description']}"
                )
            elif bm:
                implication["implication"] = (
                    f"You have a {marker['gene']} {marker['genotype']} variant ({marker['risk_level']} risk) "
                    f"that affects {bm_name}. Current level: {bm['value']} {bm.get('unit', '')} ({bm['status']}). "
                    f"Continue monitoring. {marker['description']}"
                )
            else:
                implication["implication"] = (
                    f"Your {marker['gene']} {marker['genotype']} variant ({marker['risk_level']} risk) "
                    f"affects {bm_name}. No blood work data available for this biomarker yet. "
                    f"Consider testing. {marker['description']}"
                )

            implications.append(implication)

    return implications
