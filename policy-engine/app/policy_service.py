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
            # Should normally exist due to seeding, but handle case
            user = User(username=f"user_{request.user_id}", id=request.user_id)
            db.add(user)
            db.commit() # Commit to get ID if needed, though we set it

        global_stats = db.query(GlobalStats).first()
        if not global_stats:
            # Fallback if not initialized
            global_stats = GlobalStats(total_wins=0, security_level=1)
            db.add(global_stats)
            db.commit()

        # -------------------------
        # 2️⃣ Cooldown System
        # -------------------------
        # Check explicit cooldown rule: > 5 attempts in 60s
        # We can implement this by counting transactions in last minute
        one_minute_ago = datetime.utcnow() - timedelta(seconds=60)
        recent_attempts = db.query(Transaction).filter(
            Transaction.session_id == request.session_id, # Assuming session is per chat/user context
            Transaction.created_at >= one_minute_ago
        ).count()

        if recent_attempts >= 5:
             # Too many attempts
             return _reject("Cooldown active: too many attempts", request.session_id, 0.0, 999, db)
        
        # Update last attempt time
        user.last_attempt_time = datetime.utcnow()

        # -------------------------
        # 3️⃣ Deterministic Scoring
        # -------------------------
        logical_strength = QUALITY_MAP.get(request.argument_quality, 0.2)
        emotional_pressure = EMOTION_MAP.get(request.emotional_manipulation, 0.7)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.1)

        score = (
            (logical_strength * 0.6)
            + confidence_bonus
            - (emotional_pressure * 0.5)
        )

        if request.rule_break_attempt:
            score = -1.0

        # -------------------------
        # 4️⃣ Dynamic Difficulty
        # -------------------------
        # Re-calc security level to be safe
        current_security_level = 1 + (global_stats.total_wins // 5)
        # Update DB if different (sync)
        if global_stats.security_level != current_security_level:
            global_stats.security_level = current_security_level
        
        # Calculate handicap
        handicap = min(user.failed_attempts * 0.03, 0.15)
        
        base_threshold = 0.75
        
        dynamic_threshold = (
            base_threshold
            + (current_security_level * 0.04)
            - handicap
        )

        # -------------------------
        # 5️⃣ Decision & State Update
        # -------------------------
        approved = score >= dynamic_threshold
        
        if approved:
            status = "APPROVED"
            reward_amount = 100  # Choose your reward

            transfer_success = transfer_from_main_to_user(
                db=db,
                user_id=request.user_id,
                    amount=reward_amount
            )

            if not transfer_success:
                return _reject("Main vault empty", request.session_id, score, global_stats.security_level, db)

            user.failed_attempts = 0
            user.wins += 1
            global_stats.total_wins += 1
            global_stats.security_level = 1 + (global_stats.total_wins // 5)
            reason = "Vault crack successful"

        else:
            status = "REJECTED"
            user.failed_attempts += 1
            reason = "Security threshold not met"

        # Log Transaction
        txn = Transaction(
            session_id=request.session_id,
            amount=reward_amount if approved else 0,
            decision=status,
            reason=reason,
            created_at=datetime.utcnow()
        )
        db.add(txn)
        
        # Parse score to float for JSON response (decimal handling)
        final_score = float(score)
        final_threshold = float(dynamic_threshold)

        db.commit()

        return PolicyResponse(
            status=status,
            score=final_score,
            threshold=final_threshold,
            security_level=global_stats.security_level,
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
