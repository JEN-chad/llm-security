from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    session_id: str
    user_id: int
    message: str


class AnalysisScores(BaseModel):
    logical_strength: float = Field(..., ge=0, le=1)
    emotional_pressure: float = Field(..., ge=0, le=1)


class RiskFlags(BaseModel):
    prompt_injection: bool
    override_attempt: bool


class PolicyEvaluationRequest(BaseModel):
    session_id: str
    user_id: int   # 🔥 ADD THIS
    requested_amount: float = Field(..., gt=0)
    analysis_scores: AnalysisScores
    risk_flags: RiskFlags
    confidence_score: float = Field(..., ge=0, le=1)


class PolicyResponse(BaseModel):
    status: str
    approved_amount: float
    reason: str
