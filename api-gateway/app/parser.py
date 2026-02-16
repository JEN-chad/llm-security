import json
from app.schemas import PolicyEvaluationRequest, AnalysisScores, RiskFlags

def parse_llm_response(llm_response: dict, session_id: str, user_id: int,  original_message: str  ) -> PolicyEvaluationRequest:
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

        if isinstance(message_content, str):
            content = json.loads(message_content)
        else:
            content = message_content

        # Strict Validation of Enums
        allowed_quality = ["strong", "medium", "weak"]
        allowed_emotion = ["high", "medium", "low"]
        allowed_confidence = ["high", "medium", "low"]

        if content.get("argument_quality") not in allowed_quality:
            raise ValueError(f"Invalid argument_quality: {content.get('argument_quality')}")

        if content.get("emotional_manipulation") not in allowed_emotion:
            raise ValueError(f"Invalid emotional_manipulation: {content.get('emotional_manipulation')}")
        
        if content.get("confidence_band") not in allowed_confidence:
            raise ValueError(f"Invalid confidence_band: {content.get('confidence_band')}")

        if not isinstance(content.get("rule_break_attempt"), bool):
             raise ValueError("rule_break_attempt must be a boolean")

        return PolicyEvaluationRequest(
            session_id=session_id,  
            user_id=user_id,
            argument_quality=content["argument_quality"],
            emotional_manipulation=content["emotional_manipulation"],
            rule_break_attempt=content["rule_break_attempt"],
            confidence_band=content["confidence_band"],
            original_message=original_message  
        )

    except (KeyError, json.JSONDecodeError, ValueError, TypeError) as e:
        raise ValueError(f"Failed to parse LLM response: {str(e)}")
