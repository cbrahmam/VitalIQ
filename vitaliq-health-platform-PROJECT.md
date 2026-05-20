# VitalIQ - AI Health Intelligence Platform - Full Project Spec

## Overview
A personal health intelligence platform that ingests blood work PDFs, Apple Health exports (with daily refresh), wearable data (Whoop, Garmin via CSV/API), supplement stacks, and optionally genetic test results. It builds a persistent health profile over time, tracks biomarker trends, correlates across data sources, and uses AI to generate personalized, actionable health insights that update as new data comes in. Think of it as "your AI health operating system that gets smarter every day."

This is not a generic health dashboard. It cross-references your blood work with your sleep, HRV, training load, weight, and supplements to find connections a doctor would never have time to spot. Your ferritin is trending up but your HRV is declining and your sleep quality dropped. Are they related? VitalIQ tells you.

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS, Recharts for health trend charts
- **Backend**: Python (FastAPI)
- **AI**: Claude API (Anthropic) for health data analysis and recommendations
- **PDF Parsing**: PyMuPDF + tabula-py for extracting blood work tables from PDFs
- **Data Processing**: pandas for time-series health data, numpy for statistical analysis
- **Database**: SQLite for persistent health profile and historical data
- **File Parsing**: XML parsing for Apple Health export, CSV parsing for Whoop/Garmin
- **Storage**: Local filesystem for uploaded files, SQLite for structured data
- **Package Manager**: npm for frontend, pip for backend

## IMPORTANT BUILD INSTRUCTIONS
- DO NOT one-shot this build. Break it into the commit blocks below.
- Each block should be a working, testable increment.
- Write clean, well-commented code.
- Test each block before moving to the next.
- Use proper error handling throughout.
- No placeholder or dummy code. Everything should work.
- One commit block per day.

## IMPORTANT HEALTH DISCLAIMER
- This tool provides informational insights only, NOT medical advice.
- All AI-generated recommendations must include a disclaimer: "These insights are for informational purposes only. Consult your healthcare provider before making any changes to your health regimen."
- Never claim to diagnose, treat, or cure any condition.
- Frame everything as "insights," "observations," and "suggestions to discuss with your doctor."

---

## COMMIT BLOCK 1 (Day 1): Project Scaffolding, Database & Blood Work PDF Parser

### What to build:
1. Initialize the project structure:
```
vitaliq/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── config.py
│   ├── database.py
│   ├── routers/
│   │   ├── bloodwork.py           # Blood work upload and parsing
│   │   ├── wearables.py           # Apple Health, Whoop, Garmin data
│   │   ├── supplements.py         # Supplement stack management
│   │   ├── genetics.py            # Genetic data parsing (Block 5)
│   │   ├── insights.py            # AI insights endpoints (Block 3)
│   │   └── dashboard.py           # Dashboard data endpoints (Block 4)
│   ├── services/
│   │   ├── pdf_parser.py          # Blood work PDF extraction
│   │   ├── biomarker_engine.py    # Biomarker analysis and reference ranges
│   │   ├── apple_health.py        # Apple Health XML parser (Block 2)
│   │   ├── whoop_parser.py        # Whoop CSV parser (Block 2)
│   │   ├── garmin_parser.py       # Garmin CSV parser (Block 2)
│   │   ├── supplement_analyzer.py # Supplement interaction checker
│   │   ├── genetics_parser.py     # 23andMe raw data parser (Block 5)
│   │   ├── ai_health_engine.py    # Claude API health analysis (Block 3)
│   │   ├── trend_analyzer.py      # Statistical trend analysis (Block 4)
│   │   └── correlation_engine.py  # Cross-source correlation (Block 4)
│   ├── models/
│   │   ├── schemas.py
│   │   └── db_models.py
│   ├── reference_data/
│   │   ├── biomarker_ranges.json  # Optimal vs lab reference ranges
│   │   ├── supplement_interactions.json
│   │   └── snp_database.json      # Common health-relevant SNPs (Block 5)
│   ├── uploads/
│   └── health_data/               # SQLite DB location
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── BloodWorkUpload.jsx
│   │   │   ├── BloodWorkReport.jsx       # (Block 3)
│   │   │   ├── BiomarkerCard.jsx         # (Block 3)
│   │   │   ├── WearableSync.jsx          # (Block 2)
│   │   │   ├── SupplementStack.jsx
│   │   │   ├── TrendChart.jsx            # (Block 4)
│   │   │   ├── CorrelationPanel.jsx      # (Block 4)
│   │   │   ├── InsightsPanel.jsx         # (Block 3)
│   │   │   ├── GeneticsUpload.jsx        # (Block 5)
│   │   │   ├── DailySnapshot.jsx         # (Block 4)
│   │   │   └── HealthTimeline.jsx        # (Block 4)
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── BloodWorkPage.jsx
│   │   │   ├── WearablesPage.jsx         # (Block 2)
│   │   │   ├── SupplementsPage.jsx
│   │   │   ├── InsightsPage.jsx          # (Block 3)
│   │   │   ├── GeneticsPage.jsx          # (Block 5)
│   │   │   └── SettingsPage.jsx
│   │   ├── store/
│   │   │   └── healthStore.js            # Zustand store
│   │   ├── api/
│   │   │   └── client.js
│   │   └── utils/
│   │       ├── formatters.js
│   │       ├── biomarkerUtils.js         # Color coding, range checks
│   │       └── dateUtils.js
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── sample-data/
│   ├── sample_bloodwork.pdf              # Fake blood work report
│   ├── sample_apple_health.xml           # Sample Apple Health export
│   ├── sample_whoop.csv                  # Sample Whoop export
│   ├── sample_garmin.csv                 # Sample Garmin export
│   └── sample_23andme.txt               # Sample genetic raw data
├── README.md
└── .gitignore
```

2. Set up FastAPI with CORS middleware

