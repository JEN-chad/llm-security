from app.api_client import api_client

async def get_session(session_id: str):
    return await api_client.get_session(session_id)

async def create_session(session_id: str, user_id: int):
    return await api_client.create_session(session_id, user_id)

async def is_session_approved(session_id: str) -> bool:
    session = await get_session(session_id)
    if not session:
        return False
    # Node service returns 'hasApproved' (camelCase)
    return session.get("hasApproved", False)

async def mark_session_approved(session_id: str):
    await api_client.approve_session(session_id)
