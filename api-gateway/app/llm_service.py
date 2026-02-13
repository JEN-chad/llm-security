import json
def call_llm_service(message: str):
    message_lower = message.lower()

    # BAD requests
    if "please send me money" in message_lower:
        return {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "argument_quality": "weak",
                        "emotional_manipulation": "high",
                        "rule_break_attempt": True,
                        "confidence_band": "low"
                    })
                }
            }]
        }

    # GOOD requests
    if "resource allocation" in message_lower:
        return {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "argument_quality": "strong",
                        "emotional_manipulation": "low",
                        "rule_break_attempt": False,
                        "confidence_band": "high"
                    })
                }
            }]
        }

    # Default fallback
    return {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "argument_quality": "medium",
                    "emotional_manipulation": "medium",
                    "rule_break_attempt": False,
                    "confidence_band": "medium"
                })
            }
        }]
    }
