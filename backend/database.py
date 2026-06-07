import sqlite3
from config import DATABASE_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS health_profile (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT,
    age INTEGER,
    sex TEXT,
    height_cm REAL,
    weight_kg REAL,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS blood_work_reports (
    id TEXT PRIMARY KEY,
    report_date TEXT,
    lab_name TEXT,
    filename TEXT,
    raw_text TEXT,
    upload_date TEXT
);

CREATE TABLE IF NOT EXISTS biomarkers (
    id TEXT PRIMARY KEY,
    report_id TEXT,
    report_date TEXT,
    name TEXT,
    value REAL,
    unit TEXT,
    lab_reference_low REAL,
    lab_reference_high REAL,
    optimal_low REAL,
    optimal_high REAL,
    status TEXT,
    category TEXT,
    FOREIGN KEY (report_id) REFERENCES blood_work_reports(id)
);

CREATE TABLE IF NOT EXISTS wearable_data (
    id TEXT PRIMARY KEY,
    source TEXT,
    date TEXT,
    metric_type TEXT,
    value REAL,
    unit TEXT,
    uploaded_at TEXT,
    UNIQUE(source, date, metric_type)
);

CREATE TABLE IF NOT EXISTS supplements (
    id TEXT PRIMARY KEY,
    name TEXT,
    dosage TEXT,
    frequency TEXT,
    time_of_day TEXT,
    started_date TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS supplement_history (
    id TEXT PRIMARY KEY,
    supplement_id TEXT,
    action TEXT,
    old_value TEXT,
    new_value TEXT,
    date TEXT,
    FOREIGN KEY (supplement_id) REFERENCES supplements(id)
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id TEXT PRIMARY KEY,
    insight_type TEXT,
    title TEXT,
    content TEXT,
    severity TEXT,
    data_sources TEXT,
    generated_at TEXT,
    dismissed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS genetic_markers (
    id TEXT PRIMARY KEY,
    rsid TEXT UNIQUE,
    gene TEXT,
    genotype TEXT,
    significance TEXT,
    category TEXT,
    risk_level TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS health_goals (
    id TEXT PRIMARY KEY,
    metric_type TEXT,
    target_value REAL,
    target_date TEXT,
    current_value REAL,
    started_at TEXT,
    status TEXT DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    prescriber TEXT,
    started_date TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS medication_history (
    id TEXT PRIMARY KEY,
    medication_id TEXT,
    action TEXT,
    old_value TEXT,
    new_value TEXT,
    date TEXT,
    FOREIGN KEY (medication_id) REFERENCES medications(id)
);

CREATE TABLE IF NOT EXISTS symptom_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    symptom TEXT NOT NULL,
    severity INTEGER NOT NULL,
    time_of_day TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS food_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    food_name TEXT NOT NULL,
    portion TEXT,
    calories REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    notes TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_biomarkers_report_id ON biomarkers(report_id);
CREATE INDEX IF NOT EXISTS idx_biomarkers_name ON biomarkers(name);
CREATE INDEX IF NOT EXISTS idx_biomarkers_report_date ON biomarkers(report_date);
CREATE INDEX IF NOT EXISTS idx_wearable_data_lookup ON wearable_data(source, date, metric_type);
CREATE INDEX IF NOT EXISTS idx_supplements_active ON supplements(active);
CREATE INDEX IF NOT EXISTS idx_supplement_history_supplement_id ON supplement_history(supplement_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(active);
CREATE INDEX IF NOT EXISTS idx_medication_history_medication_id ON medication_history(medication_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_date ON symptom_entries(date);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_symptom ON symptom_entries(symptom);
CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log(date);
CREATE INDEX IF NOT EXISTS idx_food_log_meal_type ON food_log(meal_type);
"""


def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.executescript(SCHEMA)
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()
