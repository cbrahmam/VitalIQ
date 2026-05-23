import sqlite3
from datetime import datetime, timezone

from models.db_models import (
    get_health_profile, get_all_biomarkers_latest, get_active_supplements,
    get_wearable_latest, get_genetic_markers, get_goals, get_latest_insights,
)
from services.biomarker_engine import get_biomarker_info
from services.health_engine.factory import get_engine

DISCLAIMER = (
    "DISCLAIMER: This report is for informational purposes only and does not constitute medical advice. "
    "Consult your healthcare provider before making any changes to your health regimen."
)


def generate_full_report(conn: sqlite3.Connection) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    profile = get_health_profile(conn)
    biomarkers = get_all_biomarkers_latest(conn)
    supplements = get_active_supplements(conn)
    wearables = get_wearable_latest(conn)
    genetics = get_genetic_markers(conn)
    goals = get_goals(conn, status="in_progress")
    insights = get_latest_insights(conn, limit=10)
    engine = get_engine()
    score = engine.compute_health_score(conn)

    lines = []
    lines.append("# VitalIQ Health Report")
    lines.append(f"Generated: {now}\n")
    lines.append(f"---\n")
    lines.append(DISCLAIMER)
    lines.append("")

    # Profile
    lines.append("## Health Profile")
    if profile:
        lines.append(f"- **Name**: {profile.get('name', '—')}")
        lines.append(f"- **Age**: {profile.get('age', '—')}")
        lines.append(f"- **Sex**: {profile.get('sex', '—')}")
        lines.append(f"- **Height**: {profile.get('height_cm', '—')} cm")
        lines.append(f"- **Weight**: {profile.get('weight_kg', '—')} kg")
    else:
        lines.append("No health profile set.")
    lines.append("")

    # Health Score
    lines.append("## Health Score")
    lines.append(f"**Overall: {score['score']}/100**")
    bd = score["breakdown"]
    lines.append(f"- Blood Work: {bd['bloodwork']}/40")
    lines.append(f"- Wearables: {bd['wearables']}/35")
    lines.append(f"- Supplements: {bd['supplements']}/25")
    lines.append("")

    # Biomarkers
    lines.append("## Current Biomarkers")
    if biomarkers:
        categories = {}
        for bm in biomarkers:
            cat = bm.get("category", "other")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(bm)

        for cat, items in sorted(categories.items()):
            lines.append(f"\n### {cat.replace('_', ' ').title()}")
            lines.append("| Biomarker | Value | Unit | Status |")
            lines.append("|-----------|-------|------|--------|")
            for bm in sorted(items, key=lambda x: x["name"]):
                lines.append(f"| {bm['name']} | {bm['value']} | {bm.get('unit', '')} | {bm['status']} |")
    else:
        lines.append("No blood work data available.")
    lines.append("")

    # Wearable Summary
    lines.append("## Latest Wearable Data")
    if wearables:
        lines.append("| Metric | Value | Unit | Date |")
        lines.append("|--------|-------|------|------|")
        for w in wearables:
            lines.append(f"| {w['metric_type']} | {w['value']:.1f} | {w.get('unit', '')} | {w['date']} |")
    else:
        lines.append("No wearable data available.")
    lines.append("")

    # Supplements
    lines.append("## Active Supplements")
    if supplements:
        lines.append("| Supplement | Dosage | Frequency | Time |")
        lines.append("|-----------|--------|-----------|------|")
        for s in supplements:
            lines.append(f"| {s['name']} | {s['dosage']} | {s['frequency']} | {s['time_of_day']} |")
    else:
        lines.append("No active supplements.")
    lines.append("")

    # Genetics
    if genetics:
        lines.append("## Genetic Markers")
        elevated = [g for g in genetics if g["risk_level"] == "elevated"]
        moderate = [g for g in genetics if g["risk_level"] == "moderate"]
        if elevated:
            lines.append("\n**Elevated Risk:**")
            for g in elevated:
                lines.append(f"- {g['gene']} ({g['rsid']}): {g['genotype']} — {g['description']}")
        if moderate:
            lines.append("\n**Moderate Risk:**")
            for g in moderate:
                lines.append(f"- {g['gene']} ({g['rsid']}): {g['genotype']} — {g['description']}")
        lines.append("")

    # Goals
    if goals:
        lines.append("## Active Goals")
        for g in goals:
            progress = ""
            if g.get("current_value") and g.get("target_value"):
                pct = (g["current_value"] / g["target_value"]) * 100
                progress = f" ({pct:.0f}% of target)"
            lines.append(f"- **{g['metric_type']}**: Target {g['target_value']}{progress}")
            if g.get("target_date"):
                lines.append(f"  Target date: {g['target_date']}")
        lines.append("")

    # Insights
    if insights:
        lines.append("## Key Insights")
        for i in insights:
            severity_icon = {"critical": "!!", "warning": "!", "info": "i", "positive": "+"}.get(i["severity"], "")
            lines.append(f"- [{severity_icon}] **{i['title']}**: {i['content']}")
        lines.append("")

    lines.append("---")
    lines.append(DISCLAIMER)

    return "\n".join(lines)


def generate_doctor_summary(conn: sqlite3.Connection) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    profile = get_health_profile(conn)
    biomarkers = get_all_biomarkers_latest(conn)

    lines = []
    lines.append("# Health Summary for Provider Review")
    lines.append(f"Date: {now}\n")

    if profile:
        lines.append(f"**Patient**: {profile.get('name', '—')}, Age {profile.get('age', '—')}, {profile.get('sex', '—')}")
        lines.append(f"Height: {profile.get('height_cm', '—')} cm, Weight: {profile.get('weight_kg', '—')} kg\n")

    abnormal = [bm for bm in biomarkers if bm["status"] in ("critical", "out_of_range")]
    suboptimal = [bm for bm in biomarkers if bm["status"] == "suboptimal"]

    if abnormal:
        lines.append("## Abnormal Results")
        lines.append("| Biomarker | Value | Unit | Status | Ref Range |")
        lines.append("|-----------|-------|------|--------|-----------|")
        for bm in abnormal:
            ref = f"{bm.get('lab_reference_low', '—')} - {bm.get('lab_reference_high', '—')}"
            lines.append(f"| {bm['name']} | {bm['value']} | {bm.get('unit', '')} | {bm['status']} | {ref} |")
        lines.append("")

    if suboptimal:
        lines.append("## Suboptimal Results")
        lines.append("| Biomarker | Value | Unit | Optimal Range |")
        lines.append("|-----------|-------|------|---------------|")
        for bm in suboptimal:
            opt = f"{bm.get('optimal_low', '—')} - {bm.get('optimal_high', '—')}"
            lines.append(f"| {bm['name']} | {bm['value']} | {bm.get('unit', '')} | {opt} |")
        lines.append("")

    supplements = get_active_supplements(conn)
    if supplements:
        lines.append("## Current Supplements")
        for s in supplements:
            lines.append(f"- {s['name']} {s['dosage']} ({s['frequency']}, {s['time_of_day']})")
        lines.append("")

    genetics = get_genetic_markers(conn)
    elevated_genetics = [g for g in genetics if g["risk_level"] == "elevated"]
    if elevated_genetics:
        lines.append("## Genetic Variants of Note")
        for g in elevated_genetics:
            lines.append(f"- {g['gene']} ({g['rsid']}): {g['genotype']} — {g['description']}")
        lines.append("")

    lines.append("---")
    lines.append("*Generated by VitalIQ. For informational purposes only.*")

    return "\n".join(lines)
