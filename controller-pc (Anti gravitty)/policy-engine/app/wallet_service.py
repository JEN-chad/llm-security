from app.database import DBClient


def execute_heist_transfer(
    db: DBClient,
    user_id: str,
    amount: float,
    session_id: str,
    user_message: str = ""
) -> dict | bool:
    """
    Call db-service to atomically execute a heist transfer.

    The db-service performs ALL of the following inside a single PostgreSQL
    transaction (BEGIN → FOR UPDATE lock → deduct → credit → re-fetch →
    insert heist_history → update bank_balance → COMMIT).

    Returns the full result dict on success:
        {
            "success": True,
            "newVaultBalance": "29800.00",
            "heistRecord": { ... }
        }

    Returns False if the transfer failed for any reason (db error, insufficient
    funds, rollback, etc.).  The caller must NOT modify any balance value.
    """
    resp = db.post("/wallet/heist-transfer", json={
        "userId": user_id,
        "amount": amount,
        "sessionId": session_id,
        "userMessage": user_message,
    })

    if resp.status_code != 200:
        return False

    result = resp.json()
    if not result.get("success", False):
        return False

    return result


def get_main_wallet_balance(db: DBClient) -> float:
    """
    Read the current main wallet balance.
    Used for pre-flight checks ONLY (e.g., vault depletion guard).
    All balance-modifying operations must go through execute_heist_transfer.
    """
    resp = db.get("/wallet/main")
    if resp.status_code != 200:
        return 0.0
    wallet = resp.json()
    return float(wallet.get("balance", 0))


def initialize_main_wallet(db: DBClient):
    """
    Create main wallet if not exists (handled by db-service).
    """
    db.post("/wallet/init-main")
