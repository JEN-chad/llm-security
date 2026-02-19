from app.api_client import api_client

async def transfer_from_main_to_user(user_id: int, amount: float) -> bool:
    """
    Atomically deduct from main wallet and credit user wallet via Node service.
    """
    return await api_client.transfer_funds(user_id, amount)

async def get_main_wallet_balance():
    return await api_client.get_main_wallet_balance()

async def initialize_main_wallet():
    # Initialization is now handled by Node service init endpoint
    pass
