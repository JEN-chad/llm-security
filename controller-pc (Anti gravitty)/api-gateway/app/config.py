from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POLICY_ENGINE_URL: str
    LLM_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()


