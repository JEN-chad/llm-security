from sqlalchemy.orm import Session
from app.models import Session as SessionModel


def get_session(db: Session, session_id: str):
    return db.query(SessionModel).filter(
        SessionModel.session_id == session_id
    ).first()


def create_session(db: Session, session_id: str, user_id: int):
    session = SessionModel(   # 🔥 USE MODEL CLASS
        session_id=session_id,
        user_id=user_id,
        has_approved=False
    )
    db.add(session)
    db.commit()
    return session


def is_session_approved(db: Session, session_id: str) -> bool:
    session = get_session(db, session_id)
    if not session:
        return False
    return session.has_approved


def mark_session_approved(db: Session, session_id: str):
    session = get_session(db, session_id)
    if session:
        session.has_approved = True
        db.commit()