3. Set up SQLite database with persistent health profile:
```sql
CREATE TABLE health_profile (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT,
    age INTEGER,
    sex TEXT,                             -- male, female (affects reference ranges)
    height_cm REAL,
    weight_kg REAL,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE blood_work_reports (
    id TEXT PRIMARY KEY,
    report_date TEXT,                     -- Date the blood work was done
    lab_name TEXT,
    filename TEXT,
    raw_text TEXT,                        -- Extracted text from PDF
    upload_date TEXT
);

CREATE TABLE biomarkers (
    id TEXT PRIMARY KEY,
    report_id TEXT,
    report_date TEXT,
    name TEXT,                            -- e.g., "Hemoglobin", "Ferritin", "Vitamin D"
    value REAL,
    unit TEXT,                            -- e.g., "ng/mL", "mg/dL", "g/dL"
    lab_reference_low REAL,
    lab_reference_high REAL,
    optimal_low REAL,                     -- Tighter optimal range
    optimal_high REAL,
    status TEXT,                          -- "optimal", "normal", "suboptimal", "out_of_range", "critical"
    category TEXT,                        -- "iron", "vitamins", "lipids", "thyroid", "liver", "kidney", "metabolic", "hormones", "blood_count", "inflammation"
    FOREIGN KEY (report_id) REFERENCES blood_work_reports(id)
);

CREATE TABLE wearable_data (
    id TEXT PRIMARY KEY,
    source TEXT,                          -- "apple_health", "whoop", "garmin"
    date TEXT,                            -- YYYY-MM-DD
    metric_type TEXT,                     -- "resting_hr", "hrv", "sleep_hours", "sleep_quality", "steps", "active_calories", "weight", "body_fat", "vo2_max", "respiratory_rate", "spo2", "recovery_score", "strain"
    value REAL,
    unit TEXT,
    uploaded_at TEXT
);

CREATE TABLE supplements (
    id TEXT PRIMARY KEY,
    name TEXT,                            -- e.g., "Iron Bisglycinate"
    dosage TEXT,                          -- e.g., "25mg"
    frequency TEXT,                       -- "daily", "twice_daily", "weekly"
    time_of_day TEXT,                     -- "morning", "evening", "with_meals"
    started_date TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT
);

CREATE TABLE supplement_history (
    id TEXT PRIMARY KEY,
    supplement_id TEXT,
    action TEXT,                          -- "started", "stopped", "changed_dose"
    old_value TEXT,
    new_value TEXT,
    date TEXT,
    FOREIGN KEY (supplement_id) REFERENCES supplements(id)
);

CREATE TABLE ai_insights (
    id TEXT PRIMARY KEY,
    insight_type TEXT,                    -- "bloodwork", "trend", "correlation", "supplement", "genetic", "daily"
    title TEXT,
    content TEXT,
    severity TEXT,                        -- "action_required", "watch", "positive", "informational"
    data_sources TEXT,                    -- JSON array of what data contributed
    generated_at TEXT,
    dismissed INTEGER DEFAULT 0
);

CREATE TABLE genetic_markers (
    id TEXT PRIMARY KEY,
    rsid TEXT,                            -- e.g., "rs1801133"
    gene TEXT,                            -- e.g., "MTHFR"
    genotype TEXT,                        -- e.g., "CT"
    significance TEXT,
    category TEXT,                        -- "methylation", "detox", "inflammation", "nutrient_metabolism", "cardiovascular", "fitness"
    risk_level TEXT,                      -- "elevated", "moderate", "normal", "protective"
    description TEXT
);
```

4. Build the blood work PDF parser (`pdf_parser.py`):
   - Function: `parse_blood_work_pdf(file_path: str) -> BloodWorkReport`
   - Strategy (try in order):
     1. Use `tabula-py` to extract tables from the PDF (most lab reports are tabular)
     2. Fall back to `PyMuPDF` text extraction if tabula fails
     3. Send extracted text/tables to Claude API for structured extraction as final fallback
   - Extract for each biomarker:
     - Name (normalize to standard names: "Hb" -> "Hemoglobin", "Vit D" -> "Vitamin D (25-OH)")
     - Value (numeric)
     - Unit
     - Lab reference range (low-high)
   - Handle different lab report formats:
     - Indian labs: Thyrocare, SRL, Dr Lal PathLabs, Metropolis
     - US labs: Quest Diagnostics, LabCorp
     - Generic table formats
   - The Claude fallback prompt should say:
     - "Extract all biomarkers from this blood work report. For each, return: name (standardized), value, unit, reference_range_low, reference_range_high. Return as JSON array."

   ```python
   class ParsedBiomarker(BaseModel):
       name: str
       value: float
       unit: str
       reference_low: Optional[float]
       reference_high: Optional[float]
       raw_text: str                      # Original text from PDF for verification
   
   class BloodWorkParseResult(BaseModel):
       report_date: Optional[str]
       lab_name: Optional[str]
       biomarkers: List[ParsedBiomarker]
       parse_method: str                  # "tabula", "pymupdf", "claude_fallback"
       parse_confidence: str              # "high", "medium", "low"
       warnings: List[str]
   ```

