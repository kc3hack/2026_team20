from functools import lru_cache

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """サーバーサイド用Supabaseクライアントを遅延初期化で作成。"""
    settings = get_settings()

    if not settings.supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is not configured. "
            "Please set the SUPABASE_URL environment variable."
        )

    if not settings.supabase_secret_key:
        raise RuntimeError(
            "SUPABASE_SECRET_KEY is not configured. "
            "Please set the SUPABASE_SECRET_KEY environment variable."
        )

    return create_client(
        settings.supabase_url,
        settings.supabase_secret_key.get_secret_value(),
        options=SyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def __getattr__(name: str):
    if name == "supabase_client":
        return get_supabase_client()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
