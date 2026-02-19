from app.database import DBClient


def get_session(db: DBClient, session_id: str):
    resp = db.get(f"/sessions/{session_id}")
    if resp.status_code == 404:
        return None
    return resp.json()


def create_session(db: DBClient, session_id: str, user_id: int):
    resp = db.post("/sessions", json={
        "sessionId": session_id,
        "userId": user_id,
        "hasApproved": False
    })
    return resp.json()


def is_session_approved(db: DBClient, session_id: str) -> bool:
    session = get_session(db, session_id)
    if not session:
        return False
    return session.get("hasApproved", False)


def mark_session_approved(db: DBClient, session_id: str):
    db.patch(f"/sessions/{session_id}", json={"hasApproved": True})