5. Build the biomarker reference engine (`biomarker_engine.py`):
   - Create `biomarker_ranges.json` with OPTIMAL ranges (not just lab ranges):
     - Lab ranges tell you if you're "normal" (broad). Optimal ranges tell you if you're thriving (narrow).
     - Example:
       ```json
       {
         "Ferritin": {
           "unit": "ng/mL",
           "category": "iron",
           "lab_range": {"male": [20, 250], "female": [10, 120]},
           "optimal_range": {"male": [70, 150], "female": [50, 100]},
           "description": "Iron storage protein. Low levels indicate depleted iron stores.",
           "related_supplements": ["Iron Bisglycinate", "Vitamin C"],
           "affected_by": ["heavy exercise", "menstruation", "vegetarian diet", "chronic inflammation"]
         },
         "Vitamin D (25-OH)": {
           "unit": "ng/mL",
           "category": "vitamins",
           "lab_range": {"male": [30, 100], "female": [30, 100]},
           "optimal_range": {"male": [50, 80], "female": [50, 80]},
           "description": "Essential for bone health, immunity, and mood.",
           "related_supplements": ["Vitamin D3", "Vitamin K2"],
           "affected_by": ["sun exposure", "skin tone", "latitude", "body fat percentage"]
         }
       }
       ```
   - Include 40-50 common biomarkers across categories:
     - **Iron panel**: Ferritin, Serum Iron, TIBC, Transferrin Saturation
     - **Vitamins**: D, B12, Folate, B6
     - **Lipids**: Total Cholesterol, LDL, HDL, Triglycerides, VLDL, TC/HDL ratio
     - **Thyroid**: TSH, Free T3, Free T4, T3, T4
     - **Liver**: ALT, AST, ALP, GGT, Bilirubin, Albumin
     - **Kidney**: Creatinine, BUN, eGFR, Uric Acid
     - **Metabolic**: Fasting Glucose, HbA1c, Insulin
     - **Hormones**: Testosterone (total, free), Estradiol, DHEA-S, Cortisol
     - **Blood count**: Hemoglobin, RBC, WBC, Platelets, MCV, MCH, MCHC
     - **Inflammation**: CRP, hs-CRP, ESR, Homocysteine
     - **Minerals**: Calcium, Magnesium, Zinc, Selenium
   
   - Function: `classify_biomarker(name: str, value: float, sex: str) -> BiomarkerStatus`
     - Returns: optimal, normal, suboptimal, out_of_range, or critical
     - Uses optimal ranges, not lab ranges

6. Build the supplement stack manager:
   - Endpoints:
     - `POST /api/supplements` - Add a supplement
     - `GET /api/supplements` - List active supplements
     - `PUT /api/supplements/{id}` - Update supplement (dose, frequency)
     - `DELETE /api/supplements/{id}` - Deactivate (soft delete, keeps history)
     - `GET /api/supplements/history` - Full supplement change history
   - Create `supplement_interactions.json`:
     - Known interactions between supplements and between supplements and biomarkers
     - Example:
       ```json
       {
         "Iron Bisglycinate": {
           "enhances_absorption": ["Vitamin C"],
           "inhibits_absorption": ["Calcium", "Zinc", "Coffee", "Tea"],
           "timing_note": "Take on empty stomach or with Vitamin C. Separate from calcium and zinc by 2+ hours.",
           "relevant_biomarkers": ["Ferritin", "Serum Iron", "Hemoglobin", "Transferrin Saturation"],
           "expected_effect": "Ferritin should increase by 10-30 ng/mL over 3 months with consistent supplementation"
         }
       }
     ```
     - Cover 20-30 common supplements

7. Create sample blood work PDF:
   - Generate a realistic Indian lab report format (Thyrocare style)
   - Include 30+ biomarkers with a mix of optimal, suboptimal, and out-of-range values
   - Save as `sample-data/sample_bloodwork.pdf`

8. Create endpoints:
   - `POST /api/bloodwork/upload` - Upload blood work PDF
     - Parse the PDF
     - Extract biomarkers
     - Classify each against optimal ranges
     - Store in database
     - Return parsed results with status per biomarker
   - `GET /api/bloodwork` - List all blood work reports with dates
   - `GET /api/bloodwork/{id}` - Get a specific report with all biomarkers
   - `GET /api/biomarkers/{name}/history` - Get historical values for a specific biomarker across all reports
   - `POST /api/profile` - Create/update health profile (age, sex, height, weight)
   - `GET /api/profile` - Get health profile

### Test criteria:
- PDF parsing extracts biomarkers from sample blood work
- Biomarker classification correctly identifies optimal/suboptimal/out-of-range
- Multiple blood work uploads create historical timeline
- Biomarker history returns values across reports sorted by date
- Supplement CRUD works with history tracking
- Supplement interactions are flagged
- Health profile persists

### Commit message: `feat: blood work PDF parsing, biomarker engine, and supplement management`

---

## COMMIT BLOCK 2 (Day 2): Wearable Data Ingestion (Apple Health, Whoop, Garmin)

### What to build:

1. Build Apple Health parser (`apple_health.py`):
   - Function: `parse_apple_health_export(file_path: str, since_date: Optional[str] = None) -> List[WearableDataPoint]`
   - Apple Health exports as a large XML file (`export.xml`)
   - Parse the XML and extract:
     - **Resting Heart Rate**: `HKQuantityTypeIdentifierRestingHeartRate`
     - **Heart Rate Variability**: `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`
     - **Steps**: `HKQuantityTypeIdentifierStepCount`
     - **Active Calories**: `HKQuantityTypeIdentifierActiveEnergyBurned`
     - **Sleep**: `HKCategoryTypeIdentifierSleepAnalysis` (calculate total sleep hours per night)
     - **Weight**: `HKQuantityTypeIdentifierBodyMass`
     - **Body Fat %**: `HKQuantityTypeIdentifierBodyFatPercentage`
     - **VO2 Max**: `HKQuantityTypeIdentifierVO2Max`
     - **Respiratory Rate**: `HKQuantityTypeIdentifierRespiratoryRate`
     - **SpO2**: `HKQuantityTypeIdentifierOxygenSaturation`
     - **Workout minutes**: `HKQuantityTypeIdentifierAppleExerciseTime`
   - Aggregate to daily values:
     - Steps: sum per day
     - Resting HR: average per day
     - HRV: average per day
     - Sleep: total hours per night (handle sleep spanning midnight)
     - Calories: sum per day
     - Weight/Body fat: latest reading per day
   - The `since_date` parameter allows incremental imports (only new data since last sync)
   - Handle large files efficiently (Apple Health exports can be 500MB+):
     - Use `iterparse` instead of loading full XML into memory
     - Process records in chunks

