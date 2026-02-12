from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import Wallet
from decimal import Decimal 


def transfer_from_main_to_user(db: Session, user_id: int, amount: float) -> bool:
    """
    Atomically deduct from main wallet and credit user wallet.
    """
    amount = Decimal(str(amount))  
    # 1️⃣ Deduct from main wallet atomically
    result = db.execute(
        text("""
            UPDATE wallet
            SET balance = balance - :amount
            WHERE is_main = true AND balance >= :amount
        """),
       {"amount":amount}            

    )

    if result.rowcount == 0:
        db.rollback()
        return False

    # 2️⃣ Credit user wallet
    user_wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()

    if not user_wallet:
        user_wallet = Wallet(user_id=user_id, balance=amount, is_main=False)
        db.add(user_wallet)
    else:
        user_wallet.balance += amount

    db.commit()
    return True


def get_main_wallet_balance(db: Session):
    main_wallet = db.query(Wallet).filter(Wallet.is_main == True).first()
    if not main_wallet:
        return 0
    return float(main_wallet.balance)


def initialize_main_wallet(db: Session):
    """
    Create main wallet if not exists.
    """
    wallet = db.query(Wallet).filter(Wallet.is_main == True).first()
    if not wallet:
        wallet = Wallet(balance=10000, is_main=True)
        db.add(wallet)
        db.commit()
