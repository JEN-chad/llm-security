from pydantic import BaseModel, Field
from typing import Optional


class AnalysisScores(BaseModel):
    argument_quality: str   # strong, medium, weak
    emotional_manipulation: str # high, medium, low
    confidence_band: str # high, medium, low


class RiskFlags(BaseModel):
    rule_break_attempt: bool


class PolicyEvaluationRequest(BaseModel):
    session_id: str
    user_id: int
    argument_quality: str
    emotional_manipulation: str
    rule_break_attempt: bool
    confidence_band: str


class PolicyResponse(BaseModel):
    status: str
    score: float
    threshold: float
    security_level: int
    reason: Optional[str] = None
