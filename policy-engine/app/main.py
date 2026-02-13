from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app.database import engine, Base, get_db, SessionLocal
from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.policy_service import evaluate_policy
from app.wallet_service import initialize_main_wallet
from app.models import User, Wallet, GlobalStats

# Create tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        print("🔌 Initializing database...")

        # Create tables AFTER DB is ready
        Base.metadata.create_all(bind=engine)

        # Create main wallet
        initialize_main_wallet(db)

        # Initialize Global Stats
        if db.query(GlobalStats).count() == 0:
             print("🌍 Initializing Global Stats...")
             db.add(GlobalStats(total_wins=0, security_level=1))
             db.commit()

        # Seed users if empty
        if db.query(User).count() == 0:
            print("👥 Seeding users...")
            for i in range(1, 31):
                # Ensure we also initialize new fields if needed, though default handles it
                db.add(User(username=f"user_{i}"))
            db.commit()

        # Ensure each user has wallet
        users = db.query(User).all()
        for user in users:
            existing_wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()
            if not existing_wallet:
                db.add(Wallet(user_id=user.id, balance=0.0, is_main=False))
        db.commit()

        print("✅ Database ready")

    finally:
        db.close()

    yield

app = FastAPI(lifespan=lifespan)

@app.post("/evaluate", response_model=PolicyResponse)
def evaluate(request: PolicyEvaluationRequest, db: Session = Depends(get_db)):
    return evaluate_policy(request, db)
