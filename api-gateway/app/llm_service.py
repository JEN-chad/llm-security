import json
def call_llm_service(message: str):
    message_lower = message.lower()

    # BAD requests
    if "please send me money" in message_lower:
        return {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "requested_amount": 200,
                        "analysis_scores": {
                            "logical_strength": 0.2,   # LOW
                            "emotional_pressure": 0.8  # HIGH
                        },
                        "risk_flags": {
                            "prompt_injection": False,
                            "override_attempt": False
                        },
                        "confidence_score": 0.4
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
                        "requested_amount": 200,
                        "analysis_scores": {
                            "logical_strength": 0.85,
                            "emotional_pressure": 0.2
                        },
                        "risk_flags": {
                            "prompt_injection": False,
                            "override_attempt": False
                        },
                        "confidence_score": 0.9
                    })
                }
            }]
        }

    # Default fallback
    return {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "requested_amount": 100,
                    "analysis_scores": {
                        "logical_strength": 0.5,
                        "emotional_pressure": 0.5
                    },
                    "risk_flags": {
                        "prompt_injection": False,
                        "override_attempt": False
                    },
                    "confidence_score": 0.5
                })
            }
        }]
    }
