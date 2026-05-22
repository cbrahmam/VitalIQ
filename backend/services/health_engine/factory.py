import os
from .rule_engine import RuleBasedEngine
from .base import HealthAnalysisEngine


def get_engine() -> HealthAnalysisEngine:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        from .claude_engine import ClaudeEngine
        return ClaudeEngine(api_key=api_key)
    return RuleBasedEngine()
