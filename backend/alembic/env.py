import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Model metadata for autogenerate support ---
# Import all models so that Base.metadata contains all table definitions.
from app.core.database import Base  # noqa: E402
from app.models import *  # noqa: E402, F401, F403

target_metadata = Base.metadata

# --- Dynamic DATABASE_URL from environment ---
# Why: Credentials should never be hardcoded in alembic.ini.
# Priority: DATABASE_URL_MIGRATE > DATABASE_URL
#
# Why: マイグレーションにはDDL (CREATE TABLE等) を実行できる接続が必要。
# Supabase の Transaction Pooler (port 6543) ではDDL文が失敗するため、
# マイグレーション専用の接続先を DATABASE_URL_MIGRATE で指定できるようにしている。
# DATABASE_URL_MIGRATE が未設定の場合は DATABASE_URL にフォールバックする。
#
# 推奨接続先: Supabase Session Pooler (port 5432 on pooler host)
#   - DDLをサポート（セッション単位でコネクションを維持するため）
#   - IPv4で接続可能（Direct Connectionの db.*.supabase.co はIPv6優先のため
#     ローカル環境で "Network is unreachable" エラーが発生する場合がある）
#
# URL形式:
#   postgresql://postgres.[PROJECT_REF]:[PASS]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
#
# ※ Direct Connection (db.[REF].supabase.co:5432) はIPv6問題でローカルから
#   接続できない場合があるため、Session Pooler URLの使用を推奨。
database_url = os.environ.get("DATABASE_URL_MIGRATE") or os.environ.get(
    "DATABASE_URL", ""
)
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
