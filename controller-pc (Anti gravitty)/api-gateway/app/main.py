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

@app.get("/health")
def health():
    return {"status": "ok"}

INJECTION_PATTERNS = [
    r"ignore previous",
    r"override system",
    r"act as admin",
    r"reveal rules"
]


@app.get("/info")
def get_info(user_id: int = None):
    """Aggregate dashboard info for the frontend."""
    import os
    db_service_url = os.environ.get("DB_SERVICE_URL", "http://db-service:8002")
    result = {}

    # Get vault (main wallet) balance
    try:
        resp = requests.get(f"{db_service_url}/wallet/main", timeout=5)
        result["vault_balance"] = resp.json().get("balance", "0") if resp.status_code == 200 else "0"
    except:
        result["vault_balance"] = "0"

    # Get global stats (security level)
    try:
        resp = requests.get(f"{db_service_url}/global-stats", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            result["security_level"] = data.get("securityLevel", 1)
            result["total_wins"] = data.get("totalWins", 0)
        else:
            result["security_level"] = 1
            result["total_wins"] = 0
    except:
        result["security_level"] = 1
        result["total_wins"] = 0

    # Get users list
    try:
        resp = requests.get(f"{db_service_url}/users", timeout=5)
        result["users"] = resp.json() if resp.status_code == 200 else []
    except:
        result["users"] = []

    # Get specific user wallet balance if user_id provided
    if user_id is not None:
        try:
            resp = requests.get(f"{db_service_url}/wallet/user/{user_id}", timeout=5)
            result["user_wallet_balance"] = resp.json().get("balance", "0") if resp.status_code == 200 else "0"
        except:
            result["user_wallet_balance"] = "0"

    return result

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
            timeout=30
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