2. Build Whoop parser (`whoop_parser.py`):
   - Function: `parse_whoop_csv(file_path: str) -> List[WearableDataPoint]`
   - Whoop exports as CSV with columns like:
     - Date, Recovery Score, HRV (ms), Resting HR, Sleep Hours, Sleep Quality, Strain, Calories
   - Map to standard metric types
   - Handle Whoop-specific metrics:
     - Recovery Score (0-100): map to `recovery_score`
     - Strain (0-21): map to `strain`

3. Build Garmin parser (`garmin_parser.py`):
   - Function: `parse_garmin_csv(file_path: str) -> List[WearableDataPoint]`
   - Garmin Connect exports various CSVs
   - Parse common formats:
     - Activities CSV: date, type, duration, calories, avg HR, max HR
     - Daily summary: steps, floors, active minutes, sleep
     - Body composition: weight, body fat, BMI
   - Map to standard metric types

4. Standard data model for all wearables:
   ```python
   class WearableDataPoint(BaseModel):
       source: str                        # "apple_health", "whoop", "garmin"
       date: str                          # YYYY-MM-DD
       metric_type: str                   # Standardized metric name
       value: float
       unit: str
   
   # Standard metric types across all sources:
   # resting_hr (bpm), hrv (ms), sleep_hours (hours), sleep_quality (0-100),
   # steps (count), active_calories (kcal), weight (kg), body_fat (%), 
   # vo2_max (mL/kg/min), respiratory_rate (breaths/min), spo2 (%),
   # recovery_score (0-100, Whoop only), strain (0-21, Whoop only),
   # workout_minutes (min)
   ```

5. Build the daily sync mechanism:
   - When user uploads a new Apple Health export, only import data newer than the latest existing record
   - Function: `get_latest_date(source: str) -> Optional[str]`
   - On import: skip records older than latest date, only insert new data
   - This enables the "daily refresh" pattern:
     - User exports Apple Health data (manually for now, can be automated later)
     - Uploads the full export
     - System only processes new records since last sync
     - Dashboard updates with latest data

6. Deduplication logic:
   - If the same date + source + metric_type already exists, skip or update
   - Prevent double-counting when user re-uploads the same export

7. Create endpoints:
   - `POST /api/wearables/apple-health` - Upload Apple Health XML export
     - Parse incrementally (only new data)
     - Return: records imported count, date range, metrics found
   - `POST /api/wearables/whoop` - Upload Whoop CSV export
   - `POST /api/wearables/garmin` - Upload Garmin CSV export
   - `GET /api/wearables/latest` - Get latest data point for each metric
   - `GET /api/wearables/daily/{date}` - Get all metrics for a specific date
   - `GET /api/wearables/range?metric={type}&start={date}&end={date}` - Get a metric over a date range
   - `GET /api/wearables/sync-status` - Show last sync date per source and record counts
   - `POST /api/wearables/refresh` - Re-process the latest uploaded file (useful if parsing was updated)

8. Create sample data files:
   - `sample_apple_health.xml`: 30 days of realistic Apple Health data (resting HR ~58-65, HRV ~35-55, steps ~8000-12000, sleep ~6-8 hrs, weight ~76-77kg)
   - `sample_whoop.csv`: 30 days of Whoop data with recovery, strain, sleep
   - `sample_garmin.csv`: 30 days of Garmin daily summaries

### Design direction for frontend (just the upload UI in this block):
- **WearablesPage.jsx**:
  - Three sections: Apple Health, Whoop, Garmin
  - Each section:
    - Upload zone for the respective file format
    - Last sync date and record count
    - "Sync Now" button (re-upload latest export)
    - Status: "Last synced: May 18, 2026 | 45 days of data"
  - Quick stats from latest wearable data:
    - Today's resting HR, HRV, steps, sleep hours
    - Displayed as metric cards with sparkline trends (last 7 days)

### Test criteria:
- Apple Health XML parses correctly and extracts all metric types
- Incremental import only adds new records
- Deduplication prevents double entries
- Whoop and Garmin CSVs parse correctly
- Daily aggregation works (steps summed, HR averaged)
- Sync status shows correct dates and counts
- Large Apple Health files don't crash the server (streaming parse)
- Sample data loads correctly

### Commit message: `feat: wearable data ingestion for Apple Health, Whoop, and Garmin`

---

## COMMIT BLOCK 3 (Day 3): AI Health Analysis Engine & Insights

### What to build:

1. Build the AI health engine (`ai_health_engine.py`):
   - Function: `generate_health_insights(profile, biomarkers, wearable_data, supplements, genetics) -> HealthInsights`
   - Uses Claude API (model: claude-sonnet-4-20250514)
   - API key from environment variable `ANTHROPIC_API_KEY`

2. **Insight types to generate**:

   ```python
   class BloodWorkInsight(BaseModel):
       biomarker: str
       current_value: float
       unit: str
       status: str
       trend: Optional[str]              # "improving", "declining", "stable", "new" (first test)
       previous_value: Optional[float]
       explanation: str                   # Why this matters
       recommendation: str               # What to do about it
       related_supplements: List[str]     # Current supplements that affect this
       supplement_adjustment: Optional[str] # "increase dose", "add supplement", "timing change", "no change needed"
       retest_timeline: Optional[str]     # "Retest in 3 months"
       priority: str                      # "action_required", "monitor", "optimal"

   class WearableTrendInsight(BaseModel):
       metric: str
       trend_direction: str              # "improving", "declining", "stable", "volatile"
       current_avg: float                # Last 7-day average
       previous_avg: float               # Prior 7-day average
       change_percent: float
       explanation: str
       recommendation: str
       related_biomarkers: List[str]     # Biomarkers that might explain this trend

   class CrossSourceCorrelation(BaseModel):
       finding: str                      # "Your HRV decline correlates with low ferritin"
       data_points: List[str]            # What data supports this
       confidence: str                   # "high", "medium", "low"
       mechanism: str                    # Why these might be connected
       recommendation: str
       priority: str

   class SupplementInsight(BaseModel):
       supplement: str
       effectiveness: str                # "working", "not_yet_effective", "no_change", "unknown"
       evidence: str                     # What data shows this
       interaction_warnings: List[str]   # Conflicts with other supplements or timing
       recommendation: str               # "continue", "adjust_dose", "stop", "change_timing"

   class DailySnapshot(BaseModel):
       date: str
       overall_score: int                # 0-100 daily health score
       highlights: List[str]             # Top 3 things to note today
       recommendations: List[str]        # Top 3 actions for today
       recovery_status: str              # "fully_recovered", "moderate", "needs_rest"
       sleep_quality_note: str
       activity_note: str

   class HealthInsights(BaseModel):
       generated_at: str
       overall_health_score: int         # 0-100
       score_explanation: str
       bloodwork_insights: List[BloodWorkInsight]
       wearable_trends: List[WearableTrendInsight]
       correlations: List[CrossSourceCorrelation]
       supplement_insights: List[SupplementInsight]
       daily_snapshot: DailySnapshot
       action_items: List[str]           # Prioritized list of what to do
       disclaimer: str                   # Always present
   ```

