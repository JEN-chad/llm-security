from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_SERVICE_URL: str = "http://db-service:8002"

    class Config:
        env_file = ".env"

settings = Settings()
