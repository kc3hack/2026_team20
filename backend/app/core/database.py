from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_engine() -> Engine:
    """データベースエンジンを遅延初期化で作成。

    モジュールインポート時ではなく、実際にDB接続が必要になった時点で作成される。
    これにより、環境変数未設定時のクラッシュを防ぎ、テスト時にモックしやすくなる。
    """
    settings = get_settings()

    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Please set the DATABASE_URL environment variable. "
            "For Supabase, use the Transaction Pooler URL (port 6543)."
        )

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={} if settings.debug else {"sslmode": "require"},
    )


class Base(DeclarativeBase):
    pass


# Supabase Transaction Poolerを使う（ポート6543）
# 注意: マイグレーションはDirect Connection（ポート5432）で行う
@lru_cache
def get_session_local() -> sessionmaker:
    """SessionLocalを遅延初期化で作成。"""
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def get_db() -> Generator[Session]:
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