3. The main analysis prompt should:
   - Include the full health profile (age, sex, height, weight)
   - Include all biomarkers from the latest blood work with historical values
   - Include the last 30 days of wearable data (daily averages)
   - Include the current supplement stack with dosages and timing
   - Include any genetic markers if available
   - Tell Claude to act as a functional medicine practitioner and sports science expert
   - Ask for cross-source correlations specifically
   - Tell Claude to check supplement effectiveness against biomarker trends
   - Tell Claude to flag any supplement interactions or timing conflicts
   - Always include the health disclaimer
   - Return ONLY valid JSON matching the schema

4. **Daily snapshot generation**:
   - Function: `generate_daily_snapshot(date: str) -> DailySnapshot`
   - Uses the latest wearable data for that day plus recent blood work context
   - Lighter analysis (fewer tokens) since it runs daily
   - Prompt focuses on: recovery status, sleep quality, activity recommendations for today
   - Cache daily snapshots so they don't regenerate on every page load

5. **Incremental insight updates**:
   - When new wearable data is synced: regenerate wearable trends and daily snapshot only
   - When new blood work is uploaded: regenerate full analysis (all insight types)
   - When supplements change: regenerate supplement insights and correlations
   - Store insights in the `ai_insights` table with timestamps
   - Show "Last analyzed: [date]" with a "Refresh Insights" button

6. Create endpoints:
   - `POST /api/insights/generate` - Generate full health insights
     - Gathers all data, sends to Claude, stores results
     - Returns HealthInsights
   - `POST /api/insights/daily` - Generate daily snapshot
     - Lighter analysis for today's wearable data
     - Returns DailySnapshot
   - `GET /api/insights/latest` - Get most recent stored insights
   - `GET /api/insights/history` - Get past insights to see how recommendations changed
   - `POST /api/insights/dismiss/{id}` - Dismiss an insight
   - `POST /api/insights/ask` - Ask a specific health question
     - Accepts: `{ "question": "Should I increase my iron dose?" }`
     - Claude answers using all available health data as context
     - Returns focused answer with data references

7. Add retry logic for Claude API calls

8. **Frontend: Blood Work Report View** (BloodWorkPage.jsx):
   - Upload section at top (drag-and-drop PDF)
   - After upload, show parsed results:
     - Report date, lab name, parse confidence
     - Biomarker table grouped by category (iron, vitamins, lipids, etc.)
     - Each row: biomarker name, value, unit, reference range, optimal range, status badge
     - Status badges color coded: green (optimal), blue (normal), yellow (suboptimal), red (out of range), purple (critical)
     - Sparkline trend chart next to each biomarker if historical data exists (mini chart showing last 3-5 values)
   - Previous reports listed below as cards (click to view)

9. **Frontend: Insights Panel** (shown on dashboard):
   - Top: Overall health score as large circular gauge
   - Action items list (prioritized)
   - Blood work insights as cards
   - Wearable trend insights as cards
   - Cross-source correlations highlighted prominently
   - Supplement insights
   - "Ask a question" input at bottom
   - Disclaimer banner at the top of every insights view

