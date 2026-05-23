# VitalIQ

**Your AI health intelligence platform. Every biomarker, every trend, every insight.**

## The Problem

Health data is fragmented. Blood work sits in lab PDFs. Wearable data lives in apps. Supplements are tracked in your head. No one connects the dots between your ferritin levels, your sleep quality, and your supplement timing. Not even your doctor, who sees you for 15 minutes twice a year.

## The Solution

VitalIQ ingests all your health data — blood work, wearables, supplements, and genetics — then uses AI to find patterns, flag risks, and give you specific, actionable recommendations. It's like having a functional medicine doctor who sees all your data, every day.

## Features

- **Blood work PDF parsing** with optimal range analysis (not just lab ranges)
- **Apple Health, Whoop, and Garmin** data import with incremental sync
- **Supplement stack tracking** with interaction checks
- **23andMe genetic data** integration with biomarker cross-referencing
- **AI-powered cross-source correlations** (e.g., ferritin ↔ HRV)
- **Biomarker trend tracking** across multiple blood tests with moving averages
- **Daily health snapshots** and recovery scoring
- **Pearson correlation analysis** between wearable metrics
- **Goal setting** and progress tracking
- **Comprehensive health report** generation
- **Doctor-friendly summary** export for provider visits
- **Guided onboarding** with sample data demo

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Python 3.13, FastAPI | Async-ready, auto-docs, Pydantic validation |
| **Database** | SQLite (WAL mode) | Zero config, portable, fast reads for single-user |
| **PDF Parsing** | PyMuPDF (fitz) | Fast, no Java dependency (unlike tabula) |
| **Frontend** | React 19, Vite 8 | Fast HMR, modern tooling |
| **Styling** | Tailwind CSS v4 | Utility-first, dark theme, responsive |
| **Charts** | Recharts | Composable, React-native charting |
| **State** | Zustand | Minimal boilerplate, hooks-based |
| **AI Engine** | Rule-based (Claude-ready) | Strategy pattern: works without API key, upgradable |

## Architecture

```
Data Sources          Parsers              Storage        Analysis          Frontend
─────────────      ───────────────      ──────────      ───────────      ────────────
Lab PDFs      ───→ PDF Parser      ───→                                  Dashboard
                   (PyMuPDF)             SQLite DB  ───→ Rule Engine ───→ Trends
Apple Health  ───→ XML Parser     ───→  (WAL mode)      - Bloodwork      Correlations
                   (iterparse)                          - Wearables      Insights
Whoop CSV     ───→ CSV Parser     ───→                  - Cross-src      Genetics
Garmin CSV    ───→ CSV Parser     ───→                  - Supplements    Goals
23andMe TXT   ───→ TSV Parser     ───→                  - Genetics       Reports
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Setup

```bash
# Clone
git clone https://github.com/cbrahmam/VitalIQ.git
cd VitalIQ

# Backend
cd backend
python -m venv venv
source venv/bin/activate     # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the onboarding wizard will guide you through setup. Click **"Try VitalIQ with sample data"** for an instant demo.

### Optional: AI-Powered Analysis

To enable Claude-powered analysis instead of rule-based:

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET/POST | Health profile |
| `/api/bloodwork/upload` | POST | Upload lab PDF |
| `/api/bloodwork` | GET | List reports |
| `/api/biomarkers/{name}/history` | GET | Biomarker trend |
| `/api/biomarkers/{name}/deep-dive` | GET | Full biomarker analysis |
| `/api/wearables/apple-health` | POST | Upload Apple Health XML |
| `/api/wearables/whoop` | POST | Upload Whoop CSV |
| `/api/wearables/garmin` | POST | Upload Garmin CSV |
| `/api/wearables/latest` | GET | Latest wearable metrics |
| `/api/supplements` | GET/POST | Supplement stack |
| `/api/genetics/upload` | POST | Upload 23andMe data |
| `/api/genetics/implications` | GET | Genetic-biomarker links |
| `/api/insights/generate` | POST | Generate AI insights |
| `/api/insights/ask` | POST | Ask health questions |
| `/api/dashboard` | GET | Aggregated dashboard data |
| `/api/trends/{metric}` | GET | Trend analysis |
| `/api/correlations` | GET | Metric correlations |
| `/api/goals` | GET/POST/PUT/DELETE | Health goals |
| `/api/report/generate` | POST | Full health report |
| `/api/report/doctor-summary` | GET | Doctor-friendly summary |
| `/api/data/load-sample` | POST | Load sample data |
| `/api/data/export` | GET | Export all data (JSON) |

## Health Disclaimer

**This tool is for informational purposes only and does not constitute medical advice.** All insights, recommendations, and analysis are observations and suggestions — not diagnoses. Always consult your healthcare provider before making changes to your health regimen. VitalIQ does not claim to diagnose, treat, cure, or prevent any disease.

## Data Privacy

All data is stored locally in a SQLite database on your machine. No health data is sent to third parties. If you enable Claude AI analysis, only anonymized biomarker values are sent to Anthropic's API — no personally identifiable information.

## License

MIT
