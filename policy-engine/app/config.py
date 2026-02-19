from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    NODE_SERVICE_URL: str = "http://node-drizzle:3000/internal"

    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in env file

settings = Settings()