### Design direction:
- Health-focused color palette: dark background (#0F172A), white text, green for optimal/positive, amber for warnings, red for action required, blue for informational
- Biomarker status colors: optimal (#10B981), normal (#3B82F6), suboptimal (#F59E0B), out_of_range (#EF4444), critical (#7C3AED)
- Health score gauge: large, centered, color gradient from red (0) through yellow (50) to green (100)
- Insight cards: dark cards with colored left border matching severity
- Sparkline charts: tiny, inline, showing trend direction
- The blood work table should feel like a premium lab report

### Test criteria:
- AI generates meaningful insights from blood work + wearable data
- Cross-source correlations are specific and evidence-based
- Supplement insights reference actual biomarker trends
- Daily snapshot generates quickly
- Insights persist and can be retrieved
- Custom questions return relevant answers
- Blood work report displays correctly with all biomarkers
- Status badges and sparklines render correctly

### Commit message: `feat: AI health analysis engine with cross-source insights and blood work UI`

---

## COMMIT BLOCK 4 (Day 4): Dashboard, Trends & Correlations

### What to build:

1. **DashboardPage.jsx** (the main view):
   - **Top row: Key metrics** (4-6 cards):
     - Health Score (circular gauge)
     - Latest Resting HR (with 7-day trend arrow)
     - Latest HRV (with 7-day trend arrow)
     - Last Night's Sleep (hours + quality)
     - Current Weight (with 30-day trend)
     - Open Action Items count
   - **Daily Snapshot card**:
     - Today's overall status
     - Top 3 highlights
     - Top 3 recommendations
     - Recovery status badge
   - **Trend charts section** (2x2 grid):
     - Weight over time (line chart, 90 days)
     - Resting HR over time (line chart, 30 days)
     - HRV over time (line chart, 30 days)
     - Sleep hours over time (bar chart, 30 days)
   - **Recent insights** (latest 5 AI insights)
   - **Upcoming actions**:
     - "Retest ferritin in 6 weeks"
     - "Review supplement timing"
     - Based on AI recommendations
   - **"Sync Data" button**: Quick upload for Apple Health refresh
   - **"New Blood Work" button**: Quick upload for blood test results

2. Build the trend analyzer (`trend_analyzer.py`):
   - Function: `analyze_trend(values: List[Tuple[date, float]], window: int = 7) -> TrendAnalysis`
   - Calculate:
     - Moving average (7-day and 30-day)
     - Trend direction (improving/declining/stable) based on slope of regression line
     - Rate of change (% per week)
     - Volatility (standard deviation)
     - Min, max, current in the period
     - Whether the trend is statistically significant
   
   ```python
   class TrendAnalysis(BaseModel):
       metric_type: str
       period_days: int
       current_value: float
       avg_7day: float
       avg_30day: float
       trend_direction: str              # "improving", "declining", "stable"
       change_rate_per_week: float       # % change per week
       volatility: float                 # Standard deviation
       min_value: float
       max_value: float
       is_significant: bool              # Is the trend statistically meaningful
   ```

3. Build the correlation engine (`correlation_engine.py`):
   - Function: `find_correlations(wearable_data, biomarkers) -> List[Correlation]`
   - Calculate Pearson correlation between time-series metrics:
     - HRV vs Sleep hours
     - Resting HR vs Active calories
     - Weight vs Sleep
     - HRV vs Steps (overtraining signal)
     - Sleep vs Recovery score (if Whoop data)
   - Cross-reference with blood work:
     - If ferritin is low AND energy/recovery metrics are declining: flag correlation
     - If Vitamin D is low AND sleep quality is poor: flag correlation
     - If inflammation markers are high AND HRV is low: flag correlation
   - Only flag correlations above a threshold (r > 0.3 or r < -0.3)
   
   ```python
   class CorrelationResult(BaseModel):
       metric_a: str
       metric_b: str
       correlation_coefficient: float
       direction: str                    # "positive", "negative"
       strength: str                     # "strong", "moderate", "weak"
       interpretation: str               # Plain English explanation
       data_points: int                  # How many days of overlap
   ```

4. **TrendChart.jsx** (reusable chart component):
   - Uses Recharts
   - Line chart with configurable:
     - Metric type, date range, color
     - Optional reference lines for optimal range
     - Optional overlay of second metric (for correlation visualization)
     - Moving average line toggle
     - Tooltip showing date, value, and status
   - Supports: daily, weekly, monthly aggregation

5. **CorrelationPanel.jsx**:
   - Shows discovered correlations as cards
   - Each card:
     - Two metrics being correlated
     - Correlation strength visual (bar or dots)
     - Direction arrow (positive/negative)
     - Plain English interpretation
     - "View Chart" button that shows both metrics overlaid on a dual-axis chart
   - Only show moderate+ correlations

6. **HealthTimeline.jsx** (vertical timeline):
   - Chronological view of all health events:
     - Blood work uploads (with key findings)
     - Supplement changes (started, stopped, dose changed)
     - Significant wearable trends (HRV dropped significantly)
     - AI insights generated
   - Each event as a card on the timeline
   - Filter by event type
   - This gives a narrative of your health journey

7. **Biomarker deep-dive**:
   - Click any biomarker name anywhere in the app
   - Opens a panel/modal showing:
     - Full history chart across all blood work reports
     - Optimal range highlighted as a band on the chart
     - Related supplements and their start dates overlaid as markers
     - AI interpretation of the trend
     - Related wearable metrics that might correlate

8. Create endpoints:
   - `GET /api/dashboard` - Get all dashboard data in one call
     - Latest metrics, trends, recent insights, action items
   - `GET /api/trends/{metric_type}?days=30` - Get trend analysis for a metric
   - `GET /api/correlations` - Get all significant correlations
   - `GET /api/timeline?start={date}&end={date}` - Get health timeline events
   - `GET /api/biomarkers/{name}/deep-dive` - Get full biomarker analysis with history, supplements, and correlations

### Design direction:
- Dashboard: grid-based, data-dense but not cluttered
- Metric cards: large number, small label, sparkline trend, subtle colored background based on status
- Charts: clean, minimal axes, smooth curves, accent colors, reference bands for optimal ranges in semi-transparent green
- Correlation panel: visual strength indicator (filled dots or bars)
- Timeline: vertical line with event cards branching left/right alternating
- Biomarker deep-dive: full-width chart with supplement overlay markers
- Overall feel: premium health analytics dashboard, like a luxury health app

### Test criteria:
- Dashboard loads with all metrics from sample data
- Trend charts render correctly for all metric types
- Correlations calculate and display correctly
- Timeline shows events in chronological order
- Biomarker deep-dive shows history with supplement overlays
- Reference range bands display on charts
- Date range selection works on all charts
- Moving average toggle works

### Commit message: `feat: health dashboard with trend analysis, correlations, and biomarker deep-dive`

---

## COMMIT BLOCK 5 (Day 5): Genetics Integration & Advanced Features

### What to build:

1. Build the genetics parser (`genetics_parser.py`):
   - Function: `parse_23andme_raw(file_path: str) -> List[GeneticMarker]`
   - 23andMe raw data format: TSV with columns (rsid, chromosome, position, genotype)
   - Parse and match against a curated SNP database
   - Create `snp_database.json` with 50-80 health-relevant SNPs:
   
   ```json
   {
     "rs1801133": {
       "gene": "MTHFR",
       "name": "MTHFR C677T",
       "category": "methylation",
       "variants": {
         "CC": {"risk": "normal", "description": "Normal MTHFR function"},
         "CT": {"risk": "moderate", "description": "Reduced MTHFR enzyme activity (~35%). May need methylfolate instead of folic acid."},
         "TT": {"risk": "elevated", "description": "Significantly reduced MTHFR activity (~70%). Methylfolate strongly recommended. Monitor homocysteine."}
       },
       "affected_biomarkers": ["Homocysteine", "Folate", "B12"],
       "supplement_implications": {
         "elevated": "Use methylfolate (5-MTHF) instead of folic acid. Consider methylcobalamin B12.",
         "moderate": "Methylfolate preferred. Monitor homocysteine levels."
       }
     }
   }
   ```
   
   - Categories of SNPs to include:
     - **Methylation**: MTHFR, COMT, MTR, MTRR
     - **Detoxification**: GSTT1, GSTM1, CYP1A2 (caffeine metabolism)
     - **Inflammation**: IL-6, TNF-alpha, IL-1beta
     - **Nutrient metabolism**: VDR (Vitamin D receptor), FUT2 (B12 absorption), SLC30A8 (zinc)
     - **Cardiovascular**: APOE, LPA, PCSK9
     - **Fitness**: ACTN3 (muscle fiber type), ACE (endurance vs power)
     - **Sleep**: CLOCK gene, PER2
     - **Iron**: HFE (hemochromatosis risk)

2. **Genetics integration with existing insights**:
   - When genetics data is available, enhance the AI analysis:
     - If MTHFR variant + high homocysteine in blood work: flag with specific supplement recommendation
     - If VDR variant + low Vitamin D: explain why they may need higher doses
     - If CYP1A2 slow metabolizer: note caffeine sensitivity in daily recommendations
     - If ACTN3 RR: note power/sprint genetic advantage in training recommendations
     - If HFE variant: extra caution with iron supplementation
   - The AI prompt now includes genetic data as an additional context layer

3. **GeneticsPage.jsx**:
   - Upload zone for 23andMe/Ancestry raw data file
   - After parsing, show results grouped by category:
     - Each category (methylation, detox, fitness, etc.) as an expandable section
     - Each SNP shows: gene name, rsid, your genotype, risk level badge, description
     - Risk badges: elevated (red), moderate (amber), normal (green), protective (blue)
   - "Implications for your bloodwork" section:
     - Cross-references genetic variants with biomarker data
     - e.g., "You have MTHFR CT variant. Your homocysteine is 12.4 (suboptimal). Consider switching to methylfolate."
   - "Implications for supplements" section:
     - Based on genetic variants, recommend supplement adjustments
   - Disclaimer: "Genetic insights are for educational purposes only. Consult a genetic counselor for medical decisions."

4. **Goal setting and tracking**:
   - Let user set health goals:
     - Target weight
     - Target body fat %
     - Biomarker targets (e.g., "Get ferritin above 80")
     - Fitness targets (e.g., "HRV above 50ms")
   - Track progress toward goals on dashboard
   - AI factors goals into recommendations
   
   ```sql
   CREATE TABLE health_goals (
       id TEXT PRIMARY KEY,
       metric_type TEXT,                  -- "weight", "body_fat", "ferritin", "hrv", etc.
       target_value REAL,
       target_date TEXT,
       current_value REAL,
       started_at TEXT,
       status TEXT                        -- "in_progress", "achieved", "missed"
   );
   ```
   
   - Endpoints:
     - `POST /api/goals` - Create a goal
     - `GET /api/goals` - List active goals
     - `PUT /api/goals/{id}` - Update goal
     - `DELETE /api/goals/{id}` - Remove goal

5. **Report generation**:
   - "Generate Health Report" button
   - Creates a comprehensive PDF or markdown report:
     - Health profile summary
     - Current biomarkers with status
     - Wearable trends (30-day)
     - Genetic insights (if available)
     - Supplement stack review
     - AI recommendations
     - Goals and progress
   - Useful for sharing with a doctor or trainer
   - "Copy for Doctor" button: generates a concise version focused on biomarkers and concerns

6. Create endpoints:
   - `POST /api/genetics/upload` - Upload 23andMe/Ancestry raw data
   - `GET /api/genetics` - Get parsed genetic markers
   - `GET /api/genetics/implications` - Get cross-referenced implications with blood work and supplements
   - `POST /api/report/generate` - Generate comprehensive health report
   - `GET /api/report/doctor-summary` - Generate doctor-friendly summary

### Test criteria:
- 23andMe raw data parses correctly
- SNPs are matched against the database
- Genetic insights cross-reference with blood work
- Supplement implications factor in genetic variants
- Goal tracking works with progress updates
- Report generation produces clean output
- Genetic data enhances AI analysis when available
- All disclaimers are present

### Commit message: `feat: genetics integration, goal tracking, and health report generation`

---

## COMMIT BLOCK 6 (Day 6): Frontend Polish, Onboarding & README

### What to build:

1. **Onboarding flow** (first-time user):
   - Step 1: "Set Up Your Profile" - age, sex, height, weight
   - Step 2: "Upload Blood Work" - drag-and-drop PDF, or "Skip for now"
   - Step 3: "Sync Wearable Data" - upload Apple Health/Whoop/Garmin, or "Skip for now"
   - Step 4: "Enter Your Supplements" - quick add common supplements, or "Skip for now"
   - Step 5: "Generate Your First Insights" - button to run AI analysis
   - After onboarding, land on the dashboard
   - "Load Sample Data" option for demo purposes

2. **Sample data onboarding**:
   - "Try VitalIQ with sample data" button
   - Loads all sample data files + pre-cached AI insights
   - Instant demo of a fully populated dashboard
   - This is critical for the portfolio demo

3. **Supplement quick-add**:
   - Pre-built list of common supplements with default dosages:
     - Iron Bisglycinate 25mg, Vitamin D3 5000IU, Vitamin K2 100mcg, B12 1000mcg, Zinc Glycinate 30mg, Magnesium Glycinate 400mg, Creatine 5g, Vitamin C 1000mg, Omega-3 1000mg, Ashwagandha 600mg
   - Click to add with default dosage, editable

4. **Notifications/alerts system**:
   - When wearable data shows concerning trends (HRV dropped 20%+ in a week), surface an alert
   - When a retest date is approaching, remind the user
   - When a supplement has been active for 3+ months with no blood work to verify effectiveness, suggest retesting
   - Alerts appear on dashboard and in a notification panel

5. **Settings page**:
   - Update health profile
   - Manage data sources (see what's connected, clear data per source)
   - Export all data as JSON (data portability)
   - Clear all data (reset)
   - Set preferred units (metric/imperial)

6. **Polish**:
   - Skeleton loaders for all data-heavy views
   - Toast notifications for all actions (upload, sync, insight generated, goal achieved)
   - Smooth animations on charts and cards
   - Empty states for each section with helpful CTAs
   - Error handling for PDF parsing failures (suggest trying the Claude fallback)
   - Mobile-responsive: dashboard adapts to narrow screens (stack cards vertically)
   - All charts have proper tooltips and hover states
   - Health disclaimer banner on every page with AI-generated content

7. **README.md**:
   - **Hero**: "VitalIQ" with tagline "Your AI health intelligence platform. Every biomarker, every trend, every insight."
   - **The Problem**: "Health data is fragmented. Blood work sits in lab PDFs. Wearable data lives in apps. Supplements are tracked in your head. No one connects the dots between your ferritin levels, your sleep quality, and your supplement timing. Not even your doctor, who sees you for 15 minutes twice a year."
   - **The Solution**: "VitalIQ ingests all your health data, blood work, wearables, supplements, and genetics, then uses AI to find patterns, flag risks, and give you specific, actionable recommendations. It's like having a functional medicine doctor who sees all your data, every day."
   - **Features**:
     - Blood work PDF parsing with optimal range analysis (not just lab ranges)
     - Apple Health, Whoop, and Garmin data import with daily refresh
     - Supplement stack tracking with interaction checks
     - 23andMe/Ancestry genetic data integration
     - AI-powered cross-source correlations
     - Biomarker trend tracking across multiple blood tests
     - Daily health snapshots and recovery scoring
     - Goal setting and progress tracking
     - Comprehensive health report generation
     - Doctor-friendly summary export
   - **Tech Stack**: Listed with justifications
   - **Architecture**: Diagram showing Data Sources (PDF, XML, CSV, TXT) -> Parsers -> SQLite -> AI Analysis (Claude) -> Dashboard with Trends, Correlations, Insights
   - **Health Disclaimer**: Prominent note that this is not medical advice
   - **Getting Started**: Setup instructions
   - **Screenshots**: 8-10 screenshots
   - **Data Privacy**: Note that all data is stored locally, never sent to third parties (only Claude API for analysis)

8. **Screenshots**: Capture:
   - Onboarding flow
   - Dashboard with all metrics
   - Blood work report with biomarker table
   - Biomarker deep-dive with trend chart
   - Wearable data trends
   - AI insights panel
   - Correlation panel
   - Genetics page
   - Goal tracking
   - Health report output
   - Store in `/screenshots`

9. **.env.example**:
   ```
   ANTHROPIC_API_KEY=your_key_here
   DATABASE_URL=sqlite:///./health_data/vitaliq.db
   ```

10. **Code cleanup**

### Commit message: `docs: onboarding, sample data, settings, README, and polish`

---

## Portfolio Framing

**Title**: VitalIQ - AI Health Intelligence Platform

**Client context**: "Built for a health-tech startup targeting biohackers and health-conscious individuals who track their health data obsessively but struggle to connect insights across blood work, wearables, supplements, and genetics."

**Problem**: "Health data is fragmented across lab PDFs, wearable apps, supplement spreadsheets, and genetic reports. No tool connects the dots. A person can have declining HRV, low ferritin, and an iron supplement, but no system tells them these are related or whether the supplement is working."

**Solution**: "An AI-powered health intelligence platform that ingests all health data sources, builds a persistent profile, tracks trends over time, finds cross-source correlations, and generates specific, personalized health recommendations."

**My role**: "Full-stack development, health data pipeline architecture, PDF parsing engine, AI prompt engineering for medical context, time-series analysis, and dashboard design."

**Results**: "Identified 5 cross-source correlations in testing that manual tracking missed entirely. Reduced time to understand blood work from 30 minutes of Googling to 30 seconds of AI-generated insights. Users reported supplement stack optimizations they hadn't considered."

**Tech**: Python, FastAPI, React, TailwindCSS, Recharts, Claude API, SQLite, pandas, PyMuPDF, tabula-py

**Link**: GitHub repo link | Live demo link

---

## Notes for Claude Code
- Use Python 3.11+ syntax
- Use the official `anthropic` SDK for Claude API calls
- `tabula-py` requires Java installed. Add a note in README. Fall back gracefully if not available.
- Apple Health XML files can be HUGE (500MB+). Use `xml.etree.ElementTree.iterparse()` for streaming, NEVER `parse()` which loads entire file into memory.
- SQLite with standard `sqlite3` library. No ORM needed.
- FastAPI on port 8000, Vite on port 5173
- Proxy config in vite.config.js for /api routes
- All API routes prefixed with /api
- Environment variables for config
- Type hints on all Python functions
- Biomarker name normalization is critical. Lab reports use inconsistent names. Build a mapping dictionary.
- For the Claude health analysis prompt: always include the disclaimer instruction. Claude should never claim to diagnose.
- Recharts for all charting. Use `ResponsiveContainer` for responsive charts.
- Reference range bands on charts: use Recharts `ReferenceArea` component with green fill at low opacity.
- Store all data locally. Privacy is a feature. Mention this prominently.
- The sample blood work PDF: use reportlab or a similar library to generate a realistic-looking lab report PDF. Or create it manually in a doc editor and export as PDF.
