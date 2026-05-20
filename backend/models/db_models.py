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
