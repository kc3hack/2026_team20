"""Images endpoints: 画像アップロード・取得。

docs/api.md の Images セクション準拠:
- POST /  → 画像アップロード（要認証, multipart/form-data, 最大5MB）
- GET /{filename} → 画像取得（認証不要）
"""

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi import Path as PathParam
from fastapi.responses import FileResponse

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
        chunks: list[bytes] = []
        total = 0
        while chunk := await file.read(8192):
            total += len(chunk)
            if total > max_upload_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed size",
                )
            chunks.append(chunk)
        file_data = b"".join(chunks)

        result = await asyncio.to_thread(
            image_service.process_and_save, file_data, file.filename
        )
    except ValueError as e:
        logger.warning("Image upload failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
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
) -> FileResponse:
    """画像取得。認証不要。"""
    ext = Path(filename).suffix.lower()
    media_type = _MEDIA_TYPES.get(ext, "application/octet-stream")

    settings = get_settings()
    images_dir = Path(settings.images_dir).resolve()
    filepath = images_dir / Path(filename).name

    # パストラバーサル防止: resolve後のパスがimages_dir配下であることを確認
    if not filepath.resolve().is_relative_to(images_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    if not filepath.exists():
        logger.warning("Image not found: %s", filename)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    return FileResponse(
        filepath,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )
