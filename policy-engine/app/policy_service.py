from app.schemas import PolicyEvaluationRequest, PolicyResponse
from sqlalchemy.orm import Session
from app.models import Transaction, GlobalStats, User, Wallet
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime, timedelta
from app.wallet_service import transfer_from_main_to_user
from app.responses import CANNED_RESPONSES
import random


# =========================
# CONFIG
# =========================
INITIAL_VAULT_BALANCE = 30000
BASE_THRESHOLD = 0.60


# =========================
# SCORING MAPS
# =========================
QUALITY_MAP = {
    "strong": 0.9,
    "medium": 0.6,
    "weak": 0.3
}

EMOTION_RISK_MAP = {
    "low": 0.0,
    "medium": 0.1,
    "high": 0.25
}

CONFIDENCE_MAP = {
    "high": 0.2,
    "medium": 0.1,
    "low": 0.0
}


# =========================
# Narrative Detection
# =========================
def detect_narrative(message: str) -> float:
    if not message:
        return 0.0

    narrative_keywords = [
        "because", "due to", "therefore",
        "evidence", "verified", "documented",
        "policy", "section", "guideline"
    ]

    count = sum(word in message.lower() for word in narrative_keywords)
    return min(count * 0.04, 0.20)


# =========================
# HARD SECURITY FILTER
# =========================
def is_rule_violation(request: PolicyEvaluationRequest) -> bool:
    if request.rule_break_attempt:
        return True

    if not request.original_message:
        return False

    msg = request.original_message.lower()

    forbidden_phrases = [
        "bypass",
        "ignore previous instructions",
        "act as admin",
        "transfer funds directly",
        "without logging",
        "override system"
    ]

    return any(phrase in msg for phrase in forbidden_phrases)


# =========================
# MAIN POLICY FUNCTION
# =========================
def evaluate_policy(request: PolicyEvaluationRequest, db: Session) -> PolicyResponse:
    try:

        # ---------------------------------
        # 1️⃣ USER SETUP
        # ---------------------------------
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            user = User(
                id=request.user_id,
                username=f"user_{request.user_id}",
                wins=0,
                failed_attempts=0
            )
            db.add(user)
            db.commit()

        # ---------------------------------
        # 2️⃣ GLOBAL STATS
        # ---------------------------------
        global_stats = db.query(GlobalStats).first()
        if not global_stats:
            global_stats = GlobalStats(total_wins=0, security_level=1)
            db.add(global_stats)
            db.commit()

        # ---------------------------------
        # 3️⃣ COOLDOWN CHECK
        # ---------------------------------
        one_minute_ago = datetime.utcnow() - timedelta(seconds=60)

        recent_attempts = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == request.user_id,
            Transaction.created_at >= one_minute_ago
        ).scalar()

        if recent_attempts >= 5:
            return _reject(
                "Cooldown active",
                request.session_id,
                request.user_id,
                0.0,
                global_stats.security_level,
                db
            )

        # ---------------------------------
        # 4️⃣ HARD SECURITY BLOCK
        # ---------------------------------
        if is_rule_violation(request):
            user.failed_attempts += 1
            db.commit()

            return _reject(
                "Rule violation detected",
                request.session_id,
                request.user_id,
                0.0,
                global_stats.security_level,
                db
            )

        # ---------------------------------
        # 5️⃣ SECURITY LEVEL SCALING
        # ---------------------------------
        current_level = 1 + (global_stats.total_wins // 5)
        global_stats.security_level = current_level

        # ---------------------------------
        # 6️⃣ SCORE CALCULATION
        # ---------------------------------
        logical_score = QUALITY_MAP.get(request.argument_quality, 0.3)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.0)
        narrative_bonus = detect_narrative(request.original_message)
        emotional_risk = EMOTION_RISK_MAP.get(request.emotional_manipulation, 0.1)

        approval_score = (
            (logical_score * 0.65) +
            (confidence_bonus * 0.15) +
            narrative_bonus
        )

        risk_penalty = emotional_risk

        final_score = approval_score - risk_penalty
        final_score = max(0.0, min(final_score, 1.0))

        # ---------------------------------
        # 7️⃣ DYNAMIC THRESHOLD (SECURE)
        # ---------------------------------
        dynamic_threshold = BASE_THRESHOLD

        # Increase difficulty with security level
        dynamic_threshold += current_level * 0.03

        # Increase difficulty for repeated failures
        dynamic_threshold += min(user.failed_attempts * 0.03, 0.15)

        # Scarcity scaling
        main_wallet = db.query(Wallet).filter(Wallet.is_main == True).first()
        if main_wallet:
            current_balance = float(main_wallet.balance)
            vault_ratio = current_balance / float(INITIAL_VAULT_BALANCE)
            scarcity_penalty = (1 - vault_ratio) * 0.25
            dynamic_threshold += scarcity_penalty

        # Dominance scaling
        dynamic_threshold += min(user.wins * 0.04, 0.20)

        dynamic_threshold = min(dynamic_threshold, 0.95)

        # ---------------------------------
        # 8️⃣ DECISION
        # ---------------------------------
        approved = final_score >= dynamic_threshold
        reward_amount = 0

        if approved:

            if not main_wallet or main_wallet.balance <= 0:
                return _reject(
                    "Vault depleted",
                    request.session_id,
                    request.user_id,
                    final_score,
                    current_level,
                    db
                )

            current_balance = float(main_wallet.balance)
            reward_amount = int(current_balance * 0.01)
            reward_amount = max(50, min(reward_amount, 500))

            transfer_success = transfer_from_main_to_user(
                db=db,
                user_id=request.user_id,
                amount=reward_amount
            )

            if not transfer_success:
                return _reject(
                    "Transfer failed",
                    request.session_id,
                    request.user_id,
                    final_score,
                    current_level,
                    db
                )

            status = "APPROVED"
            user.failed_attempts = 0
            user.wins += 1
            global_stats.total_wins += 1
            message = random.choice(CANNED_RESPONSES["APPROVED"])

        else:
            status = "REJECTED"
            user.failed_attempts += 1
            message = random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])

        # ---------------------------------
        # 9️⃣ LOG TRANSACTION
        # ---------------------------------
        txn = Transaction(
            user_id=request.user_id,
            session_id=request.session_id,
            amount=reward_amount,
            decision=status,
            reason="Secure policy evaluation",
            created_at=datetime.utcnow()
        )
        db.add(txn)
        db.commit()

        return PolicyResponse(
            status=status,
            score=float(final_score),
            threshold=float(dynamic_threshold),
            security_level=current_level,
            reason="Secure evaluation complete",
            message=message
        )

    except SQLAlchemyError as e:
        db.rollback()
        return PolicyResponse(
            status="REJECTED",
            score=0.0,
            threshold=0.0,
            security_level=0,
            reason=f"Database error: {str(e)}",
            message="System Error"
        )


# =========================
# REJECTION HELPER
# =========================
def _reject(reason, session_id, user_id, score, level, db):
    try:
        txn = Transaction(
            user_id=user_id,
            session_id=session_id,
            amount=0,
            decision="REJECTED",
            reason=reason,
            created_at=datetime.utcnow()
        )
        db.add(txn)
        db.commit()
    except:
        db.rollback()

    return PolicyResponse(
        status="REJECTED",
        score=float(score),
        threshold=0.0,
        security_level=level,
        reason=reason,
        message=random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])
    )
