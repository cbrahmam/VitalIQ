import sqlite3
from .base import HealthAnalysisEngine


class ClaudeEngine(HealthAnalysisEngine):
    """Claude API-powered health analysis engine.

    To enable: pip install anthropic, set ANTHROPIC_API_KEY env var.
    The factory in factory.py automatically selects this engine when a key is present.
    """

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.api_key = api_key
        self.model = model

    def generate_bloodwork_insights(self, conn: sqlite3.Connection, sex: str = "male") -> list[dict]:
        raise NotImplementedError("Claude API engine not yet implemented. Set up ANTHROPIC_API_KEY and implement this method.")

    def generate_wearable_insights(self, conn: sqlite3.Connection) -> list[dict]:
        raise NotImplementedError("Claude API engine not yet implemented.")

    def generate_cross_correlations(self, conn: sqlite3.Connection) -> list[dict]:
        raise NotImplementedError("Claude API engine not yet implemented.")

    def generate_supplement_insights(self, conn: sqlite3.Connection) -> list[dict]:
        raise NotImplementedError("Claude API engine not yet implemented.")

    def generate_daily_snapshot(self, conn: sqlite3.Connection) -> list[dict]:
        raise NotImplementedError("Claude API engine not yet implemented.")

    def compute_health_score(self, conn: sqlite3.Connection) -> dict:
        raise NotImplementedError("Claude API engine not yet implemented.")

    def answer_question(self, conn: sqlite3.Connection, question: str) -> dict:
        raise NotImplementedError("Claude API engine not yet implemented.")
