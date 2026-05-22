from pydantic import BaseModel
from typing import Optional


class HealthProfileCreate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None


class HealthProfileResponse(BaseModel):
    id: str
    name: Optional[str]
    age: Optional[int]
    sex: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    created_at: str
    updated_at: str


class ParsedBiomarker(BaseModel):
    name: str
    value: float
    unit: str
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    raw_text: str


class BloodWorkParseResult(BaseModel):
    report_id: str
    report_date: Optional[str]
    lab_name: Optional[str]
    biomarkers: list["BiomarkerResponse"]
    parse_method: str
    parse_confidence: str
    warnings: list[str]


class BiomarkerResponse(BaseModel):
    id: str
    name: str
    value: float
    unit: str
    lab_reference_low: Optional[float]
    lab_reference_high: Optional[float]
    optimal_low: Optional[float]
    optimal_high: Optional[float]
    status: str
    category: str
    report_date: Optional[str] = None


class BloodWorkListItem(BaseModel):
    id: str
    report_date: Optional[str]
    lab_name: Optional[str]
    biomarker_count: int
    upload_date: str


class BiomarkerHistoryPoint(BaseModel):
    report_date: str
    value: float
    unit: str
    status: str


class SupplementCreate(BaseModel):
    name: str
    dosage: str
    frequency: str = "daily"
    time_of_day: str = "morning"
    notes: Optional[str] = None


class SupplementUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    time_of_day: Optional[str] = None
    notes: Optional[str] = None


class SupplementResponse(BaseModel):
    id: str
    name: str
    dosage: str
    frequency: str
    time_of_day: str
    started_date: str
    active: bool
    notes: Optional[str]


class SupplementHistoryResponse(BaseModel):
    id: str
    supplement_id: str
    supplement_name: str
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    date: str


class InteractionWarning(BaseModel):
    supplement_a: str
    supplement_b: str
    interaction_type: str
    recommendation: str


# --- Wearables ---

class WearableDataPoint(BaseModel):
    source: str
    date: str
    metric_type: str
    value: float
    unit: str


class WearableUploadResponse(BaseModel):
    source: str
    records_imported: int
    records_skipped: int
    date_range: dict
    metrics_found: list[str]


class SyncStatusItem(BaseModel):
    source: str
    last_sync_date: Optional[str]
    record_count: int
    latest_data_date: Optional[str]


# --- Insights ---

class InsightResponse(BaseModel):
    id: str
    insight_type: str
    title: str
    content: str
    severity: str
    data_sources: list[str]
    generated_at: str
    dismissed: bool


class HealthScoreBreakdown(BaseModel):
    bloodwork: int
    wearables: int
    supplements: int


class HealthScoreResponse(BaseModel):
    score: int
    breakdown: HealthScoreBreakdown
    factors: list[dict]


class HealthInsightsResponse(BaseModel):
    health_score: HealthScoreResponse
    insights: list[InsightResponse]
    action_items: list[dict]
    generated_at: str
    disclaimer: str


class GenerateInsightsRequest(BaseModel):
    force: bool = False


class AskQuestionRequest(BaseModel):
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    relevant_data: list[dict]
    source: str
