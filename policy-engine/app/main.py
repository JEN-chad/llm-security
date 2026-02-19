from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.policy_service import evaluate_policy
from app.api_client import api_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔌 Initializing connection to Node service...")
    try:
        # Trigger DB init in Node service (idempotent)
        await api_client.init_db()
        print("✅ Node service initialized")
    except Exception as e:
        print(f"⚠️ Warning: Node service init failed (might be starting up): {e}")

    yield
    
    await api_client.close()

app = FastAPI(lifespan=lifespan)

@app.post("/evaluate", response_model=PolicyResponse)
async def evaluate(request: PolicyEvaluationRequest):
    return await evaluate_policy(request)
