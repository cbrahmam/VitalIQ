import json
import re
from pathlib import Path

import fitz

from config import REFERENCE_DATA_DIR

_ranges_path = Path(REFERENCE_DATA_DIR) / "biomarker_ranges.json"
with open(_ranges_path) as f:
    _BIOMARKER_RANGES = json.load(f)

ALIAS_MAP: dict[str, str] = {}
for canonical, data in _BIOMARKER_RANGES.items():
    ALIAS_MAP[canonical.lower()] = canonical
    for alias in data.get("aliases", []):
        ALIAS_MAP[alias.lower()] = canonical


def normalize_biomarker_name(raw_name: str) -> str | None:
    cleaned = raw_name.strip()
    key = cleaned.lower()

    if key in ALIAS_MAP:
        return ALIAS_MAP[key]

    for prefix in ("serum ", "plasma ", "blood ", "s. ", "s."):
        if key.startswith(prefix):
            stripped = key[len(prefix):]
            if stripped in ALIAS_MAP:
                return ALIAS_MAP[stripped]

    for alias_key, canonical in ALIAS_MAP.items():
        if alias_key in key or key in alias_key:
            return canonical

    return None


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


LAB_PATTERNS = {
    "Thyrocare": r"(?i)thyrocare",
    "SRL Diagnostics": r"(?i)srl\s+diagnostics",
    "Dr Lal PathLabs": r"(?i)dr\.?\s*lal\s*path",
    "Metropolis": r"(?i)metropolis",
    "Quest Diagnostics": r"(?i)quest\s+diagnostics",
    "LabCorp": r"(?i)labcorp|laboratory\s+corporation",
}


def detect_lab(text: str) -> str | None:
    for lab_name, pattern in LAB_PATTERNS.items():
        if re.search(pattern, text):
            return lab_name
    return None


DATE_PATTERNS = [
    r"(?:Report|Collection|Sample|Test)\s*Date\s*[:\-]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
    r"(?:Report|Collection|Sample|Test)\s*Date\s*[:\-]?\s*(\d{1,2}\s+\w{3,9}\s+\d{2,4})",
    r"Date\s*[:\-]\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
    r"(\d{1,2}[/\-]\d{1,2}[/\-]\d{4})",
    r"(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})",
]


def extract_report_date(text: str) -> str | None:
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return None


BIOMARKER_PATTERNS = [
    # Pattern A: pipe-delimited (Indian labs like Thyrocare)
    re.compile(
        r"^(.+?)\s*\|\s*([\d.]+)\s*\|\s*(\S+)\s*\|\s*([\d.]+)\s*[-–]\s*([\d.]+)",
        re.MULTILINE,
    ),
    # Pattern B: name, value, unit, (ref_low - ref_high)
    re.compile(
        r"^(.+?)\s+([\d.]+)\s+(\S+)\s+\(?\s*([\d.]+)\s*[-–]\s*([\d.]+)\s*\)?",
        re.MULTILINE,
    ),
    # Pattern C: name, value, unit, ref_low - ref_high (no parens)
    re.compile(
        r"^(.+?)\s{2,}([\d.]+)\s+(\S+)\s+([\d.]+)\s*[-–]\s*([\d.]+)",
        re.MULTILINE,
    ),
    # Pattern D: tabular with extra whitespace
    re.compile(
        r"^(.+?)\s{3,}([\d.]+)\s{2,}(\S+)\s{2,}([\d.]+)\s*[-–]\s*([\d.]+)",
        re.MULTILINE,
    ),
]

# Pattern for lines without reference ranges
SIMPLE_PATTERN = re.compile(
    r"^(.+?)\s{2,}([\d.]+)\s+(\S+)\s*$",
    re.MULTILINE,
)


def _parse_float(s: str) -> float | None:
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def extract_biomarkers(text: str) -> list[dict]:
    found = {}

    for pattern in BIOMARKER_PATTERNS:
        for match in pattern.finditer(text):
            raw_name = match.group(1).strip()
            value = _parse_float(match.group(2))
            if value is None:
                continue

            canonical = normalize_biomarker_name(raw_name)
            if canonical is None or canonical in found:
                continue

            unit = match.group(3).strip()
            ref_low = _parse_float(match.group(4))
            ref_high = _parse_float(match.group(5))

            found[canonical] = {
                "name": canonical,
                "value": value,
                "unit": unit,
                "reference_low": ref_low,
                "reference_high": ref_high,
                "raw_text": match.group(0).strip(),
            }

    for match in SIMPLE_PATTERN.finditer(text):
        raw_name = match.group(1).strip()
        value = _parse_float(match.group(2))
        if value is None:
            continue

        canonical = normalize_biomarker_name(raw_name)
        if canonical is None or canonical in found:
            continue

        found[canonical] = {
            "name": canonical,
            "value": value,
            "unit": match.group(3).strip(),
            "reference_low": None,
            "reference_high": None,
            "raw_text": match.group(0).strip(),
        }

    return list(found.values())


def _assess_confidence(biomarkers: list[dict], text: str) -> str:
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return "low"
    count = len(biomarkers)
    if count >= 20:
        return "high"
    if count >= 10:
        return "medium"
    return "low"


def parse_blood_work_pdf(file_path: str) -> dict:
    try:
        raw_text = extract_text_from_pdf(file_path)
    except Exception as e:
        return {
            "report_date": None,
            "lab_name": None,
            "biomarkers": [],
            "parse_method": "pymupdf_regex",
            "parse_confidence": "low",
            "warnings": [f"Failed to extract text from PDF: {e}"],
            "raw_text": "",
        }

    lab_name = detect_lab(raw_text)
    report_date = extract_report_date(raw_text)
    biomarkers = extract_biomarkers(raw_text)
    confidence = _assess_confidence(biomarkers, raw_text)

    warnings = []
    if not report_date:
        warnings.append("Could not extract report date from PDF")
    if not lab_name:
        warnings.append("Could not identify lab name")
    if len(biomarkers) < 5:
        warnings.append(f"Only {len(biomarkers)} biomarkers extracted — parsing may be incomplete")

    return {
        "report_date": report_date,
        "lab_name": lab_name,
        "biomarkers": biomarkers,
        "parse_method": "pymupdf_regex",
        "parse_confidence": confidence,
        "warnings": warnings,
        "raw_text": raw_text,
    }
