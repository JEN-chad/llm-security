from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager

from app.database import db_client, get_db, DBClient
from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.policy_service import evaluate_policy


# Create tables & seed via db-service
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔌 Initializing database via DB Service...")

    # Call db-service /init endpoint to create tables and seed data
    resp = db_client.post("/init")
    if resp.status_code == 200:
        print("✅ Database ready (via Drizzle ORM)")
    else:
        print(f"⚠️ DB init returned: {resp.status_code} {resp.text}")

    yield

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/evaluate", response_model=PolicyResponse)
def evaluate(request: PolicyEvaluationRequest, db: DBClient = Depends(get_db)):
    return evaluate_policy(request, db)
