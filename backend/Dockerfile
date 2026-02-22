FROM python:3.13-slim

# 作業ディレクトリの設定
WORKDIR /app

# uv のインストール
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# プロジェクトの依存関係ファイルをコピー
COPY pyproject.toml uv.lock ./

# 環境変数の設定 (Python)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

# 依存関係のインストール (本番用)
RUN uv sync --frozen --no-dev

# アプリケーションコードのコピー
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./alembic.ini

# コンテナが使用するポートを公開
EXPOSE 8000

# FastAPI アプリケーションの起動
CMD ["uv", "run", "fastapi", "run", "app/main.py", "--port", "8000", "--host", "0.0.0.0"]
