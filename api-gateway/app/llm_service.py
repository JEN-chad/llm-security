import requests
import json
import os

# Put your real Modal URL here
MODAL_LLM_ENDPOINT = "https://jenishj436--llm-policy-flow-test-fastapi-app.modal.run"


def call_llm_service(message: str):
    """
    Calls Modal-hosted LLM classifier.
    Returns OpenAI-style response structure
    so policy engine does NOT need changes.
    """

    try:
        response = requests.post(
            MODAL_LLM_ENDPOINT,
            json={"message": message},
            timeout=15
        )

        response.raise_for_status()
        llm_json = response.json()

        # 🔥 Keep same structure as before
        return {
            "choices": [{
                "message": {
                    "content": json.dumps(llm_json)
                }
            }]
        }

    except Exception as e:
        print("LLM SERVICE ERROR:", str(e))

        # 🔥 Safe fallback
        fallback = {
            "argument_quality": "medium",
            "emotional_manipulation": "medium",
            "rule_break_attempt": False,
            "confidence_band": "medium"
        }

        return {
            "choices": [{
                "message": {
                    "content": json.dumps(fallback)
                }
            }]
        }
