"""画像処理サービス: サニタイズ, 縮尺変更, 保存してアップロード"""

import io
import uuid
from pathlib import Path

from PIL import Image

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
# 出力用に一般的な拡張子を標準の拡張子にマッピングする
EXTENSION_NORMALIZE = {".jpeg": ".jpg"}


def validate_extension(filename: str) -> str:
    """正規化されたファイル拡張子を検証し、返す。
    拡張子が許可されていない場合は ValueError が発生する。
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '{ext}' is not allowed. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS - {'.jpeg'}))}"
        )
    return EXTENSION_NORMALIZE.get(ext, ext)


def validate_file_size(data: bytes) -> None:
    """ファイルデータが最大サイズを超えていないことを検証する
    大きすぎる場合は ValueError が発生する
    """
    settings = get_settings()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ValueError(
            f"File size {len(data)} bytes exceeds maximum "
            f"{settings.max_image_size_mb}MB"
        )


def resize_image(
    image_data: bytes,
    max_width: int | None = None,
    quality: int | None = None,
) -> tuple[bytes, int, int]:
    """max_width よりも幅が広い場合は画像のサイズを変更し、JPEG に変換する
    (output_bytes, width, height) を返す
    """
    settings = get_settings()
    if max_width is None:
        max_width = settings.max_image_width
    if quality is None:
        quality = settings.jpeg_quality

    img = Image.open(io.BytesIO(image_data))

    # アスペクト比を維持してサイズを変更する
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    # 必要に応じてRGBに変換する（JPEGの場合）
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = io.BytesIO()
    img.save(output, format="JPEG", quality=quality)
    return output.getvalue(), img.width, img.height


def generate_filename() -> str:
    """UUIDを使用して一意のファイル名を生成する"""
    return f"{uuid.uuid4().hex}.jpg"


def save_image(data: bytes, filename: str) -> Path:
    """画像バイトを画像ディレクトリに保存する
    保存したファイルへのパスを返す
    """
    settings = get_settings()
    images_dir = Path(settings.images_dir)
    images_dir.mkdir(parents=True, exist_ok=True)
    filepath = images_dir / filename
    filepath.write_bytes(data)
    return filepath


def process_and_save(
    file_data: bytes,
    original_filename: str,
) -> tuple[str, int, int]:
    """完全なパイプライン: 検証、サイズ変更、保存
    (ファイル名、幅、高さ) を返す
    検証に失敗した場合は ValueError が発生する
    """
    # 1. サイズ変更を検証する
    validate_extension(original_filename)

    # 2. ファイルサイズを検証する
    validate_file_size(file_data)

    # 3. サイズを変更してJPEGに変換する
    processed_data, width, height = resize_image(file_data)

    # 4. 一意のファイル名を生成して保存する
    filename = generate_filename()
    save_image(processed_data, filename)

    return filename, width, height
