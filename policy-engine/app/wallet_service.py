from app.database import DBClient


def transfer_from_main_to_user(db: DBClient, user_id: int, amount: float) -> bool:
    """
    Call db-service to atomically deduct from main wallet and credit user wallet.
    """
    resp = db.post("/wallet/transfer", json={
        "userId": user_id,
        "amount": amount
    })

    if resp.status_code != 200:
        return False

    result = resp.json()
    return result.get("success", False)


def get_main_wallet_balance(db: DBClient):
    resp = db.get("/wallet/main")
    if resp.status_code != 200:
        return 0
    wallet = resp.json()
    return float(wallet.get("balance", 0))


def initialize_main_wallet(db: DBClient):
    """
    Create main wallet if not exists (handled by db-service).
    """
    db.post("/wallet/init-main")
