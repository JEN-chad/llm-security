from app.schemas import PolicyEvaluationRequest, PolicyResponse
from sqlalchemy.orm import Session
from app.session_service import get_session, create_session
from app.models import Transaction, GlobalStats, User
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from decimal import Decimal
from datetime import datetime, timedelta
from app.wallet_service import transfer_from_main_to_user


# -------------------------
# SCORING MAPS
# -------------------------
QUALITY_MAP = {
    "strong": 0.8,
    "medium": 0.5,
    "weak": 0.2
}

EMOTION_MAP = {
    "low": 0.1,
    "medium": 0.4,
    "high": 0.7
}

CONFIDENCE_MAP = {
    "high": 0.3,
    "medium": 0.2,
    "low": 0.1
}

def evaluate_policy(request: PolicyEvaluationRequest, db: Session) -> PolicyResponse:
    try:
        # -------------------------
        # 1️⃣ Get User & Global Stats
        # -------------------------
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            user = User(username=f"user_{request.user_id}", id=request.user_id)
            db.add(user)
            db.commit()

        global_stats = db.query(GlobalStats).first()
        if not global_stats:
            global_stats = GlobalStats(total_wins=0, security_level=1)
            db.add(global_stats)
            db.commit()

        # -------------------------
        # 2️⃣ Cooldown (5 per minute)
        # -------------------------
        one_minute_ago = datetime.utcnow() - timedelta(seconds=60)

        recent_attempts = db.query(Transaction).filter(
            Transaction.session_id == request.session_id,
            Transaction.created_at >= one_minute_ago
        ).count()

        if recent_attempts >= 5:
            return _reject("Cooldown active", request.session_id, 0.0, 999, db)

        user.last_attempt_time = datetime.utcnow()

        # -------------------------
        # 3️⃣ Improved Deterministic Scoring
        # -------------------------
        logical_strength = QUALITY_MAP.get(request.argument_quality, 0.2)
        emotional_pressure = EMOTION_MAP.get(request.emotional_manipulation, 0.7)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.1)

        score = (
            (logical_strength * 0.7)
            + confidence_bonus
            - (emotional_pressure * 0.4)
        )

        if request.rule_break_attempt:
            score = -1.0

        # -------------------------
        # 4️⃣ Smooth Dynamic Difficulty
        # -------------------------
        current_level = 1 + (global_stats.total_wins // 5)
        global_stats.security_level = current_level

        handicap = min(user.failed_attempts * 0.03, 0.15)

        base_threshold = 0.70
        dynamic_threshold = (
            base_threshold
            + (current_level * 0.02)
            - handicap
        )

        # -------------------------
        # 5️⃣ Decision
        # -------------------------
        approved = score >= dynamic_threshold
        reward_amount = 0

        if approved:

            # Anti-farming: max 5 wins per level per user
            if user.wins >= (current_level * 5):
                return _reject(
                    "Win cap reached for this level",
                    request.session_id,
                    score,
                    current_level,
                    db
                )

            # Vault-based reward scaling
            main_wallet_balance = db.execute(
                text("SELECT balance FROM wallet WHERE is_main = true")
            ).scalar()

            if main_wallet_balance is None or main_wallet_balance <= 0:
                return _reject("Vault depleted", request.session_id, score, current_level, db)

            if main_wallet_balance < 5000:
                reward_amount = 50
            elif main_wallet_balance < 10000:
                reward_amount = 75
            else:
                reward_amount = 100

            transfer_success = transfer_from_main_to_user(
                db=db,
                user_id=request.user_id,
                amount=reward_amount
            )

            if not transfer_success:
                return _reject("Vault empty", request.session_id, score, current_level, db)

            status = "APPROVED"
            user.failed_attempts = 0
            user.wins += 1
            global_stats.total_wins += 1
            reason = "Vault crack successful"

        else:
            status = "REJECTED"
            user.failed_attempts += 1
            reason = "Security threshold not met"

        # -------------------------
        # 6️⃣ Log Transaction
        # -------------------------
        txn = Transaction(
            session_id=request.session_id,
            amount=reward_amount,
            decision=status,
            reason=reason,
            created_at=datetime.utcnow()
        )
        db.add(txn)

        db.commit()

        return PolicyResponse(
            status=status,
            score=float(score),
            threshold=float(dynamic_threshold),
            security_level=current_level,
            reason=reason
        )

    except SQLAlchemyError as e:
        db.rollback()
        return PolicyResponse(
            status="REJECTED",
            score=0.0,
            threshold=0.0,
            security_level=0,
            reason=f"Database error: {str(e)}"
        )

# -------------------------
# Rejection handler
# -------------------------
def _reject(reason: str, session_id: str, score: float, level: int, db: Session) -> PolicyResponse:
    # Log valid rejection
    try:
        txn = Transaction(
            session_id=session_id,
            amount=0,
            decision="REJECTED",
            reason=reason
        )
        db.add(txn)
        db.commit()
    except:
        db.rollback()
        
    return PolicyResponse(
        status="REJECTED",
        score=score,
        threshold=0.0,
        security_level=level,
        reason=reason
    )
