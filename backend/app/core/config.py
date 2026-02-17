from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""

    # JWKS
    supabase_jwks_url: str = ""

    # Database
    database_url: str = ""

    # App
    app_name: str = "Plot Platform API"
    debug: bool = False

    # Images
    images_dir: str = "images"
    max_image_size_mb: int = 5
    max_image_width: int = 1920
    jpeg_quality: int = 85

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def effective_jwks_url(self) -> str:
        """JWKS URLを返す。明示設定がなければsupabase_urlから導出。"""
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
