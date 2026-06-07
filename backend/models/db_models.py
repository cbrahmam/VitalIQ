import sqlite3
from datetime import datetime, timezone
from uuid import uuid4


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid4().hex


# --- Health Profile ---

def upsert_health_profile(conn: sqlite3.Connection, data: dict) -> dict:
    existing = conn.execute("SELECT * FROM health_profile WHERE id = 'default'").fetchone()
    now = now_iso()

    if existing:
        conn.execute(
            """UPDATE health_profile SET name=?, age=?, sex=?, height_cm=?, weight_kg=?, updated_at=?
               WHERE id='default'""",
            (data.get("name"), data.get("age"), data.get("sex"),
             data.get("height_cm"), data.get("weight_kg"), now),
        )
    else:
        conn.execute(
            """INSERT INTO health_profile (id, name, age, sex, height_cm, weight_kg, created_at, updated_at)
               VALUES ('default', ?, ?, ?, ?, ?, ?, ?)""",
            (data.get("name"), data.get("age"), data.get("sex"),
             data.get("height_cm"), data.get("weight_kg"), now, now),
        )
    conn.commit()
    return row_to_dict(conn.execute("SELECT * FROM health_profile WHERE id = 'default'").fetchone())


def get_health_profile(conn: sqlite3.Connection) -> dict | None:
    row = conn.execute("SELECT * FROM health_profile WHERE id = 'default'").fetchone()
    return row_to_dict(row) if row else None


# --- Blood Work Reports ---

