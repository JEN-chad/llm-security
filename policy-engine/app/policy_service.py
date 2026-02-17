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
BASE_THRESHOLD = 0.55
MIN_THRESHOLD = 0.50


# =========================
# SCORING MAPS
# =========================
QUALITY_MAP = {
    "strong": 0.9,
    "medium": 0.65,
    "weak": 0.4
}

CONFIDENCE_MAP = {
    "high": 0.15,
    "medium": 0.08,
    "low": 0.0
}


# =========================
# HUMAN STORY ANALYSIS
# =========================

def detect_specificity(message: str) -> float:
    if not message:
        return 0.0

    msg = message.lower()
    words = msg.split()

    length_score = min(len(words) / 120, 0.20)

    detail_keywords = [
        "family", "mother", "father", "children",
        "rent", "job", "hospital", "school",
        "loan", "sister", "brother",
        "lost", "support", "medical",
        "home", "income"
    ]

    detail_count = sum(word in msg for word in detail_keywords)
    detail_score = min(detail_count * 0.04, 0.20)

    return min(length_score + detail_score, 0.35)


def detect_coherence(message: str) -> float:
    if not message:
        return 0.0

    msg = message.lower()

    coherence_words = [
        "because", "since", "after",
        "when", "due to", "so that",
        "therefore"
    ]

    return 0.15 if any(word in msg for word in coherence_words) else 0.05


def detect_manipulation(message: str) -> float:
    if not message:
        return 0.0

    msg = message.lower()

    manipulation_words = [
        "immediately", "right now",
        "approve now", "urgent",
        "you must", "or else",
        "this is your responsibility"
    ]

    if any(word in msg for word in manipulation_words):
        return 0.10  # Reduced penalty

    return 0.0


# =========================
# REWARD CALCULATION
# =========================

def calculate_base_reward(score: float) -> int:
    if score >= 0.85:
        return 300
    elif score >= 0.75:
        return 200
    elif score >= 0.65:
        return 100
    else:
        return 50


def apply_security_multiplier(base_reward: int, security_level: int) -> int:
    multiplier = 1 + (security_level - 1) * 0.10
    return int(base_reward * multiplier)


# =========================
# SECURITY FILTER
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

        # --------------------------
        # USER FETCH / CREATE
        # --------------------------
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            user = User(
                id=request.user_id,
                username=f"user_{request.user_id}",
                wins=0,
                failed_attempts=0,
                failure_streak=0
            )
            db.add(user)
            db.commit()

        # --------------------------
        # GLOBAL STATS FETCH
        # --------------------------
        global_stats = db.query(GlobalStats).first()
        if not global_stats:
            global_stats = GlobalStats(total_wins=0, security_level=1)
            db.add(global_stats)
            db.commit()

        # --------------------------
        # COOLDOWN PROTECTION
        # --------------------------
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

        # --------------------------
        # RULE VIOLATION CHECK
        # --------------------------
        if is_rule_violation(request):
            user.failed_attempts += 1
            user.failure_streak += 1
            db.commit()

            return _reject(
                "Rule violation detected",
                request.session_id,
                request.user_id,
                0.0,
                global_stats.security_level,
                db
            )

        # --------------------------
        # SCORING
        # --------------------------
        logical_score = QUALITY_MAP.get(request.argument_quality, 0.5)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.0)

        specificity_score = detect_specificity(request.original_message)
        coherence_score = detect_coherence(request.original_message)
        manipulation_penalty = detect_manipulation(request.original_message)

        if request.emotional_manipulation == "high":
            manipulation_penalty += 0.05  # Reduced emotional penalty

        final_score = (
            (logical_score * 0.4)
            + specificity_score
            + coherence_score
            + confidence_bonus
            - manipulation_penalty
        )

        final_score = max(0.0, min(final_score, 1.0))

        # --------------------------
        # DYNAMIC THRESHOLD
        # --------------------------
        current_level = 1 + (global_stats.total_wins // 6)
        global_stats.security_level = current_level

        dynamic_threshold = BASE_THRESHOLD
        dynamic_threshold += current_level * 0.02
        dynamic_threshold += min(user.wins * 0.03, 0.15)

        # --------------------------
        # TIERED ASSIST SYSTEM
        # --------------------------
        assist_bonus = 0

        if user.failure_streak >= 3:

            # Skill-based proximity assist
            if abs(final_score - dynamic_threshold) < 0.08:
                assist_bonus = 0.02

            # Struggle assist for low scorers
            elif (
                user.failure_streak >= 4
                and final_score < dynamic_threshold - 0.15
            ):
                assist_bonus = 0.015

        dynamic_threshold -= assist_bonus

        dynamic_threshold = max(MIN_THRESHOLD, min(dynamic_threshold, 0.80))

        # --------------------------
        # APPROVAL CHECK
        # --------------------------
        approved = final_score >= dynamic_threshold
        reward_amount = 0

        main_wallet = db.query(Wallet).filter(Wallet.is_main == True).first()

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

            base_reward = calculate_base_reward(final_score)
            reward_amount = apply_security_multiplier(base_reward, current_level)

            if float(main_wallet.balance) < reward_amount:
                reward_amount = float(main_wallet.balance)

            if not transfer_from_main_to_user(
                db=db,
                user_id=request.user_id,
                amount=reward_amount
            ):
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
            user.failure_streak = 0
            user.wins += 1
            global_stats.total_wins += 1

            message = random.choice(CANNED_RESPONSES["APPROVED"])

        else:
            status = "REJECTED"
            user.failed_attempts += 1
            user.failure_streak += 1

            if user.failure_streak >= 3:
                message = random.choice(CANNED_RESPONSES["REJECTED_ASSIST"])
            else:
                message = random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])

        # --------------------------
        # TRANSACTION LOG
        # --------------------------
        txn = Transaction(
            user_id=request.user_id,
            session_id=request.session_id,
            amount=reward_amount,
            decision=status,
            reason="Hybrid adaptive evaluation engine",
            created_at=datetime.utcnow()
        )

        db.add(txn)
        db.commit()

        return PolicyResponse(
            status=status,
            score=float(final_score),
            threshold=float(dynamic_threshold),
            security_level=current_level,
            reason="Evaluation complete",
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
