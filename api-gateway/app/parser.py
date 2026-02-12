import json
from app.schemas import PolicyEvaluationRequest, AnalysisScores, RiskFlags

def parse_llm_response(llm_response: dict, session_id: str, user_id: int) -> PolicyEvaluationRequest:
    """
    Parses the structured LLM response and validates it against the schema.
    """
    try:
        choices = llm_response.get("choices", [])
        if not choices:
            raise ValueError("No choices in LLM response")

        message_content = choices[0].get("message", {}).get("content")
        if not message_content:
            raise ValueError("No content in LLM response")

        # LLM returns JSON string
        if isinstance(message_content, str):
            content = json.loads(message_content)
        else:
            content = message_content

        return PolicyEvaluationRequest(
            session_id=session_id,  
            user_id=user_id,
            requested_amount=content["requested_amount"],
            analysis_scores=AnalysisScores(**content["analysis_scores"]),
            risk_flags=RiskFlags(**content["risk_flags"]),
            confidence_score=content["confidence_score"]
        )


    except (KeyError, json.JSONDecodeError, ValueError, TypeError) as e:
        raise ValueError(f"Failed to parse LLM response: {str(e)}")
