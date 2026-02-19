"""画像処理サービス: 検証, リサイズ, ローカル保存"""

import io
import uuid
from pathlib import Path
from typing import NamedTuple

from PIL import Image

from app.core.config import get_settings

# Decompression Bomb 攻撃対策: 展開後のピクセル数上限を設定
# デフォルト(約1.79億px)では警告のみで阻止できないため、25Mピクセルで例外を発生させる
MAX_IMAGE_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class ResizedImage(NamedTuple):
    """resize_image の戻り値: リサイズ後の画像データとサイズとフォーマット情報"""

    data: bytes
    width: int
    height: int
    format: str  # "JPEG", "PNG", "GIF", "WEBP"
    extension: str  # ".jpg", ".png", ".gif", ".webp"


class ProcessedImage(NamedTuple):
    """process_and_save の戻り値: 保存先ファイル名とサイズとフォーマット情報"""

    filename: str
    width: int
    height: int
    format: str  # "JPEG", "PNG", "GIF", "WEBP"


MAX_IMAGE_HEIGHT = 10_000  # 高さの上限: 極端なアスペクト比の画像を拒否する
MAX_GIF_FRAMES = (
    500  # GIFフレーム数上限: 大量フレームによるメモリ・処理時間の爆発を防止
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
# 出力用に一般的な拡張子を標準の拡張子にマッピングする
EXTENSION_NORMALIZE = {".jpeg": ".jpg"}
# エラーメッセージ表示用: .jpeg は .jpg と同義のため除外した許可拡張子リスト
DISPLAY_EXTENSIONS = sorted(ALLOWED_EXTENSIONS - {".jpeg"})

# 入力フォーマットに応じた出力フォーマットと拡張子のマッピング
# api.md 準拠: 入力形式を保持して出力する（JPEG→JPEG, PNG→PNG, GIF→GIF, WEBP→WEBP）
FORMAT_MAP: dict[str, tuple[str, str]] = {
    "JPEG": ("JPEG", ".jpg"),
    "PNG": ("PNG", ".png"),
    "GIF": ("GIF", ".gif"),
    "WEBP": ("WEBP", ".webp"),
}

_MAGIC_BYTES: dict[bytes, str] = {
    b"\xff\xd8\xff": "JPEG",
    b"\x89PNG\r\n\x1a\n": "PNG",
    b"GIF87a": "GIF",
    b"GIF89a": "GIF",
    b"RIFF": "WEBP",  # RIFF????WEBP
}


def validate_extension(filename: str) -> str:
    """正規化されたファイル拡張子を検証し、返す。
    拡張子が許可されていない場合は ValueError が発生する。
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '{ext}' is not allowed. "
            f"Allowed: {', '.join(DISPLAY_EXTENSIONS)}"
        )
    return EXTENSION_NORMALIZE.get(ext, ext)


def validate_content_type(data: bytes) -> str:
    """ファイルの先頭バイトから実際の画像フォーマットを検証する。
    コンテンツが許可された画像形式と一致しない場合は ValueError が発生する。
    """
    if not data:
        raise ValueError("Empty file data")

    for magic, fmt in _MAGIC_BYTES.items():
        if data[: len(magic)] == magic:
            # RIFFコンテナの場合、WEBPサブタイプを追加検証
            # RIFF????WEBP の12バイト完全一致で AVI/WAV 等を除外する
            if magic == b"RIFF":
                if len(data) < 12 or data[8:12] != b"WEBP":
                    continue  # WEBPではないRIFFファイル
            return fmt
    raise ValueError("File content does not match any allowed image format")


def validate_file_size(data: bytes) -> None:
    """ファイルデータが最大サイズを超えていないことを検証する
    大きすぎる場合は ValueError が発生する
    """
    settings = get_settings()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ValueError("File size exceeds maximum allowed size (validation)")


def _process_gif(
    img: Image.Image,
    output_format: str,
    output_ext: str,
    max_width: int,
) -> ResizedImage:
    """GIFを処理し、アニメーションを保持して返す。"""
    # 幅チェック: GIFはアニメーション保持のためリサイズできないので、超過時は拒否する
    if img.width > max_width:
        raise ValueError(
            f"GIF width {img.width}px exceeds maximum {max_width}px. "
            "GIF images cannot be resized while preserving animation."
        )

    # GIFフレーム数上限チェック: 大量フレームによるメモリ・処理時間の爆発を防止
    n_frames = getattr(img, "n_frames", 1)
    if n_frames > MAX_GIF_FRAMES:
        raise ValueError(f"GIF has too many frames: {n_frames} (max: {MAX_GIF_FRAMES})")

    with io.BytesIO() as output:
        # アニメーションGIFのフレーム間隔・ループ回数を保持して保存
        save_kwargs: dict[str, object] = {"save_all": True}
        if "duration" in img.info:
            save_kwargs["duration"] = img.info["duration"]
        if "loop" in img.info:
            save_kwargs["loop"] = img.info["loop"]
        img.save(output, format="GIF", **save_kwargs)
        return ResizedImage(
            output.getvalue(),
            img.width,
            img.height,
            output_format,
            output_ext,
        )


def _convert_for_jpeg(img: Image.Image) -> Image.Image:
    """JPEG出力用に画像を変換する（透過→白背景合成、RGB変換）。"""
    if img.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        return background
    elif img.mode != "RGB":
        return img.convert("RGB")
    return img


def _save_image(
    img: Image.Image,
    output: io.BytesIO,
    output_format: str,
    quality: int,
) -> None:
    """フォーマット別に画像を保存する。"""
    if output_format == "PNG":
        img.save(output, format="PNG")
    elif output_format == "WEBP":
        img.save(output, format="WEBP", quality=quality)
    else:  # JPEG
        # プライバシー保護: EXIF メタデータ(GPS位置情報等)を除去して保存
        img.save(output, format="JPEG", quality=quality, exif=b"")


def resize_image(
    image_data: bytes,
    max_width: int | None = None,
    quality: int | None = None,
) -> ResizedImage:
    """max_width よりも幅が広い場合は画像のサイズを変更し、入力フォーマットを保持して出力する。
    (output_bytes, width, height, format, extension) を返す。
    """
    settings = get_settings()
    if max_width is None:
        max_width = settings.max_image_width
    if quality is None:
        quality = settings.jpeg_quality

    # PillowのJPEG qualityは1-95が推奨範囲。
    # WEBPは1-100をサポートするが、コード簡潔化のためJPEG準拠の95を上限とする。
    if not (1 <= quality <= 95):
        raise ValueError(f"Quality must be between 1 and 95, got {quality}")

    try:
        with Image.open(io.BytesIO(image_data)) as img:
            img.load()  # 遅延デコードを強制実行して破損を早期検出

            # 入力フォーマットを検出し、出力フォーマットを決定する
            input_format = img.format  # 'JPEG', 'PNG', 'GIF', 'WEBP'
            output_format, output_ext = FORMAT_MAP.get(
                input_format or "", ("JPEG", ".jpg")
            )

            # 二重防御: MAX_IMAGE_PIXELS を迂回された場合に備えた明示チェック
            pixel_count = img.width * img.height
            if pixel_count > MAX_IMAGE_PIXELS:
                raise ValueError(
                    f"Image too large: {img.width}x{img.height} "
                    f"({pixel_count:,} pixels exceeds 25M limit)"
                )

            # 高さ制限: 極端なアスペクト比（例: 1x100000）の画像を拒否する
            if img.height > MAX_IMAGE_HEIGHT:
                raise ValueError(
                    f"Image height {img.height}px exceeds maximum {MAX_IMAGE_HEIGHT}px"
                )

            # GIF はアニメーション保持のためリサイズせずそのまま保存する
            if output_format == "GIF":
                return _process_gif(img, output_format, output_ext, max_width)

            # アスペクト比を維持してサイズを変更する
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # JPEG 出力時は透過モードを白背景に合成してRGBに変換する
            if output_format == "JPEG":
                img = _convert_for_jpeg(img)

            with io.BytesIO() as output:
                _save_image(img, output, output_format, quality)
                return ResizedImage(
                    output.getvalue(),
                    img.width,
                    img.height,
                    output_format,
                    output_ext,
                )
    except Image.DecompressionBombError as e:
        raise ValueError(f"Image too large: {e}") from e
    except (Image.UnidentifiedImageError, SyntaxError, OSError) as e:
        raise ValueError(f"Invalid or corrupted image file: {e}") from e


def generate_filename(extension: str) -> str:
    """UUIDを使用して一意のファイル名を生成する"""
    return f"{uuid.uuid4().hex}{extension}"


def save_image(data: bytes, filename: str) -> Path:
    """画像バイトを画像ディレクトリに保存する。

    保存したファイルへのパスを返す。

    NOTE: この関数は同期I/O（ブロッキング）を行う。
    非同期コンテキストから呼び出す場合は `asyncio.to_thread` 経由で呼ぶこと。
    """
    settings = get_settings()
    images_dir = Path(settings.images_dir).resolve()
    images_dir.mkdir(parents=True, exist_ok=True)

    # パストラバーサル防止: ファイル名のみ抽出
    safe_filename = Path(filename).name
    if not safe_filename:
        raise ValueError("Invalid filename")

    filepath = images_dir / safe_filename
    # 最終確認: resolveしたパスがimages_dir配下であること
    if not filepath.resolve().is_relative_to(images_dir):
        raise ValueError("Invalid filename: path traversal detected")

    # UUID衝突チェック: 既存ファイルの上書きを防止する
    if filepath.exists():
        raise ValueError(f"File already exists: {safe_filename}")

    filepath.write_bytes(data)
    return filepath


def process_and_save(
    file_data: bytes,
    original_filename: str,
) -> ProcessedImage:
    """完全なパイプライン: 検証、サイズ変更、保存
    (ファイル名、幅、高さ、フォーマット) を返す
    検証に失敗した場合は ValueError が発生する
    """
    # 1. ファイル拡張子を検証する
    ext = validate_extension(original_filename)

    # 2. ファイルサイズを検証する
    validate_file_size(file_data)

    # 3. マジックバイトでファイル内容を検証する
    detected_format = validate_content_type(file_data)

    # 4. 拡張子とコンテンツの整合性チェック
    #    拡張子が.jpgなのに中身がPNG、のような不一致を検出する
    expected_ext = FORMAT_MAP[detected_format][1]
    if ext != expected_ext:
        raise ValueError(
            f"File extension '{ext}' does not match content type '{detected_format}'"
        )

    # 5. 入力フォーマットを保持してリサイズ・変換する
    resized = resize_image(file_data)

    # 6. 入力フォーマットに応じた拡張子でファイル名を生成して保存する
    filename = generate_filename(resized.extension)
    save_image(resized.data, filename)

    return ProcessedImage(filename, resized.width, resized.height, resized.format)
