"""Images endpoints: 画像アップロード・取得。

docs/api.md の Images セクション準拠:
- POST /  → 画像アップロード（要認証, multipart/form-data, 最大5MB）
- GET /{filename} → 画像取得（認証不要）

セキュリティ前提:
- リバースプロキシ (nginx等) で client_max_body_size / client_header_timeout /
  client_body_timeout を適切に設定し、Slowloris 等の L7 DoS を緩和すること。
  本エンドポイントはアプリケーション層の防御のみ担当する。
"""

import asyncio
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi import Path as PathParam
from fastapi.responses import Response
from PIL import Image

from app.api.v1.deps import AuthUser
from app.core.config import get_settings
from app.schemas import ImageUploadResponse
from app.services import image_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Content-Type マッピング: 拡張子 → MIME タイプ
_MEDIA_TYPES: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

_image_executor: ThreadPoolExecutor | None = None


def _get_image_executor() -> ThreadPoolExecutor:
    """画像処理専用の ThreadPoolExecutor をシングルトンで取得する。

    遅延初期化: 初回呼び出し時にのみ生成し、以降はキャッシュを返す。
    """
    global _image_executor  # noqa: PLW0603
    if _image_executor is None:
        settings = get_settings()
        _image_executor = ThreadPoolExecutor(
            max_workers=settings.image_processing_max_workers,
            thread_name_prefix="image-proc",
        )
    return _image_executor


@router.post(
    "/",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(file: UploadFile, current_user: AuthUser) -> ImageUploadResponse:
    """画像アップロード。認証必須。

    - 許可形式: .jpg, .png, .gif, .webp
    - 最大サイズ: 5MB
    - 自動リサイズ: 最大幅1920px、アスペクト比維持
    - 出力形式: 入力形式を保持（JPEG/JPEG, PNG/PNG, GIF/GIF, WEBP/WEBP）

    Args:
        file: アップロードする画像ファイル
        current_user: 認証済みユーザー（認証強制のため依存注入。現状未使用、将来の監査ログ用）
    """
    if file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    settings = get_settings()
    max_upload_bytes = settings.max_image_size_mb * 1024 * 1024

    # チャンク読み込み中にサイズチェック（HTTP 413）
    # process_and_save内のvalidate_file_sizeでも二重チェック（HTTP 400に変換）
    try:
        buffer = io.BytesIO()
        total = 0
        while chunk := await file.read(8192):
            total += len(chunk)
            if total > max_upload_bytes:
                while await file.read(65536):
                    pass
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed size",
                )
            buffer.write(chunk)
        file_data = buffer.getvalue()

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            _get_image_executor(),
            image_service.process_and_save,
            file_data,
            file.filename,
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning("Image upload validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Image.DecompressionBombError as e:
        logger.warning("Decompression bomb detected: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large: {e}",
        ) from e
    except (Image.UnidentifiedImageError, SyntaxError) as e:
        logger.warning("Invalid image file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image file: {e}",
        ) from e
    except OSError as e:
        logger.error("Image processing I/O error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image processing failed due to server error",
        ) from e
    finally:
        await file.close()

    return ImageUploadResponse(
        url=f"/api/v1/images/{result.filename}",
        filename=result.filename,
        width=result.width,
        height=result.height,
    )


@router.get("/{filename}")
async def get_image(
    filename: str = PathParam(
        ...,
        pattern=r"^[a-f0-9]{32}\.[a-z0-9]+$",
        description="UUID hex (32 chars) + extension",
    ),
) -> Response:
    """画像取得。認証不要。"""
    ext = Path(filename).suffix.lower()
    media_type = _MEDIA_TYPES.get(ext, "application/octet-stream")

    try:
        content = image_service.download_image_from_supabase(filename)
    except Exception as e:
        logger.warning("Image not found in Supabase Storage: %s (%s)", filename, e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        ) from e

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )
