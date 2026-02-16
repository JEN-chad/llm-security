from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import ChatRequest, PolicyResponse
from app.config import settings
from app.llm_service import call_llm_service
from app.parser import parse_llm_response
import requests
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INJECTION_PATTERNS = [
    r"ignore previous",
    r"override system",
    r"act as admin",
    r"reveal rules"
]


@app.post("/chat", response_model=PolicyResponse)
def chat(request: ChatRequest):
    try:
        # 0️⃣ Injection Filter
        message_lower = request.message.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, message_lower):
                return PolicyResponse(
                    status="REJECTED",
                    score=0.0,
                    threshold=1.0,
                    security_level=999,
                    reason="Prompt injection detected",
                    message="Malicious input detected.",
                    user_input=request.message
                )

        # 1️⃣ Call LLM
        llm_response = call_llm_service(request.message)

        # 2️⃣ Parse LLM Response (NOW WITH ORIGINAL MESSAGE)
        policy_request = parse_llm_response(
            llm_response,
            request.session_id,
            request.user_id,
            request.message
        )

        payload = (
            policy_request.model_dump()
            if hasattr(policy_request, "model_dump")
            else policy_request.dict()
        )

        # 3️⃣ Call Policy Engine
        response = requests.post(
            f"{settings.POLICY_ENGINE_URL}/evaluate",
            json=payload,
            timeout=5
        )

        response.raise_for_status()

        policy_data = response.json()
        policy_data["user_input"] = request.message

        return policy_data

    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Policy Engine Error: {str(e)}"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Parsing Error: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected Error: {str(e)}"
        )
