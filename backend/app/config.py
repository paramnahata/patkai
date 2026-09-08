from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    app_name: str = "PATKAI"
    environment: str = "demo"
    database_url: str = "sqlite:///./patkai.db"
    jwt_secret: str = "change-me-in-production"
    jwt_exp_minutes: int = 480
    cors_origins: str = "http://localhost:3000"
    storage_dir: str = "./storage"
    model_path: str = "../ml/models/landslide_model.joblib"
    weather_api_key: str = ""
    imd_api_url: str = ""
    satellite_api_url: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