def insert_blood_work_report(conn: sqlite3.Connection, report_date: str | None,
                             lab_name: str | None, filename: str, raw_text: str) -> str:
    report_id = new_id()
    conn.execute(
        """INSERT INTO blood_work_reports (id, report_date, lab_name, filename, raw_text, upload_date)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (report_id, report_date, lab_name, filename, raw_text, now_iso()),
    )
    conn.commit()
    return report_id


def insert_biomarker(conn: sqlite3.Connection, report_id: str, report_date: str | None,
                     name: str, value: float, unit: str,
                     lab_low: float | None, lab_high: float | None,
                     optimal_low: float | None, optimal_high: float | None,
                     status: str, category: str) -> str:
    biomarker_id = new_id()
    conn.execute(
        """INSERT INTO biomarkers (id, report_id, report_date, name, value, unit,
           lab_reference_low, lab_reference_high, optimal_low, optimal_high, status, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (biomarker_id, report_id, report_date, name, value, unit,
         lab_low, lab_high, optimal_low, optimal_high, status, category),
    )
    return biomarker_id


def get_all_reports(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT r.id, r.report_date, r.lab_name, r.upload_date,
                  COUNT(b.id) as biomarker_count
           FROM blood_work_reports r
           LEFT JOIN biomarkers b ON b.report_id = r.id
           GROUP BY r.id
           ORDER BY r.report_date DESC"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_report_with_biomarkers(conn: sqlite3.Connection, report_id: str) -> dict | None:
    report = conn.execute("SELECT * FROM blood_work_reports WHERE id = ?", (report_id,)).fetchone()
    if not report:
        return None
    biomarkers = conn.execute(
        "SELECT * FROM biomarkers WHERE report_id = ? ORDER BY category, name", (report_id,)
    ).fetchall()
    result = row_to_dict(report)
    result["biomarkers"] = [row_to_dict(b) for b in biomarkers]
    return result


def get_biomarker_history(conn: sqlite3.Connection, name: str) -> list[dict]:
    rows = conn.execute(
        """SELECT report_date, value, unit, status FROM biomarkers
           WHERE name = ? AND report_date IS NOT NULL
           ORDER BY report_date ASC""",
        (name,),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


# --- Supplements ---

def insert_supplement(conn: sqlite3.Connection, data: dict) -> str:
    supplement_id = new_id()
    now = now_iso()
    conn.execute(
        """INSERT INTO supplements (id, name, dosage, frequency, time_of_day, started_date, active, notes)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
        (supplement_id, data["name"], data["dosage"], data["frequency"],
         data["time_of_day"], now, data.get("notes")),
    )
    conn.execute(
        """INSERT INTO supplement_history (id, supplement_id, action, old_value, new_value, date)
           VALUES (?, ?, 'started', NULL, ?, ?)""",
        (new_id(), supplement_id, f"{data['name']} {data['dosage']}", now),
    )
    conn.commit()
    return supplement_id


def get_active_supplements(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM supplements WHERE active = 1 ORDER BY name").fetchall()
    return [row_to_dict(r) for r in rows]


def get_supplement_by_id(conn: sqlite3.Connection, supplement_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM supplements WHERE id = ?", (supplement_id,)).fetchone()
    return row_to_dict(row) if row else None


def update_supplement(conn: sqlite3.Connection, supplement_id: str, data: dict) -> dict | None:
    existing = get_supplement_by_id(conn, supplement_id)
    if not existing:
        return None

    now = now_iso()
    fields_to_update = {}
    for field in ("name", "dosage", "frequency", "time_of_day", "notes"):
        if data.get(field) is not None:
            fields_to_update[field] = data[field]

    if not fields_to_update:
        return existing

    if "dosage" in fields_to_update and fields_to_update["dosage"] != existing["dosage"]:
        conn.execute(
            """INSERT INTO supplement_history (id, supplement_id, action, old_value, new_value, date)
               VALUES (?, ?, 'changed_dose', ?, ?, ?)""",
            (new_id(), supplement_id, existing["dosage"], fields_to_update["dosage"], now),
        )

    set_clause = ", ".join(f"{k} = ?" for k in fields_to_update)
    values = list(fields_to_update.values()) + [supplement_id]
    conn.execute(f"UPDATE supplements SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_supplement_by_id(conn, supplement_id)


def deactivate_supplement(conn: sqlite3.Connection, supplement_id: str) -> bool:
    existing = get_supplement_by_id(conn, supplement_id)
    if not existing:
        return False
    now = now_iso()
    conn.execute("UPDATE supplements SET active = 0 WHERE id = ?", (supplement_id,))
    conn.execute(
        """INSERT INTO supplement_history (id, supplement_id, action, old_value, new_value, date)
           VALUES (?, ?, 'stopped', ?, NULL, ?)""",
        (new_id(), supplement_id, f"{existing['name']} {existing['dosage']}", now),
    )
    conn.commit()
    return True


def get_supplement_history(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT sh.id, sh.supplement_id, s.name as supplement_name,
                  sh.action, sh.old_value, sh.new_value, sh.date
           FROM supplement_history sh
           JOIN supplements s ON s.id = sh.supplement_id
           ORDER BY sh.date DESC"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


# --- Wearable Data ---

def get_latest_wearable_date(conn: sqlite3.Connection, source: str) -> str | None:
    row = conn.execute(
        "SELECT MAX(date) as latest FROM wearable_data WHERE source = ?", (source,)
    ).fetchone()
    return row["latest"] if row and row["latest"] else None


def insert_wearable_batch(conn: sqlite3.Connection, data_points: list[dict]) -> tuple[int, int]:
    imported = 0
    skipped = 0
    now = now_iso()
    for dp in data_points:
        try:
            changes_before = conn.total_changes
            conn.execute(
                """INSERT OR IGNORE INTO wearable_data (id, source, date, metric_type, value, unit, uploaded_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (new_id(), dp["source"], dp["date"], dp["metric_type"],
                 dp["value"], dp["unit"], now),
            )
            if conn.total_changes > changes_before:
                imported += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1
    conn.commit()
    return imported, skipped


def get_wearable_latest(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT w.source, w.metric_type, w.value, w.unit, w.date
           FROM wearable_data w
           INNER JOIN (
               SELECT metric_type, MAX(date) as max_date
               FROM wearable_data
               GROUP BY metric_type
           ) latest ON w.metric_type = latest.metric_type AND w.date = latest.max_date
           GROUP BY w.metric_type"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_wearable_daily(conn: sqlite3.Connection, date: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM wearable_data WHERE date = ? ORDER BY metric_type",
        (date,),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_wearable_range(conn: sqlite3.Connection, metric: str, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        """SELECT date, value, unit, source FROM wearable_data
           WHERE metric_type = ? AND date >= ? AND date <= ?
           ORDER BY date ASC""",
        (metric, start, end),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_sync_status(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT source,
                  MAX(uploaded_at) as last_sync_date,
                  COUNT(*) as record_count,
                  MAX(date) as latest_data_date
           FROM wearable_data
           GROUP BY source"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


# --- AI Insights ---

def insert_insight(conn: sqlite3.Connection, insight_type: str, title: str,
                   content: str, severity: str, data_sources: list[str],
                   generated_at: str) -> str:
    import json
    insight_id = new_id()
    conn.execute(
        """INSERT INTO ai_insights (id, insight_type, title, content, severity, data_sources, generated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (insight_id, insight_type, title, content, severity, json.dumps(data_sources), generated_at),
    )
    return insight_id


def get_latest_insights(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    import json
    rows = conn.execute(
        "SELECT * FROM ai_insights WHERE dismissed = 0 ORDER BY generated_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    results = []
    for r in rows:
        d = row_to_dict(r)
        d["data_sources"] = json.loads(d["data_sources"]) if d["data_sources"] else []
        d["dismissed"] = bool(d["dismissed"])
        results.append(d)
    return results


def get_insight_history(conn: sqlite3.Connection, insight_type: str | None = None,
                        limit: int = 50) -> list[dict]:
    import json
    if insight_type:
        rows = conn.execute(
            "SELECT * FROM ai_insights WHERE insight_type = ? ORDER BY generated_at DESC LIMIT ?",
            (insight_type, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM ai_insights ORDER BY generated_at DESC LIMIT ?", (limit,)
        ).fetchall()
    results = []
    for r in rows:
        d = row_to_dict(r)
        d["data_sources"] = json.loads(d["data_sources"]) if d["data_sources"] else []
        d["dismissed"] = bool(d["dismissed"])
        results.append(d)
    return results


def dismiss_insight(conn: sqlite3.Connection, insight_id: str) -> bool:
    cursor = conn.execute("UPDATE ai_insights SET dismissed = 1 WHERE id = ?", (insight_id,))
    conn.commit()
    return cursor.rowcount > 0


def clear_insights_by_type(conn: sqlite3.Connection, insight_type: str) -> int:
    cursor = conn.execute("DELETE FROM ai_insights WHERE insight_type = ?", (insight_type,))
    return cursor.rowcount


def get_all_biomarkers_latest(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT b.* FROM biomarkers b
           INNER JOIN (
               SELECT name, MAX(report_date) as max_date
               FROM biomarkers WHERE report_date IS NOT NULL
               GROUP BY name
           ) latest ON b.name = latest.name AND b.report_date = latest.max_date"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_biomarker_trend(conn: sqlite3.Connection, name: str, limit: int = 5) -> list[dict]:
    rows = conn.execute(
        """SELECT report_date, value, unit, status FROM biomarkers
           WHERE name = ? AND report_date IS NOT NULL
           ORDER BY report_date DESC LIMIT ?""",
        (name, limit),
    ).fetchall()
    return [row_to_dict(r) for r in reversed(rows)]


def get_wearable_period_averages(conn: sqlite3.Connection, metric: str,
                                  start: str, end: str) -> dict:
    row = conn.execute(
        """SELECT AVG(value) as avg_val, MIN(value) as min_val,
                  MAX(value) as max_val, COUNT(*) as count
           FROM wearable_data
           WHERE metric_type = ? AND date >= ? AND date <= ?""",
        (metric, start, end),
    ).fetchone()
    if row and row["count"] > 0:
        return {"avg": row["avg_val"], "min": row["min_val"],
                "max": row["max_val"], "count": row["count"]}
    return {"avg": None, "min": None, "max": None, "count": 0}


# --- Genetic Markers ---

def upsert_genetic_marker(conn: sqlite3.Connection, rsid: str, gene: str,
                           genotype: str, significance: str, category: str,
                           risk_level: str, description: str) -> str:
    existing = conn.execute("SELECT id FROM genetic_markers WHERE rsid = ?", (rsid,)).fetchone()
    if existing:
        conn.execute(
            """UPDATE genetic_markers SET gene=?, genotype=?, significance=?, category=?,
               risk_level=?, description=? WHERE rsid=?""",
            (gene, genotype, significance, category, risk_level, description, rsid),
        )
        return existing["id"]
    marker_id = new_id()
    conn.execute(
        """INSERT INTO genetic_markers (id, rsid, gene, genotype, significance, category, risk_level, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (marker_id, rsid, gene, genotype, significance, category, risk_level, description),
    )
    return marker_id


def get_genetic_markers(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM genetic_markers ORDER BY category, gene").fetchall()
    return [row_to_dict(r) for r in rows]


def clear_genetic_markers(conn: sqlite3.Connection) -> int:
    cursor = conn.execute("DELETE FROM genetic_markers")
    conn.commit()
    return cursor.rowcount


# --- Health Goals ---

def insert_goal(conn: sqlite3.Connection, data: dict) -> str:
    goal_id = new_id()
    conn.execute(
        """INSERT INTO health_goals (id, metric_type, target_value, target_date, current_value, started_at, status)
           VALUES (?, ?, ?, ?, ?, ?, 'in_progress')""",
        (goal_id, data["metric_type"], data["target_value"],
         data.get("target_date"), data.get("current_value"), now_iso()),
    )
    conn.commit()
    return goal_id


def get_goals(conn: sqlite3.Connection, status: str | None = None) -> list[dict]:
    if status:
        rows = conn.execute("SELECT * FROM health_goals WHERE status = ? ORDER BY started_at DESC", (status,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM health_goals ORDER BY started_at DESC").fetchall()
    return [row_to_dict(r) for r in rows]


def get_goal_by_id(conn: sqlite3.Connection, goal_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM health_goals WHERE id = ?", (goal_id,)).fetchone()
    return row_to_dict(row) if row else None


def update_goal(conn: sqlite3.Connection, goal_id: str, data: dict) -> dict | None:
    existing = get_goal_by_id(conn, goal_id)
    if not existing:
        return None
    fields = {}
    for f in ("target_value", "target_date", "current_value", "status"):
        if data.get(f) is not None:
            fields[f] = data[f]
    if not fields:
        return existing
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [goal_id]
    conn.execute(f"UPDATE health_goals SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_goal_by_id(conn, goal_id)


def delete_goal(conn: sqlite3.Connection, goal_id: str) -> bool:
    cursor = conn.execute("DELETE FROM health_goals WHERE id = ?", (goal_id,))
    conn.commit()
    return cursor.rowcount > 0


# --- Medications ---

def insert_medication(conn: sqlite3.Connection, data: dict) -> str:
    med_id = new_id()
    now = now_iso()
    conn.execute(
        """INSERT INTO medications (id, name, dosage, frequency, prescriber, started_date, active, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)""",
        (med_id, data["name"], data.get("dosage"), data.get("frequency"),
         data.get("prescriber"), data.get("started_date", now), data.get("notes"), now, now),
    )
    conn.execute(
        """INSERT INTO medication_history (id, medication_id, action, old_value, new_value, date)
           VALUES (?, ?, 'started', NULL, ?, ?)""",
        (new_id(), med_id, f"{data['name']} {data.get('dosage', '')}", now),
    )
    conn.commit()
    return med_id


def get_active_medications(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM medications WHERE active = 1 ORDER BY name").fetchall()
    return [row_to_dict(r) for r in rows]


def get_all_medications(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM medications ORDER BY active DESC, name").fetchall()
    return [row_to_dict(r) for r in rows]


def get_medication_by_id(conn: sqlite3.Connection, med_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM medications WHERE id = ?", (med_id,)).fetchone()
    return row_to_dict(row) if row else None


def update_medication(conn: sqlite3.Connection, med_id: str, data: dict) -> dict | None:
    existing = get_medication_by_id(conn, med_id)
    if not existing:
        return None
    now = now_iso()
    fields = {}
    for f in ("name", "dosage", "frequency", "prescriber", "notes"):
        if data.get(f) is not None:
            fields[f] = data[f]
    if not fields:
        return existing
    if "dosage" in fields and fields["dosage"] != existing["dosage"]:
        conn.execute(
            """INSERT INTO medication_history (id, medication_id, action, old_value, new_value, date)
               VALUES (?, ?, 'changed_dose', ?, ?, ?)""",
            (new_id(), med_id, existing["dosage"], fields["dosage"], now),
        )
    fields["updated_at"] = now
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [med_id]
    conn.execute(f"UPDATE medications SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_medication_by_id(conn, med_id)


def deactivate_medication(conn: sqlite3.Connection, med_id: str) -> bool:
    existing = get_medication_by_id(conn, med_id)
    if not existing:
        return False
    now = now_iso()
    conn.execute("UPDATE medications SET active = 0, updated_at = ? WHERE id = ?", (now, med_id))
    conn.execute(
        """INSERT INTO medication_history (id, medication_id, action, old_value, new_value, date)
           VALUES (?, ?, 'stopped', ?, NULL, ?)""",
        (new_id(), med_id, f"{existing['name']} {existing.get('dosage', '')}", now),
    )
    conn.commit()
    return True


def get_medication_history(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT mh.id, mh.medication_id, m.name as medication_name,
                  mh.action, mh.old_value, mh.new_value, mh.date
           FROM medication_history mh
           JOIN medications m ON m.id = mh.medication_id
           ORDER BY mh.date DESC"""
    ).fetchall()
    return [row_to_dict(r) for r in rows]


# --- Symptom Journal ---

def insert_symptom(conn: sqlite3.Connection, data: dict) -> str:
    symptom_id = new_id()
    conn.execute(
        """INSERT INTO symptom_entries (id, date, symptom, severity, time_of_day, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (symptom_id, data["date"], data["symptom"], data["severity"],
         data.get("time_of_day"), data.get("notes"), now_iso()),
    )
    conn.commit()
    return symptom_id


def get_symptoms_by_date(conn: sqlite3.Connection, date: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM symptom_entries WHERE date = ? ORDER BY created_at DESC", (date,)
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_symptoms_range(conn: sqlite3.Connection, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM symptom_entries WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC",
        (start, end),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_symptom_summary(conn: sqlite3.Connection, days: int = 30) -> list[dict]:
    rows = conn.execute(
        """SELECT symptom, COUNT(*) as occurrences,
                  ROUND(AVG(severity), 1) as avg_severity,
                  MAX(severity) as max_severity,
                  MIN(date) as first_date, MAX(date) as last_date
           FROM symptom_entries
           WHERE date >= date('now', ?)
           GROUP BY symptom
           ORDER BY occurrences DESC""",
        (f"-{days} days",),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def delete_symptom(conn: sqlite3.Connection, symptom_id: str) -> bool:
    cursor = conn.execute("DELETE FROM symptom_entries WHERE id = ?", (symptom_id,))
    conn.commit()
    return cursor.rowcount > 0


# --- Food Log ---

def insert_food_entry(conn: sqlite3.Connection, data: dict) -> str:
    entry_id = new_id()
    conn.execute(
        """INSERT INTO food_log (id, date, meal_type, food_name, portion, calories, protein_g, carbs_g, fat_g, fiber_g, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (entry_id, data["date"], data["meal_type"], data["food_name"],
         data.get("portion"), data.get("calories"), data.get("protein_g"),
         data.get("carbs_g"), data.get("fat_g"), data.get("fiber_g"),
         data.get("notes"), now_iso()),
    )
    conn.commit()
    return entry_id


def get_food_log_by_date(conn: sqlite3.Connection, date: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM food_log WHERE date = ? ORDER BY meal_type, created_at", (date,)
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_food_log_range(conn: sqlite3.Connection, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM food_log WHERE date >= ? AND date <= ? ORDER BY date DESC, meal_type, created_at",
        (start, end),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_daily_nutrition_summary(conn: sqlite3.Connection, date: str) -> dict:
    row = conn.execute(
        """SELECT COALESCE(SUM(calories), 0) as total_calories,
                  COALESCE(SUM(protein_g), 0) as total_protein,
                  COALESCE(SUM(carbs_g), 0) as total_carbs,
                  COALESCE(SUM(fat_g), 0) as total_fat,
                  COALESCE(SUM(fiber_g), 0) as total_fiber,
                  COUNT(*) as items
           FROM food_log WHERE date = ?""",
        (date,),
    ).fetchone()
    return row_to_dict(row) if row else {}


def get_nutrition_trend(conn: sqlite3.Connection, days: int = 7) -> list[dict]:
    rows = conn.execute(
        """SELECT date,
                  SUM(calories) as total_calories,
                  SUM(protein_g) as total_protein,
                  SUM(carbs_g) as total_carbs,
                  SUM(fat_g) as total_fat,
                  SUM(fiber_g) as total_fiber,
                  COUNT(*) as items
           FROM food_log
           WHERE date >= date('now', ?)
           GROUP BY date
           ORDER BY date ASC""",
        (f"-{days} days",),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def delete_food_entry(conn: sqlite3.Connection, entry_id: str) -> bool:
    cursor = conn.execute("DELETE FROM food_log WHERE id = ?", (entry_id,))
    conn.commit()
    return cursor.rowcount > 0
