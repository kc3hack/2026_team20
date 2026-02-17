import logging
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.schemas import CurrentUser

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()


# ─── JWKS キャッシュ ───────────────────────────────────────────
class JWKSKeyManager:
    """Supabase JWKS エンドポイントから公開鍵を取得・キャッシュする。
    Supabase のエッジサーバーが JWKS を10分間キャッシュしているため、
    こちら側でも同程度のTTLでキャッシュする。
    """

    def __init__(self, jwks_url: str):
        self._jwks_url = jwks_url
        self._jwks_client = jwt.PyJWKClient(
            jwks_url,
            cache_keys=True,  # キーをメモリにキャッシュ
            lifespan=600,  # 10分間キャッシュ（Supabase側と同じ）
            headers={"User-Agent": "plot-platform-api/1.0"},
        )

    def get_signing_key(self, token: str) -> jwt.PyJWK:
        """JWTヘッダーの kid に基づいて対応する公開鍵を取得。"""
        return self._jwks_client.get_signing_key_from_jwt(token)


# シングルトン（アプリ起動時に初期化）
_jwks_manager: JWKSKeyManager | None = None


def _get_jwks_manager() -> JWKSKeyManager:
    global _jwks_manager
    if _jwks_manager is None:
        jwks_url = settings.effective_jwks_url
        if not jwks_url:
            raise RuntimeError("JWKS URL is not configured")
        _jwks_manager = JWKSKeyManager(jwks_url)
    return _jwks_manager


def _verify_jwks(token: str) -> dict:
    """New: JWKS + ES256（非対称鍵）で検証。"""
    manager = _get_jwks_manager()
    signing_key = manager.get_signing_key(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=f"{settings.supabase_url.rstrip('/')}/auth/v1",
    )


# ─── FastAPI Dependencies ────────────────────────────────────
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> CurrentUser:
    """
    JWT を検証して CurrentUser を返す。
    JWKS エンドポイントの公開鍵で検証
    """
    token = credentials.credentials
    try:
        logger.debug("Verifying token with JWKS/ES256")
        payload = _verify_jwks(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing user id in token",
            )
        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
        )
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        ) from e
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e
    except httpx.HTTPError as e:
        logger.error("Failed to fetch JWKS: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable",
        ) from e


async def get_optional_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(HTTPBearer(auto_error=False)),
    ],
) -> CurrentUser | None:
    if credentials is None:
        return None
    return await get_current_user(credentials)
