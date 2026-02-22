from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.database import DBClient
from app.wallet_service import execute_heist_transfer
from app.responses import CANNED_RESPONSES
import random


# =========================
# CONFIG
# =========================
INITIAL_VAULT_BALANCE = 30000
BASE_THRESHOLD = 0.55


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
        return 0.25

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

def evaluate_policy(request: PolicyEvaluationRequest, db: DBClient) -> PolicyResponse:
    try:

        # Get user from db-service
        user_resp = db.get(f"/users/{request.user_id}")
        if user_resp.status_code == 404:
            # Create user using the string user_id directly as username
            create_resp = db.post("/users", json={
                "username": request.user_id,
                "wins": 0,
                "failedAttempts": 0
            })
            user = create_resp.json()
        else:
            user = user_resp.json()

        if user.get("failedAttempts", 0) >= 5:
            db.patch(f"/users/{request.user_id}", json={"failedAttempts": 2})
            user["failedAttempts"] = 2

        # Get global stats
        stats_resp = db.get("/global-stats")
        if stats_resp.status_code == 404:
            db.post("/init")
            stats_resp = db.get("/global-stats")
        global_stats = stats_resp.json()

        # Check cooldown — count recent transactions
        recent_resp = db.get("/transactions/count-recent", params={
            "userId": request.user_id,
            "seconds": 60
        })
        recent_attempts = recent_resp.json().get("count", 0)

        if recent_attempts >= 5:
            return _reject("Cooldown active",
                           request.session_id,
                           request.user_id,
                           0.0,
                           global_stats.get("securityLevel", 1),
                           db)

        if is_rule_violation(request):
            failed = user.get("failedAttempts", 0) + 1
            db.patch(f"/users/{request.user_id}", json={"failedAttempts": failed})
            return _reject("Rule violation detected",
                           request.session_id,
                           request.user_id,
                           0.0,
                           global_stats.get("securityLevel", 1),
                           db)

        # --------------------------
        # SCORING
        # --------------------------

        logical_score = QUALITY_MAP.get(request.argument_quality, 0.5)
        confidence_bonus = CONFIDENCE_MAP.get(request.confidence_band, 0.0)

        specificity_score = detect_specificity(request.original_message)
        coherence_score = detect_coherence(request.original_message)
        manipulation_penalty = detect_manipulation(request.original_message)

        if request.emotional_manipulation == "high":
            manipulation_penalty += 0.15

        final_score = (
            (logical_score * 0.4) +
            specificity_score +
            coherence_score +
            confidence_bonus
        ) - manipulation_penalty

        final_score = max(0.0, min(final_score, 1.0))

        # --------------------------
        # DYNAMIC THRESHOLD
        # --------------------------

        total_wins = global_stats.get("totalWins", 0)
        current_level = 1 + (total_wins // 6)

        # Update security level
        db.patch("/global-stats", json={"securityLevel": current_level})

        user_failed = user.get("failedAttempts", 0)
        user_wins = user.get("wins", 0)

        dynamic_threshold = BASE_THRESHOLD
        dynamic_threshold += current_level * 0.02
        dynamic_threshold += min(user_failed * 0.02, 0.10)
        dynamic_threshold += min(user_wins * 0.03, 0.15)

        dynamic_threshold = min(dynamic_threshold, 0.80)

        approved = final_score >= dynamic_threshold
        reward_amount = 0

        # Get main wallet
        main_wallet_resp = db.get("/wallet/main")
        main_wallet = main_wallet_resp.json() if main_wallet_resp.status_code == 200 else None

        if approved:

            if not main_wallet or float(main_wallet.get("balance", 0)) <= 0:
                return _reject("Vault depleted",
                               request.session_id,
                               request.user_id,
                               final_score,
                               current_level,
                               db)

            base_reward = calculate_base_reward(final_score)
            reward_amount = apply_security_multiplier(base_reward, current_level)

            # Prevent overdraft
            main_balance = float(main_wallet.get("balance", 0))
            if main_balance < reward_amount:
                reward_amount = main_balance

            # ── ATOMIC HEIST TRANSFER ─────────────────────────────────────────
            # All steps (lock → deduct → credit → re-fetch → heist_history →
            # bank_balance → commit) run inside ONE PostgreSQL transaction.
            # If this returns False, ALL changes were rolled back automatically.
            # DO NOT compute or record any balance value here — it comes from
            # the committed db-service response.
            transfer_result = execute_heist_transfer(
                db=db,
                user_id=request.user_id,
                amount=reward_amount,
                session_id=request.session_id,
                user_message=request.original_message or "",
            )

            if not transfer_result:
                return _reject("Transfer failed",
                               request.session_id,
                               request.user_id,
                               final_score,
                               current_level,
                               db)

            status = "APPROVED"
            # Update user: reset failed_attempts, increment wins
            db.patch(f"/users/{request.user_id}", json={
                "failedAttempts": 0,
                "wins": user_wins + 1
            })
            # Update global stats
            db.patch("/global-stats", json={
                "totalWins": total_wins + 1
            })
            message = random.choice(CANNED_RESPONSES["APPROVED"])
            # NOTE: heist_history and bank_balance were already updated atomically
            # inside execute_heist_transfer — do NOT write them again here.

        else:
            status = "REJECTED"
            reward_amount = 0
            db.patch(f"/users/{request.user_id}", json={
                "failedAttempts": user_failed + 1
            })
            message = random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])

        # Record transaction for ALL decisions.
        # For APPROVED heists, this is the lightweight audit-trail record only;
        # the heist_history record was already committed atomically above.
        db.post("/transactions", json={
            "userId": request.user_id,
            "sessionId": request.session_id,
            "amount": reward_amount,
            "decision": status,
            "reason": "Quality-based reward with security multiplier"
        })

        return PolicyResponse(
            status=status,
            score=float(final_score),
            threshold=float(dynamic_threshold),
            security_level=current_level,
            reason="Evaluation complete",
            message=message
        )

    except Exception as e:
        return PolicyResponse(
            status="REJECTED",
            score=0.0,
            threshold=0.0,
            security_level=0,
            reason=f"Database error: {str(e)}",
            message="System Error"
        )


def _reject(reason, session_id, user_id, score, level, db: DBClient):
    try:
        db.post("/transactions", json={
            "userId": user_id,
            "sessionId": session_id,
            "amount": 0,
            "decision": "REJECTED",
            "reason": reason
        })
    except:
        pass

    return PolicyResponse(
        status="REJECTED",
        score=float(score),
        threshold=0.0,
        security_level=level,
        reason=reason,
        message=random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])
    )
