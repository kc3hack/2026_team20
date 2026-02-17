from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from app.core.config import get_settings

settings = get_settings()


def _create_supabase_client() -> Client:
    """サーバーサイド用Supabaseクライアントを作成。"""
    return create_client(
        settings.supabase_url,
        settings.supabase_secret_key,
        options=SyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


supabase_client: Client = _create_supabase_client()

