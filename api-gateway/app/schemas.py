from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    session_id: str
    user_id: int
    message: str


class AnalysisScores(BaseModel):
    argument_quality: str   # strong, medium, weak
    emotional_manipulation: str # high, medium, low
    confidence_band: str # high, medium, low


class RiskFlags(BaseModel):
    rule_break_attempt: bool


class PolicyEvaluationRequest(BaseModel):
    session_id: str
    user_id: int
    # requested_amount is removed as it's not part of the game logic explicitly mentioned, 
    # but the game might need an "objective" or we can treat the message as the attempt.
    # The prompt didn't say to remove requested_amount, but the game is "Crack The Vault".
    # I will keep requested_amount as optional or remove it if not used. 
    # The prompt said: "Update PolicyEvaluationRequest to accept: user_id, argument_quality, emotional_manipulation, rule_break_attempt, confidence_band. Remove numeric score fields."
    # It didn't explicitly say remove requested_amount, but it's likely irrelevant now. 
    # I'll remove it to be safe and stick to the prompt's list.
    argument_quality: str
    emotional_manipulation: str
    rule_break_attempt: bool
    confidence_band: str


class PolicyResponse(BaseModel):
    status: str
    score: float
    threshold: float
    security_level: int
    message: Optional[str] = None
    user_input: Optional[str] = None
