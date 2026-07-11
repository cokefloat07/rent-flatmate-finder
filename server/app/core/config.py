from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Rent & Flatmate Finder API"
    DEBUG: bool = False

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "rent_flatmate_finder"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # LLM (Ollama)
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.1:8b"

    # Email (SMTP)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@rentflatmate.local"
    MAIL_FROM_NAME: str = "Rent & Flatmate Finder"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # CORS — frontend origins
    CLIENT_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""

    def get_cors_origins(self) -> list[str]:
        raw = self.CORS_ORIGINS.strip()
        if raw:
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return [self.CLIENT_URL]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()