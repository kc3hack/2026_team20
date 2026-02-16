from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # App
    app_name: str = "Plot Platform API"
    debug: bool = False

    # Images
    images_dir: str = "images"
    max_image_size_mb: int = 5
    max_image_width: int = 1920
    jpeg_quality: int = 85

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
