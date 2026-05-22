import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import REFERENCE_DATA_DIR
from models.db_models import (
    get_all_biomarkers_latest, get_biomarker_trend, get_wearable_latest,
    get_wearable_period_averages, get_active_supplements, get_supplement_history,
)
from services.biomarker_engine import BIOMARKER_RANGES, get_biomarker_info
from services.supplement_analyzer import SUPPLEMENT_DATA, check_interactions
from .base import HealthAnalysisEngine

_corr_path = Path(REFERENCE_DATA_DIR) / "cross_correlations.json"
with open(_corr_path) as f:
    CROSS_CORRELATIONS = json.load(f)

_weights_path = Path(REFERENCE_DATA_DIR) / "health_score_weights.json"
with open(_weights_path) as f:
    SCORE_WEIGHTS = json.load(f)

DISCLAIMER = (
    "These insights are for informational purposes only. "
    "Consult your healthcare provider before making any changes to your health regimen."
)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).strftime("%Y-%m-%d")


def _trend_direction(values: list[float]) -> str:
    if len(values) < 2:
        return "new"
    first, last = values[0], values[-1]
    if len(values) >= 3:
        mid = values[len(values) // 2]
        if last > first * 1.05 and last > mid:
            return "improving"
        if last < first * 0.95 and last < mid:
            return "declining"
    else:
        if last > first * 1.05:
            return "improving"
        if last < first * 0.95:
            return "declining"
    return "stable"


def _severity_for_status(status: str) -> str:
    return {
        "critical": "critical",
        "out_of_range": "warning",
        "suboptimal": "info",
        "optimal": "positive",
    }.get(status, "info")


def _priority_for_status(status: str) -> str:
    return {
        "critical": "action_required",
        "out_of_range": "action_required",
        "suboptimal": "monitor",
        "optimal": "optimal",
    }.get(status, "monitor")


class RuleBasedEngine(HealthAnalysisEngine):

    def generate_bloodwork_insights(self, conn: sqlite3.Connection, sex: str = "male") -> list[dict]:
        biomarkers = get_all_biomarkers_latest(conn)
        insights = []

        for bm in biomarkers:
            name = bm["name"]
            status = bm["status"]
            value = bm["value"]
            unit = bm["unit"]

            if status == "optimal":
                continue

            info = get_biomarker_info(name)
            trend_data = get_biomarker_trend(conn, name, 5)
            trend_values = [t["value"] for t in trend_data]
            trend = _trend_direction(trend_values)

            prev_value = trend_values[-2] if len(trend_values) >= 2 else None

            description = info["description"] if info else ""
            related_supps = info.get("related_supplements", []) if info else []
            affected_by = info.get("affected_by", []) if info else []

            if status == "critical":
                explanation = f"{name} at {value} {unit} is critically {'low' if bm.get('lab_reference_low') and value < bm['lab_reference_low'] else 'high'}. {description}"
                recommendation = f"Consult your healthcare provider about {name}."
                if related_supps:
                    recommendation += f" Related supplements: {', '.join(related_supps)}."
            elif status == "out_of_range":
                direction = "below" if bm.get("lab_reference_low") and value < bm["lab_reference_low"] else "above"
                explanation = f"{name} at {value} {unit} is {direction} the reference range. {description}"
                recommendation = f"Consider addressing {name} levels."
                if related_supps:
                    recommendation += f" Supplements that may help: {', '.join(related_supps)}."
                if affected_by:
                    recommendation += f" Also affected by: {', '.join(affected_by)}."
            else:
                explanation = f"{name} at {value} {unit} is outside the optimal range but within reference limits. {description}"
                recommendation = f"Consider optimizing {name}."
                if related_supps:
                    recommendation += f" Related supplements: {', '.join(related_supps)}."

            trend_note = ""
            if trend == "improving" and prev_value:
                trend_note = f" Trending up from {prev_value} {unit}."
            elif trend == "declining" and prev_value:
                trend_note = f" Trending down from {prev_value} {unit}."

            insights.append({
                "insight_type": "BloodWorkInsight",
                "title": f"{name}: {status.replace('_', ' ').title()}",
                "content": explanation + trend_note,
                "severity": _severity_for_status(status),
                "data_sources": ["bloodwork"],
                "meta": {
                    "biomarker": name,
                    "value": value,
                    "unit": unit,
                    "status": status,
                    "trend": trend,
                    "previous_value": prev_value,
                    "priority": _priority_for_status(status),
                    "recommendation": recommendation,
                },
            })

        insights.sort(key=lambda x: {"critical": 0, "warning": 1, "info": 2, "positive": 3}.get(x["severity"], 4))
        return insights

    def generate_wearable_insights(self, conn: sqlite3.Connection) -> list[dict]:
        today = _today()
        week_ago = _days_ago(7)
        two_weeks_ago = _days_ago(14)
        insights = []

        metrics_config = {
            "resting_hr": {"label": "Resting Heart Rate", "unit": "bpm", "higher_bad": True,
                           "high_msg": "Elevated resting HR may indicate stress, poor recovery, or overtraining.",
                           "low_msg": "Your resting HR is in a great range, indicating good cardiovascular fitness."},
            "hrv": {"label": "Heart Rate Variability", "unit": "ms", "higher_bad": False,
                    "high_msg": "Strong HRV indicates good recovery and parasympathetic activity.",
                    "low_msg": "Low HRV may indicate stress, poor sleep, or overtraining. Prioritize recovery."},
            "steps": {"label": "Daily Steps", "unit": "steps", "higher_bad": False,
                      "high_msg": "Great activity levels! Keep it up.",
                      "low_msg": "Activity levels have dropped. Try to increase daily movement."},
            "sleep_hours": {"label": "Sleep Duration", "unit": "hours", "higher_bad": False,
                            "high_msg": "Good sleep duration. Consistency is key.",
                            "low_msg": "Below recommended 7-9 hours. Prioritize sleep hygiene."},
        }

        for metric, config in metrics_config.items():
            current = get_wearable_period_averages(conn, metric, week_ago, today)
            previous = get_wearable_period_averages(conn, metric, two_weeks_ago, week_ago)

            if current["count"] == 0:
                continue

            curr_avg = current["avg"]
            prev_avg = previous["avg"] if previous["count"] > 0 else None

            if prev_avg and prev_avg != 0:
                change_pct = ((curr_avg - prev_avg) / abs(prev_avg)) * 100
            else:
                change_pct = 0

            is_concerning = abs(change_pct) > 10
            if config["higher_bad"]:
                is_worsening = change_pct > 10
            else:
                is_worsening = change_pct < -10

            if not is_concerning and prev_avg:
                continue

            if is_worsening:
                severity = "warning"
                direction = "worsening"
                explanation = config["high_msg"] if config["higher_bad"] else config["low_msg"]
            elif is_concerning:
                severity = "positive"
                direction = "improving"
                explanation = config["low_msg"] if config["higher_bad"] else config["high_msg"]
            else:
                severity = "info"
                direction = "stable"
                explanation = f"Your {config['label']} is stable at {curr_avg:.1f} {config['unit']}."

            content = f"7-day average: {curr_avg:.1f} {config['unit']}."
            if prev_avg:
                content += f" Previous 7-day: {prev_avg:.1f} {config['unit']} ({change_pct:+.1f}%)."
            content += f" {explanation}"

            insights.append({
                "insight_type": "WearableTrendInsight",
                "title": f"{config['label']}: {direction.title()}",
                "content": content,
                "severity": severity,
                "data_sources": ["wearables"],
                "meta": {
                    "metric": metric,
                    "trend_direction": direction,
                    "current_avg": round(curr_avg, 1),
                    "previous_avg": round(prev_avg, 1) if prev_avg else None,
                    "change_percent": round(change_pct, 1),
                },
            })

        return insights

    def generate_cross_correlations(self, conn: sqlite3.Connection) -> list[dict]:
        biomarkers = get_all_biomarkers_latest(conn)
        bm_by_name = {bm["name"]: bm for bm in biomarkers}
        today = _today()
        week_ago = _days_ago(7)
        insights = []

        for corr in CROSS_CORRELATIONS:
            bm = bm_by_name.get(corr["biomarker"])
            if not bm:
                continue
            if bm["status"] not in corr["trigger_statuses"]:
                continue

            metric = corr["wearable_metric"]
            current = get_wearable_period_averages(conn, metric, week_ago, today)
            if current["count"] == 0:
                continue

            if corr["wearable_direction"] == "any":
                pass
            elif corr["wearable_direction"] == "low":
                benchmarks = SCORE_WEIGHTS["wearable_benchmarks"].get(metric)
                if benchmarks and current["avg"] and current["avg"] > benchmarks["good"]:
                    continue
            elif corr["wearable_direction"] == "high":
                benchmarks = SCORE_WEIGHTS["wearable_benchmarks"].get(metric)
                if benchmarks and current["avg"] and current["avg"] < benchmarks["good"]:
                    continue

            insights.append({
                "insight_type": "CrossSourceCorrelation",
                "title": corr["title"],
                "content": corr["content"],
                "severity": "warning",
                "data_sources": ["bloodwork", "wearables"],
                "meta": {
                    "biomarker": corr["biomarker"],
                    "biomarker_status": bm["status"],
                    "biomarker_value": bm["value"],
                    "wearable_metric": metric,
                    "wearable_avg": round(current["avg"], 1) if current["avg"] else None,
                    "recommendation": corr["recommendation"],
                    "confidence": "medium",
                },
            })

        return insights

    def generate_supplement_insights(self, conn: sqlite3.Connection) -> list[dict]:
        supplements = get_active_supplements(conn)
        biomarkers = get_all_biomarkers_latest(conn)
        bm_by_name = {bm["name"]: bm for bm in biomarkers}
        insights = []

        interactions = check_interactions(supplements)
        for interaction in interactions:
            insights.append({
                "insight_type": "SupplementInsight",
                "title": f"Interaction: {interaction['supplement_a']} & {interaction['supplement_b']}",
                "content": interaction["recommendation"],
                "severity": "warning" if interaction["interaction_type"] == "inhibits_absorption" else "info",
                "data_sources": ["supplements"],
                "meta": {
                    "supplement": interaction["supplement_a"],
                    "interaction_type": interaction["interaction_type"],
                    "recommendation": interaction["recommendation"],
                },
            })

        now = datetime.now(timezone.utc)
        for supp in supplements:
            info = SUPPLEMENT_DATA.get(supp["name"])
            if not info:
                continue

            relevant_bms = info.get("relevant_biomarkers", [])
            affected = []
            for bm_name in relevant_bms:
                bm = bm_by_name.get(bm_name)
                if bm:
                    affected.append(bm)

            if not affected:
                continue

            started = supp.get("started_date", "")
            try:
                started_dt = datetime.fromisoformat(started)
                months_on = (now - started_dt).days / 30
            except (ValueError, TypeError):
                months_on = 0

            for bm in affected:
                trend_data = get_biomarker_trend(conn, bm["name"], 5)
                if len(trend_data) < 2:
                    continue

                trend_values = [t["value"] for t in trend_data]
                trend = _trend_direction(trend_values)

                if bm["status"] in ("optimal",) and trend in ("stable", "improving"):
                    effectiveness = "working"
                    severity = "positive"
                    evidence = f"{bm['name']} is at {bm['value']} {bm['unit']} ({bm['status']}) while taking {supp['name']}."
                    recommendation = f"Continue {supp['name']} at current dose."
                elif bm["status"] in ("suboptimal", "out_of_range") and trend == "improving":
                    effectiveness = "working"
                    severity = "positive"
                    evidence = f"{bm['name']} is improving ({trend_values[0]} -> {trend_values[-1]} {bm['unit']}) since starting {supp['name']}."
                    recommendation = f"Continue {supp['name']}. Consider retesting in 3 months."
                elif bm["status"] in ("suboptimal", "out_of_range") and months_on > 3:
                    effectiveness = "not_yet_effective"
                    severity = "warning"
                    evidence = f"You've been taking {supp['name']} for {months_on:.0f} months but {bm['name']} remains {bm['status']} at {bm['value']} {bm['unit']}."
                    recommendation = f"Consider increasing {supp['name']} dosage or reviewing absorption factors."
                    if info.get("timing_note"):
                        recommendation += f" Tip: {info['timing_note']}"
                else:
                    continue

                insights.append({
                    "insight_type": "SupplementInsight",
                    "title": f"{supp['name']}: {effectiveness.replace('_', ' ').title()} for {bm['name']}",
                    "content": evidence,
                    "severity": severity,
                    "data_sources": ["supplements", "bloodwork"],
                    "meta": {
                        "supplement": supp["name"],
                        "effectiveness": effectiveness,
                        "biomarker": bm["name"],
                        "recommendation": recommendation,
                    },
                })

        return insights

    def generate_daily_snapshot(self, conn: sqlite3.Connection) -> list[dict]:
        latest = get_wearable_latest(conn)
        if not latest:
            return []

        metrics = {m["metric_type"]: m for m in latest}
        highlights = []
        recommendations = []

        sleep = metrics.get("sleep_hours")
        if sleep:
            if sleep["value"] >= 7:
                highlights.append(f"Good sleep: {sleep['value']:.1f} hours")
            else:
                highlights.append(f"Low sleep: {sleep['value']:.1f} hours")
                recommendations.append("Prioritize sleep tonight — aim for 7-9 hours")

        hrv = metrics.get("hrv")
        rhr = metrics.get("resting_hr")
        if hrv:
            if hrv["value"] >= 50:
                highlights.append(f"Strong HRV: {hrv['value']:.0f} ms")
            else:
                highlights.append(f"HRV below average: {hrv['value']:.0f} ms")
                recommendations.append("Consider a lighter workout or active recovery today")

        if rhr:
            if rhr["value"] <= 65:
                highlights.append(f"Resting HR: {rhr['value']:.0f} bpm (good)")
            else:
                highlights.append(f"Elevated resting HR: {rhr['value']:.0f} bpm")

        steps = metrics.get("steps")
        if steps:
            if steps["value"] >= 8000:
                highlights.append(f"Active day: {int(steps['value']):,} steps")
            else:
                recommendations.append("Try to get more steps today — aim for 8,000+")

        if not recommendations:
            recommendations.append("Keep up your current routine — metrics look good!")

        recovery = "fully_recovered"
        if hrv and hrv["value"] < 40:
            recovery = "needs_rest"
        elif hrv and hrv["value"] < 50:
            recovery = "moderate"
        if sleep and sleep["value"] < 6:
            recovery = "needs_rest"

        score = self._snapshot_score(metrics)

        summary = "; ".join(highlights[:3]) if highlights else "No recent wearable data."
        content = f"Daily Score: {score}/100. {summary}"
        if recommendations:
            content += f" Today's focus: {recommendations[0]}"

        return [{
            "insight_type": "DailySnapshot",
            "title": f"Daily Snapshot — {_today()}",
            "content": content,
            "severity": "positive" if score >= 70 else ("info" if score >= 50 else "warning"),
            "data_sources": ["wearables"],
            "meta": {
                "date": _today(),
                "overall_score": score,
                "highlights": highlights[:3],
                "recommendations": recommendations[:3],
                "recovery_status": recovery,
            },
        }]

    def _snapshot_score(self, metrics: dict) -> int:
        scores = []
        benchmarks = SCORE_WEIGHTS["wearable_benchmarks"]
        for metric, config in benchmarks.items():
            m = metrics.get(metric)
            if not m:
                continue
            val = m["value"]
            exc = config["excellent"]
            good = config["good"]
            poor = config["poor"]
            higher = config["higher_is_better"]

            if higher:
                if val >= exc:
                    scores.append(100)
                elif val >= good:
                    scores.append(70 + 30 * (val - good) / (exc - good))
                elif val >= poor:
                    scores.append(30 + 40 * (val - poor) / (good - poor))
                else:
                    scores.append(max(0, 30 * val / poor))
            else:
                if val <= exc:
                    scores.append(100)
                elif val <= good:
                    scores.append(70 + 30 * (good - val) / (good - exc))
                elif val <= poor:
                    scores.append(30 + 40 * (poor - val) / (poor - good))
                else:
                    scores.append(max(0, 30 * (1 - (val - poor) / poor)))

        return round(sum(scores) / len(scores)) if scores else 50

    def compute_health_score(self, conn: sqlite3.Connection) -> dict:
        factors = []

        # Bloodwork subscore
        biomarkers = get_all_biomarkers_latest(conn)
        status_weights = SCORE_WEIGHTS["status_weights"]
        bw_max = SCORE_WEIGHTS["bloodwork_max"]

        if biomarkers:
            total_weight = 0
            weighted_sum = 0
            for bm in biomarkers:
                w = status_weights.get(bm["status"], 0.5)
                weighted_sum += w
                total_weight += 1
                if bm["status"] in ("critical", "out_of_range"):
                    factors.append({"name": bm["name"], "impact": "negative",
                                    "detail": f"{bm['value']} {bm['unit']} ({bm['status']})"})
                elif bm["status"] == "optimal":
                    factors.append({"name": bm["name"], "impact": "positive",
                                    "detail": f"{bm['value']} {bm['unit']} (optimal)"})
            bw_score = round(bw_max * (weighted_sum / total_weight)) if total_weight > 0 else bw_max // 2
        else:
            bw_score = bw_max // 2

        # Wearables subscore
        w_max = SCORE_WEIGHTS["wearables_max"]
        latest = get_wearable_latest(conn)
        metrics = {m["metric_type"]: m for m in latest}
        benchmarks = SCORE_WEIGHTS["wearable_benchmarks"]

        if metrics:
            w_scores = []
            for metric, config in benchmarks.items():
                m = metrics.get(metric)
                if not m:
                    continue
                val = m["value"]
                higher = config["higher_is_better"]
                exc = config["excellent"]
                good = config["good"]

                if higher:
                    s = min(1.0, val / exc)
                else:
                    s = min(1.0, exc / val) if val > 0 else 0

                w_scores.append(s)
                label = config.get("unit", metric)
                if s >= 0.8:
                    factors.append({"name": f"{metric} ({val:.0f} {label})", "impact": "positive", "detail": "Good range"})
                elif s < 0.5:
                    factors.append({"name": f"{metric} ({val:.0f} {label})", "impact": "negative", "detail": "Needs attention"})

            w_score = round(w_max * (sum(w_scores) / len(w_scores))) if w_scores else w_max // 2
        else:
            w_score = w_max // 2

        # Supplement coverage subscore
        s_max = SCORE_WEIGHTS["supplements_max"]
        supplements = get_active_supplements(conn)

        if biomarkers:
            suboptimal = [bm for bm in biomarkers if bm["status"] in ("suboptimal", "out_of_range", "critical")]
            if suboptimal:
                supp_names = {s["name"] for s in supplements}
                covered = 0
                for bm in suboptimal:
                    info = get_biomarker_info(bm["name"])
                    if info:
                        related = set(info.get("related_supplements", []))
                        if related & supp_names:
                            covered += 1
                coverage = covered / len(suboptimal) if suboptimal else 1.0
                s_score = round(s_max * (0.5 + 0.5 * coverage))
            else:
                s_score = s_max
        else:
            s_score = s_max // 2

        total = bw_score + w_score + s_score

        factors_limited = sorted(factors, key=lambda f: 0 if f["impact"] == "negative" else 1)[:8]

        return {
            "score": total,
            "breakdown": {"bloodwork": bw_score, "wearables": w_score, "supplements": s_score},
            "factors": factors_limited,
        }

    def answer_question(self, conn: sqlite3.Connection, question: str) -> dict:
        q = question.lower().strip()
        relevant_data = []

        for bm_name, bm_info in BIOMARKER_RANGES.items():
            aliases = [a.lower() for a in bm_info.get("aliases", [])]
            if bm_name.lower() in q or any(a in q for a in aliases):
                trend = get_biomarker_trend(conn, bm_name, 5)
                if trend:
                    latest = trend[-1]
                    answer_parts = [
                        f"Your {bm_name} is currently at {latest['value']} {latest['unit']}, "
                        f"classified as {latest['status']}.",
                    ]
                    if bm_info.get("description"):
                        answer_parts.append(bm_info["description"])

                    if len(trend) >= 2:
                        direction = _trend_direction([t["value"] for t in trend])
                        answer_parts.append(
                            f"Trend over {len(trend)} reports: {direction} "
                            f"({trend[0]['value']} -> {trend[-1]['value']} {latest['unit']})."
                        )

                    related = bm_info.get("related_supplements", [])
                    if related:
                        answer_parts.append(f"Related supplements: {', '.join(related)}.")

                    relevant_data.append({
                        "type": "biomarker",
                        "name": bm_name,
                        "value": latest["value"],
                        "unit": latest["unit"],
                        "status": latest["status"],
                    })

                    return {
                        "answer": " ".join(answer_parts) + f"\n\n{DISCLAIMER}",
                        "relevant_data": relevant_data,
                        "source": "rule_engine",
                    }

        for supp_name, supp_info in SUPPLEMENT_DATA.items():
            if supp_name.lower() in q:
                supplements = get_active_supplements(conn)
                active = next((s for s in supplements if s["name"] == supp_name), None)

                answer_parts = []
                if active:
                    answer_parts.append(f"You are currently taking {supp_name} ({active['dosage']}, {active['frequency']}).")
                else:
                    answer_parts.append(f"{supp_name} is not in your active supplement stack.")

                relevant_bms = supp_info.get("relevant_biomarkers", [])
                if relevant_bms:
                    answer_parts.append(f"This supplement targets: {', '.join(relevant_bms)}.")

                if supp_info.get("expected_effect"):
                    answer_parts.append(f"Expected effect: {supp_info['expected_effect']}")

                if supp_info.get("timing_note"):
                    answer_parts.append(f"Timing: {supp_info['timing_note']}")

                relevant_data.append({"type": "supplement", "name": supp_name, "active": active is not None})

                return {
                    "answer": " ".join(answer_parts) + f"\n\n{DISCLAIMER}",
                    "relevant_data": relevant_data,
                    "source": "rule_engine",
                }

        wearable_keywords = {
            "hrv": "hrv", "heart rate variability": "hrv",
            "resting heart rate": "resting_hr", "resting hr": "resting_hr", "heart rate": "resting_hr",
            "sleep": "sleep_hours", "steps": "steps", "activity": "steps",
        }

        for keyword, metric in wearable_keywords.items():
            if keyword in q:
                today = _today()
                week_ago = _days_ago(7)
                current = get_wearable_period_averages(conn, metric, week_ago, today)

                if current["count"] > 0:
                    answer = (
                        f"Your 7-day average {keyword} is {current['avg']:.1f} "
                        f"(range: {current['min']:.1f} - {current['max']:.1f}, {current['count']} data points)."
                    )
                    relevant_data.append({
                        "type": "wearable",
                        "metric": metric,
                        "avg": round(current["avg"], 1),
                    })
                else:
                    answer = f"No recent {keyword} data found. Upload wearable data to see trends."

                return {
                    "answer": answer + f"\n\n{DISCLAIMER}",
                    "relevant_data": relevant_data,
                    "source": "rule_engine",
                }

        return {
            "answer": (
                "I can answer questions about your biomarkers, supplements, and wearable data. "
                "Try asking about a specific marker like 'How is my Vitamin D?' or 'Is my iron supplement working?'"
                f"\n\n{DISCLAIMER}"
            ),
            "relevant_data": [],
            "source": "rule_engine",
        }
