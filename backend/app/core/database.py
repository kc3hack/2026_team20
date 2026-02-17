from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()
# Supabase Transaction Poolerを使う（ポート6543）
# 注意: マイグレーションはDirect Connection（ポート5432）で行う
engine = create_engine(
    settings.database_url, pool_pre_ping=True, pool_size=5, max_overflow=10
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
