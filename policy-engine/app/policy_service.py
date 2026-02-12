from app.schemas import PolicyEvaluationRequest, PolicyResponse
from sqlalchemy.orm import Session
from app.wallet_service import transfer_from_main_to_user
from app.session_service import get_session, create_session
from app.models import Transaction
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from decimal import Decimal


def evaluate_policy(request: PolicyEvaluationRequest, db: Session) -> PolicyResponse:
    try:
        # Convert requested amount safely
        requested_amount = Decimal(str(request.requested_amount))

        # -------------------------
        # 0️⃣ Daily limit check
        # -------------------------
        daily_total = db.execute(
            text("""
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE session_id IN (
                    SELECT session_id FROM sessions WHERE user_id = :user_id
                )
                AND decision = 'approved'
                AND created_at >= CURRENT_DATE
            """),
            {"user_id": request.user_id}
        ).scalar()

        daily_total = Decimal(str(daily_total))

        if daily_total + requested_amount > Decimal("1000"):
            return _reject("Daily user limit exceeded", request.session_id, requested_amount, db)

        # -------------------------
        # 1️⃣ Get or create session
        # -------------------------
        session = get_session(db, request.session_id)

        if not session:
            create_session(db, request.session_id, request.user_id)
            session = get_session(db, request.session_id)

        # Security: session-user match
        if session.user_id != request.user_id:
            return _reject("Session-user mismatch", request.session_id, requested_amount, db)

        # Prevent re-approval
        if session.has_approved:
            return _reject("Session already approved", request.session_id, requested_amount, db)

        # -------------------------
        # 2️⃣ Strict validations
        # -------------------------
        if requested_amount <= Decimal("0"):
            return _reject("Invalid amount", request.session_id, requested_amount, db)

        if requested_amount > Decimal("500"):
            return _reject("Amount exceeds session limit", request.session_id, requested_amount, db)

        if request.analysis_scores.logical_strength < 0.75:
            return _reject("Logical strength too low", request.session_id, requested_amount, db)

        if request.analysis_scores.emotional_pressure > 0.5:
            return _reject("Emotional manipulation too high", request.session_id, requested_amount, db)

        if request.confidence_score < 0.8:
            return _reject("Confidence score too low", request.session_id, requested_amount, db)

        if request.risk_flags.prompt_injection:
            return _reject("Prompt injection detected", request.session_id, requested_amount, db)

        if request.risk_flags.override_attempt:
            return _reject("Override attempt detected", request.session_id, requested_amount, db)

        # -------------------------
        # 3️⃣ Final weighted score
        # -------------------------
        final_score = (
            request.analysis_scores.logical_strength * 0.5 +
            request.confidence_score * 0.3 -
            request.analysis_scores.emotional_pressure * 0.4
        )

        if final_score < 0.5:
            return _reject("Overall persuasion score too low", request.session_id, requested_amount, db)

        # -------------------------
        # 4️⃣ Atomic wallet transfer
        # -------------------------
        success = transfer_from_main_to_user(
            db,
            request.user_id,
            requested_amount
        )

        if not success:
            return _reject("Insufficient main wallet balance", request.session_id, requested_amount, db)

        # -------------------------
        # 5️⃣ Mark session approved
        # -------------------------
        session.has_approved = True

        txn = Transaction(
            session_id=request.session_id,
            amount=requested_amount,
            decision="approved",
            reason="Policy passed strict validation"
        )

        db.add(txn)
        db.commit()

        return PolicyResponse(
            status="approved",
            approved_amount=float(requested_amount),
            reason="Policy passed strict validation"
        )

    except SQLAlchemyError:
        db.rollback()
        return PolicyResponse(
            status="rejected",
            approved_amount=0.0,
            reason="Database error"
        )


# -------------------------
# Rejection handler
# -------------------------
def _reject(reason: str, session_id: str, amount: Decimal, db: Session) -> PolicyResponse:
    _log_transaction(db, session_id, amount, "rejected", reason)
    return PolicyResponse(
        status="rejected",
        approved_amount=0.0,
        reason=reason
    )


def _log_transaction(db: Session, session_id: str, amount: Decimal, decision: str, reason: str):
    txn = Transaction(
        session_id=session_id,
        amount=amount,
        decision=decision,
        reason=reason
    )
    db.add(txn)
    db.commit()
