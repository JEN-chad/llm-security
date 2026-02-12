from app.schemas import PolicyEvaluationRequest, PolicyResponse
from sqlalchemy.orm import Session
from app.wallet_service import transfer_from_main_to_user
from app.session_service import get_session, create_session

from app.session_service import is_session_approved, mark_session_approved, get_session, create_session
from app.models import Transaction

def evaluate_policy(request: PolicyEvaluationRequest, db: Session) -> PolicyResponse:
    if not get_session(db, request.session_id):
        create_session(db, request.session_id, request.user_id)

    # 0. Strict input validation
    if request.requested_amount <= 0:
        return _reject("Invalid amount", request.session_id, request.requested_amount, db)

    if not (0 <= request.confidence_score <= 1):
        return _reject("Invalid confidence score", request.session_id, request.requested_amount, db)

    if not (0 <= request.analysis_scores.logical_strength <= 1):
        return _reject("Invalid logical strength", request.session_id, request.requested_amount, db)

    if not (0 <= request.analysis_scores.emotional_pressure <= 1):
        return _reject("Invalid emotional pressure", request.session_id, request.requested_amount, db)

    # 1. Ensure session exists
    if not get_session(db, request.session_id):
        create_session(db, request.session_id, request.user_id)

    # 2. Check session already approved
    if is_session_approved(db, request.session_id):
        return _reject("Session already approved", request.session_id, request.requested_amount, db)

    # 3. Risk flags
    if request.risk_flags.prompt_injection:
        return _reject("Prompt injection detected", request.session_id, request.requested_amount, db)

    if request.risk_flags.override_attempt:
        return _reject("Override attempt detected", request.session_id, request.requested_amount, db)

    # 4. Strict thresholds
    if request.analysis_scores.logical_strength < 0.75:
        return _reject("Logical strength too low", request.session_id, request.requested_amount, db)

    if request.analysis_scores.emotional_pressure > 0.5:
        return _reject("Emotional manipulation too high", request.session_id, request.requested_amount, db)

    if request.confidence_score < 0.8:
        return _reject("Confidence score too low", request.session_id, request.requested_amount, db)

    if request.requested_amount > 500:
        return _reject("Amount exceeds session limit", request.session_id, request.requested_amount, db)

    final_score = (
    request.analysis_scores.logical_strength * 0.5 +
    request.confidence_score * 0.3 -
    request.analysis_scores.emotional_pressure * 0.4
    )

    if final_score < 0.5:
        return _reject("Overall persuasion score too low", request.session_id, request.requested_amount, db)


    # 5. Transfer from main wallet to user wallet (atomic)
    success = transfer_from_main_to_user(
        db,
        request.user_id,
        request.requested_amount
    )

    if not success:
        return _reject("Insufficient main wallet balance", request.session_id, request.requested_amount, db)

    # 6. Mark session approved
    mark_session_approved(db, request.session_id)

    _log_transaction(
        db,
        request.session_id,
        request.requested_amount,
        "approved",
        "Policy passed"
    )

    return PolicyResponse(
        status="approved",
        approved_amount=request.requested_amount,
        reason="Policy passed strict validation"
    )

def _reject(reason: str, session_id: str, amount: float, db: Session) -> PolicyResponse:
    _log_transaction(db, session_id, amount, "rejected", reason)
    return PolicyResponse(
        status="rejected",
        approved_amount=0.0,
        reason=reason
    )

def _log_transaction(db: Session, session_id: str, amount: float, decision: str, reason: str):
    txn = Transaction(
        session_id=session_id,
        amount=amount,
        decision=decision,
        reason=reason
    )
    db.add(txn)
    db.commit()
