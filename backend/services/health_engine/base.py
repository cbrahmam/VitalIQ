from abc import ABC, abstractmethod
import sqlite3


class HealthAnalysisEngine(ABC):

    @abstractmethod
    def generate_bloodwork_insights(self, conn: sqlite3.Connection, sex: str = "male") -> list[dict]:
        ...

    @abstractmethod
    def generate_wearable_insights(self, conn: sqlite3.Connection) -> list[dict]:
        ...

    @abstractmethod
    def generate_cross_correlations(self, conn: sqlite3.Connection) -> list[dict]:
        ...

    @abstractmethod
    def generate_supplement_insights(self, conn: sqlite3.Connection) -> list[dict]:
        ...

    @abstractmethod
    def generate_daily_snapshot(self, conn: sqlite3.Connection) -> list[dict]:
        ...

    @abstractmethod
    def compute_health_score(self, conn: sqlite3.Connection) -> dict:
        ...

    @abstractmethod
    def answer_question(self, conn: sqlite3.Connection, question: str) -> dict:
        ...
