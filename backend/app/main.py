import logging
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.database import get_engine, get_session_local
from app.core.supabase import get_supabase_client

settings = get_settings()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Logging Setup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _setup_logging() -> None:
    """アプリケーションのログ設定を初期化。
    settings.log_format に応じて JSON またはテキスト形式を選択。
    外部ライブラリのノイズを抑制する。
    """
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    if settings.log_format == "json":
        fmt = (
            '{"time":"%(asctime)s","level":"%(levelname)s",'
            '"logger":"%(name)s","message":"%(message)s"}'
        )
    else:
        fmt = "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
    logging.basicConfig(level=level, format=fmt, force=True)
    # 外部ライブラリのログレベルを抑制
    for noisy_logger in ("uvicorn.access", "sqlalchemy.engine", "httpx"):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)


_setup_logging()
logger = logging.getLogger("app")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Lifespan
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_images_dir = Path(settings.images_dir)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """アプリケーションのライフサイクル管理。
    startup : 起動ログ（将来的にキャッシュ warm-up 等を追加可能）
    shutdown: DB コネクションプールを安全に解放
    """
    logger.info(
        "Starting %s (debug=%s, log_format=%s)",
        settings.app_name,
        settings.debug,
        settings.log_format,
    )
    try:
        _images_dir.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        logger.warning(
            "Cannot create images directory '%s': permission denied. "
            "Image upload will not work.",
            _images_dir,
        )

    yield

    # --- shutdown ---
    get_engine().dispose()
    get_engine.cache_clear()
    get_session_local.cache_clear()
    get_supabase_client.cache_clear()
    logger.info("Shutdown complete – DB connections disposed")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  App
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    # 本番では Swagger / ReDoc / OpenAPI を非表示
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/api/v1/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Exception Handlers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """HTTPException を api.md 準拠の {"detail": "..."} 形式で返す。"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """バリデーションエラーを構造化して返す。"""
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(part) for part in error["loc"])
        errors.append({"field": loc, "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """予期しない例外をキャッチ。
    - スタックトレースをログに記録（運用チーム向け）
    - クライアントには安全なメッセージのみ返す（情報漏洩防止）
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error [request_id=%s]", request_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Middleware（実行順序: 下から上に積まれる）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. CORS（最も外側 = 最初に実行される）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"]
    if settings.debug
    else settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Request ID + リクエストログ
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """全リクエストに対して:
    1. Request ID を付与（既存ヘッダーがあればそれを使用）
    2. 処理時間を計測
    3. レスポンスヘッダーに Request ID を付与
    4. ログに記録
    """
    # Request ID: クライアントから渡されればそれを使用、なければ生成
    raw_request_id = request.headers.get("X-Request-ID")
    if raw_request_id is not None:
        sanitized_request_id = (
            raw_request_id.replace("\r", "").replace("\n", "").strip()
        )
        if 0 < len(sanitized_request_id) <= 36:
            request_id = sanitized_request_id
        else:
            request_id = str(uuid.uuid4())
    else:
        request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    # レスポンスヘッダーにも付与（フロントエンドがエラー報告時に使える）
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s -> %d (%.1fms) [rid=%s]",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    return response


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Router
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.include_router(api_router, prefix="/api/v1")
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Static files
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.mount("/api/v1/images", StaticFiles(directory=str(_images_dir)), name="images")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Health check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """アプリケーションと DB の死活確認。
    - status: "ok" or "degraded"
    - database: "ok" or "error"
    """
    try:
        SessionLocal = get_session_local()
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    overall = "ok" if db_status == "ok" else "degraded"
    return {"status": overall, "database": db_status}

