import httpx
from app.config import settings

class APIClient:
    def __init__(self):
        self.base_url = settings.NODE_SERVICE_URL
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def get_user(self, user_id: int):
        try:
            resp = await self.client.get(f"/users/{user_id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def ensure_user(self, user_id: int, username: str = None):
        resp = await self.client.post("/users/ensure", json={"id": user_id, "username": username})
        resp.raise_for_status()
        return resp.json()

    async def update_user_stats(self, user_id: int, updates: dict):
        resp = await self.client.patch(f"/users/{user_id}/stats", json=updates)
        resp.raise_for_status()
        return resp.json()

    async def get_global_stats(self):
        resp = await self.client.get("/global-stats")
        resp.raise_for_status()
        return resp.json()

    async def update_global_stats(self, updates: dict):
        resp = await self.client.patch("/global-stats", json=updates)
        resp.raise_for_status()
        return resp.json()

    async def create_transaction(self, data: dict):
        resp = await self.client.post("/transactions", json=data)
        resp.raise_for_status()
        return resp.json()

    async def get_recent_transaction_count(self, user_id: int):
        resp = await self.client.get("/transactions/recent-count", params={"userId": user_id})
        resp.raise_for_status()
        return resp.json()["count"]

    async def transfer_funds(self, user_id: int, amount: float):
        resp = await self.client.post("/wallets/transfer", json={"userId": user_id, "amount": float(amount)})
        if resp.status_code == 400:
             return False
        resp.raise_for_status()
        return resp.json().get("success", False)

    async def get_main_wallet_balance(self):
        resp = await self.client.get("/wallets/main")
        resp.raise_for_status()
        return resp.json()["balance"]
    
    async def create_session(self, session_id: str, user_id: int):
        resp = await self.client.post("/sessions", json={"sessionId": session_id, "userId": user_id})
        resp.raise_for_status()
        
    async def get_session(self, session_id: str):
        resp = await self.client.get(f"/sessions/{session_id}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def approve_session(self, session_id: str):
        resp = await self.client.patch(f"/sessions/{session_id}/approve")
        resp.raise_for_status()

    async def init_db(self):
        try:
            await self.client.post("/init")
        except:
            pass 

# Singleton instance
api_client = APIClient()
