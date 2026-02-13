from fastapi import FastAPI, HTTPException
from app.schemas import ChatRequest, PolicyResponse
from app.config import settings
from app.llm_service import call_llm_service
from app.parser import parse_llm_response
import requests

import re

app = FastAPI()

INJECTION_PATTERNS = [
    r"ignore previous",
    r"override system",
    r"act as admin",
    r"reveal rules"
]

@app.post("/chat", response_model=PolicyResponse)
def chat(request: ChatRequest):
    try:
        # 0. Pre-filter Injection Strings
        message_lower = request.message.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, message_lower):
                return PolicyResponse(
                    status="REJECTED",
                    score=0.0,
                    threshold=1.0,
                    security_level=999
                )

        # 1. Call LLM (Semantic Classifier Only)
        llm_response = call_llm_service(request.message)

        # 2. Parse LLM Response (Now returns strict classification)
        policy_request = parse_llm_response(
            llm_response,
            request.session_id,
            request.user_id
        )

        # Convert to dict for request
        payload = (
            policy_request.model_dump()
            if hasattr(policy_request, "model_dump")
            else policy_request.dict()
        )

        # 3. Call Policy Engine (Deterministic Authority)
        response = requests.post(
            f"{settings.POLICY_ENGINE_URL}/evaluate",
            json=payload,
            timeout=5
        )

        response.raise_for_status()

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Policy Engine Error: {str(e)}")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Parsing Error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

