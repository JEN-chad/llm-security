import time
import requests
from app.config import settings


class DBClient:
    """HTTP client that wraps calls to the db-service (Drizzle ORM)."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._wait_for_service()

    def _wait_for_service(self):
        """Wait for db-service to be ready (important for Docker startup order)."""
        for attempt in range(30):
            try:
                resp = requests.get(f"{self.base_url}/health", timeout=5)
                if resp.status_code == 200:
                    print("✅ Connected to DB Service")
                    return
            except (requests.ConnectionError, requests.Timeout):
                pass
            print(f"⏳ Waiting for DB Service... attempt {attempt + 1}")
            time.sleep(3)
        raise Exception("❌ Could not connect to DB Service after retries")

    def get(self, path: str, params: dict = None):
        resp = requests.get(f"{self.base_url}{path}", params=params, timeout=10)
        return resp

    def post(self, path: str, json: dict = None, timeout: int = 120):
        resp = requests.post(f"{self.base_url}{path}", json=json, timeout=timeout)
        return resp

    def patch(self, path: str, json: dict = None):
        resp = requests.patch(f"{self.base_url}{path}", json=json, timeout=10)
        return resp


# Create singleton client
db_client = DBClient(settings.DB_SERVICE_URL)


def get_db():
    """FastAPI dependency — returns the HTTP client."""
    yield db_client
