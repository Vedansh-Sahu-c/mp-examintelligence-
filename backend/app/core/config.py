from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://mponline:mponline_password@localhost:5432/examintelligence"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-pro"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    OCR_ENGINE: str = "gemini"

    class Config:
        env_file = ".env"

settings = Settings()
