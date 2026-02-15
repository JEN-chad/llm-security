from app.schemas import PolicyEvaluationRequest, PolicyResponse
from sqlalchemy.orm import Session
from app.models import Transaction, GlobalStats, User, Wallet
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime, timedelta
from app.wallet_service import transfer_from_main_to_user
from app.responses import CANNED_RESPONSES
import random


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


# -------------------------
# 🎭 Narrative Detection
# -------------------------
def detect_narrative(message: str) -> float:
    if not message:
        return 0.0

    narrative_keywords = [
        "because", "due to", "therefore",
        "family", "children", "community",
        "evidence", "verified", "documented",
        "support", "impact", "responsibility"
    ]

    count = sum(word in message.lower() for word in narrative_keywords)

    # Bonus capped at 0.2
    return min(count * 0.03, 0.2)


# -------------------------
# 🧠 Persuasion Archetype Detection
# -------------------------
def detect_archetype(request: PolicyEvaluationRequest) -> str:
    if request.rule_break_attempt:
        return "malicious"

    if request.emotional_manipulation == "high" and request.argument_quality != "weak":
        return "emotional_narrative"

    if request.argument_quality == "strong":
        return "logical"

    if request.confidence_band == "high":
        return "authority"

    return "mixed"


# -------------------------
# 🏦 Vault Personality
# -------------------------
def get_vault_personality(level: int) -> str:
    if level <= 3:
        return "empathetic"
    elif level <= 6:
        return "balanced"
    else:
        return "strict"


# -------------------------
# MAIN POLICY FUNCTION
# -------------------------
def evaluate_policy(request: PolicyEvaluationRequest, db: Session) -> PolicyResponse:
    try:
        # -------------------------
        # 1️⃣ User Setup
        # -------------------------
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

        # -------------------------
        # 2️⃣ Global Stats
        # -------------------------
        global_stats = db.query(GlobalStats).first()
        if not global_stats:
            global_stats = GlobalStats(total_wins=0, security_level=1)
            db.add(global_stats)
            db.commit()

        # -------------------------
        # 3️⃣ Cooldown
        # -------------------------
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

        # -------------------------
        # 4️⃣ Base Classification Values
        # -------------------------
        logical_strength = QUALITY_MAP.get(request.argument_quality, 0.2)
        emotional_pressure = EMOTION_MAP.get(request.emotional_manipulation, 0.7)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.1)

        # -------------------------
        # 5️⃣ Dynamic Difficulty & Personality
        # -------------------------
        current_level = 1 + (global_stats.total_wins // 5)
        global_stats.security_level = current_level

        vault_personality = get_vault_personality(current_level)

        # Personality-based weight shifting
        if vault_personality == "empathetic":
            logic_weight = 0.5
            emotion_weight = 0.3
        elif vault_personality == "balanced":
            logic_weight = 0.6
            emotion_weight = 0.2
        else:  # strict
            logic_weight = 0.7
            emotion_weight = 0.1

        # -------------------------
        # 6️⃣ Narrative & Archetype
        # -------------------------
        narrative_bonus = detect_narrative(request.original_message)
        archetype = detect_archetype(request)

        # -------------------------
        # 7️⃣ Emotional Fairness Scoring
        # -------------------------
        score = (
            logical_strength * logic_weight +
            emotional_pressure * emotion_weight +
            confidence_bonus * 0.1 +
            narrative_bonus
        )

        # Penalize manipulative emotion
        if emotional_pressure > logical_strength + 0.2:
            score -= 0.15

        # Hard rule-break override
        if request.rule_break_attempt:
            score = -1.0
        else:
            score = max(0.0, min(score, 1.0))

        # -------------------------
        # 8️⃣ Dynamic Threshold
        # -------------------------
        handicap = min(user.failed_attempts * 0.03, 0.15)

        base_threshold = 0.70
        dynamic_threshold = (
            base_threshold
            + (current_level * 0.02)
            - handicap
        )

        dynamic_threshold = min(dynamic_threshold, 0.95)

        # -------------------------
        # 9️⃣ Decision
        # -------------------------
        approved = score >= dynamic_threshold
        reward_amount = 0

        if approved:

            if user.wins >= (current_level * 5):
                return _reject(
                    "Win cap reached",
                    request.session_id,
                    request.user_id,
                    score,
                    current_level,
                    db
                )

            main_wallet = db.query(Wallet).filter(Wallet.is_main == True).first()

            if not main_wallet or main_wallet.balance <= 0:
                return _reject(
                    "Vault depleted",
                    request.session_id,
                    request.user_id,
                    score,
                    current_level,
                    db
                )

            if main_wallet.balance < 5000:
                reward_amount = 50
            elif main_wallet.balance < 10000:
                reward_amount = 75
            else:
                reward_amount = 100

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
                    score,
                    current_level,
                    db
                )

            status = "APPROVED"
            user.failed_attempts = 0
            user.wins += 1
            global_stats.total_wins += 1
            reason = f"Vault cracked via {archetype} persuasion"

            message = random.choice(CANNED_RESPONSES["APPROVED"])

        else:
            status = "REJECTED"
            user.failed_attempts += 1
            reason = f"Vault resisted {archetype} persuasion"

            if request.rule_break_attempt:
                message = random.choice(CANNED_RESPONSES["REJECTED_RULE_BREAK"])
            else:
                message = random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])

        # -------------------------
        # 🔟 Log Transaction
        # -------------------------
        txn = Transaction(
            user_id=request.user_id,
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
            reason=reason,
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


# -------------------------
# Rejection Helper
# -------------------------
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
