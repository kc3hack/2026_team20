from functools import lru_cache

from pydantic import SecretStr, field_validator
from pydantic.fields import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: SecretStr = SecretStr("")

    # JWKS
    supabase_jwks_url: str = ""

    # Database
    database_url: str = Field(default="", description="PostgreSQL connection URL")

    # App
    app_name: str = "Plot Platform API"
    debug: bool = True
    allowed_origins: list[str] = ["http://localhost:3000"]
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "text"

    # Images
    supabase_images_bucket: str = "images"
    max_image_size_mb: int = Field(default=5, gt=0)
    max_image_width: int = Field(default=1920, gt=0)
    jpeg_quality: int = Field(default=85, ge=1, le=95)

    image_processing_max_workers: int = Field(default=4, ge=1, le=32)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def effective_jwks_url(self) -> str:
        """JWKS URLを返す。明示設定がなければsupabase_urlから導出。"""
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return ""

    @field_validator("supabase_secret_key")
    @classmethod
    def validate_supabase_secret_key(cls, v: SecretStr) -> SecretStr:
        """SUPABASE_SECRET_KEYが空の場合に警告する。

        本番環境では認証が失敗するため早期に気付けるよう警告を出す。
        """
        if not v.get_secret_value():
            import warnings

            warnings.warn(
                "SUPABASE_SECRET_KEY is not set. Authentication may fail. "
                "Set SUPABASE_SECRET_KEY in your environment.",
                UserWarning,
                stacklevel=2,
            )
        return v

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """DATABASE_URLが設定されていない場合、開発時は警告のみ。
        本番環境では環境変数が必須だが、ここではクラッシュさせず警告に留める。
        実際の接続は database.py で行うため、ここでは形式チェックのみ。
        """
        if not v:
            import warnings

            warnings.warn(
                "DATABASE_URL is not set. Database connections will fail. "
                "Set DATABASE_URL in your environment or .env file.",
                UserWarning,
                stacklevel=2,
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
