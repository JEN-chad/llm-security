from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db, SessionLocal
from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.policy_service import evaluate_policy
from app.wallet_service import initialize_main_wallet

from contextlib import asynccontextmanager

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize wallet
    db = SessionLocal()
    try:
       initialize_main_wallet(db)

    finally:
        db.close()
    yield

app = FastAPI(lifespan=lifespan)

@app.post("/evaluate", response_model=PolicyResponse)
def evaluate(request: PolicyEvaluationRequest, db: Session = Depends(get_db)):
    return evaluate_policy(request, db)
