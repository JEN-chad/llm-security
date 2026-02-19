from app.schemas import PolicyEvaluationRequest, PolicyResponse
from app.api_client import api_client
from app.wallet_service import transfer_from_main_to_user
from app.responses import CANNED_RESPONSES
from datetime import datetime
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

async def evaluate_policy(request: PolicyEvaluationRequest) -> PolicyResponse:
    try:
        action = getattr(request, "action", None)
        public_actions = {"create_user", "create_session"}
        if action in public_actions:
            try:
                await api_client.create_transaction({
                    "userId": request.user_id,
                    "sessionId": request.session_id,
                    "amount": 0,
                    "decision": "APPROVED",
                    "reason": f"Public action: {action}"
                })
            except Exception as e:
                print(f"Failed to log public action transaction: {e}")
            return PolicyResponse(
                status="APPROVED",
                score=1.0,
                threshold=0.0,
                security_level=0,
                reason="Public action",
                message=random.choice(CANNED_RESPONSES["APPROVED"])
            )

        user_role = getattr(request, "user_role", None)
        if user_role is None:
            return await _reject(
                "Missing role",
                request.session_id,
                request.user_id,
                0.0,
                0
            )

        # --------------------------
        # USER FETCH / CREATE
        # --------------------------
        # Returns dict with keys: id, username, failedAttempts, failureStreak, wins
        user = await api_client.ensure_user(request.user_id)
        if not user:
             return await _reject("User creation failed", request.session_id, request.user_id, 0.0, 1)

        # --------------------------
        # GLOBAL STATS FETCH
        # --------------------------
        # Returns dict: totalWins, securityLevel
        global_stats = await api_client.get_global_stats()
        
        # --------------------------
        # COOLDOWN PROTECTION
        # --------------------------
        recent_attempts = await api_client.get_recent_transaction_count(request.user_id)
        
        if recent_attempts >= 5:
            return await _reject(
                "Cooldown active",
                request.session_id,
                request.user_id,
                0.0,
                global_stats.get("securityLevel", 1)
            )

        # --------------------------
        # RULE VIOLATION CHECK
        # --------------------------
        if is_rule_violation(request):
            await api_client.update_user_stats(request.user_id, {
                "failedAttempts": user["failedAttempts"] + 1,
                "failureStreak": user["failureStreak"] + 1
            })

            return await _reject(
                "Rule violation detected",
                request.session_id,
                request.user_id,
                0.0,
                global_stats.get("securityLevel", 1)
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
        # totalWins might be string or number from JSON? usually number but be safe
        total_wins = int(global_stats.get("totalWins", 0))
        current_level = 1 + (total_wins // 6)
        
        # We update security level in local var for calculation, and will persist if approval happens or just update global stats anyway?
        # Original code updated it in DB object always. 
        # But efficiently we can defer unless we want to persist level even on rejection? 
        # Original code: global_stats.security_level = current_level (DB object update)
        # So yes, implicit update. We should probably update it if it changed.
        
        if current_level != global_stats.get("securityLevel"):
             await api_client.update_global_stats({"securityLevel": current_level})

        dynamic_threshold = BASE_THRESHOLD
        dynamic_threshold += current_level * 0.02
        dynamic_threshold += min(user["wins"] * 0.03, 0.15)

        # --------------------------
        # TIERED ASSIST SYSTEM
        # --------------------------
        assist_bonus = 0

        if user["failureStreak"] >= 3:

            # Skill-based proximity assist
            if abs(final_score - dynamic_threshold) < 0.08:
                assist_bonus = 0.02

            # Struggle assist for low scorers
            elif (
                user["failureStreak"] >= 4
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

        # Check main wallet balance
        main_wallet_balance = await api_client.get_main_wallet_balance() # returns float/number

        if approved:

            if main_wallet_balance <= 0:
                return await _reject(
                    "Vault depleted",
                    request.session_id,
                    request.user_id,
                    final_score,
                    current_level
                )

            base_reward = calculate_base_reward(final_score)
            reward_amount = apply_security_multiplier(base_reward, current_level)

            if float(main_wallet_balance) < reward_amount:
                reward_amount = float(main_wallet_balance)

            # Atomic transfer
            transfer_success = await transfer_from_main_to_user(
                user_id=request.user_id,
                amount=reward_amount
            )

            if not transfer_success:
                return await _reject(
                    "Transfer failed",
                    request.session_id,
                    request.user_id,
                    final_score,
                    current_level
                )

            status = "APPROVED"
            
            # Update User Stats
            await api_client.update_user_stats(request.user_id, {
                "failedAttempts": 0,
                "failureStreak": 0,
                "wins": user["wins"] + 1
            })
            
            # Update Global Stats
            await api_client.update_global_stats({
                "totalWins": total_wins + 1
            })

            message = random.choice(CANNED_RESPONSES["APPROVED"])

        else:
            status = "REJECTED"
            
            # Update User Stats
            await api_client.update_user_stats(request.user_id, {
                "failedAttempts": user["failedAttempts"] + 1,
                "failureStreak": user["failureStreak"] + 1
            })

            if user["failureStreak"] + 1 >= 3:
                message = random.choice(CANNED_RESPONSES["REJECTED_ASSIST"])
            else:
                message = random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])

        # --------------------------
        # TRANSACTION LOG
        # --------------------------
        await api_client.create_transaction({
            "userId": request.user_id,
            "sessionId": request.session_id,
            "amount": reward_amount,
            "decision": status,
            "reason": "Hybrid adaptive evaluation engine"
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
        print(f"Error in evaluate_policy: {e}")
        return PolicyResponse(
            status="REJECTED",
            score=0.0,
            threshold=0.0,
            security_level=0,
            reason=f"System error: {str(e)}",
            message="System Error"
        )


# =========================
# REJECTION HELPER
# =========================

async def _reject(reason, session_id, user_id, score, level):
    try:
        await api_client.create_transaction({
            "userId": user_id,
            "sessionId": session_id,
            "amount": 0,
            "decision": "REJECTED",
            "reason": reason
        })
    except Exception as e:
        print(f"Failed to log rejection: {e}")

    return PolicyResponse(
        status="REJECTED",
        score=float(score),
        threshold=0.0,
        security_level=level,
        reason=reason,
        message=random.choice(CANNED_RESPONSES["REJECTED_DEFAULT"])
    )

def _reject_sync(reason, request, score, level):
     return PolicyResponse(
        status="REJECTED",
        score=float(score),
        threshold=0.0,
        security_level=level,
        reason=reason,
        message="System Error"
    )
