"""Image processing service: sanitize, resize, and save uploaded images."""

import io
import uuid
from pathlib import Path

from PIL import Image

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
# Map common extensions to canonical ones for output
EXTENSION_NORMALIZE = {".jpeg": ".jpg"}


def validate_extension(filename: str) -> str:
    """Validate and return the normalized file extension.

    Raises ValueError if the extension is not allowed.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '{ext}' is not allowed. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS - {'.jpeg'}))}"
        )
    return EXTENSION_NORMALIZE.get(ext, ext)


def validate_file_size(data: bytes) -> None:
    """Validate that file data does not exceed the maximum size.

    Raises ValueError if too large.
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
    """Resize image if wider than max_width, convert to JPEG.

    Returns (output_bytes, width, height).
    """
    settings = get_settings()
    if max_width is None:
        max_width = settings.max_image_width
    if quality is None:
        quality = settings.jpeg_quality

    img = Image.open(io.BytesIO(image_data))

    # Resize maintaining aspect ratio
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    # Convert to RGB if necessary (for JPEG)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = io.BytesIO()
    img.save(output, format="JPEG", quality=quality)
    return output.getvalue(), img.width, img.height


def generate_filename() -> str:
    """Generate a unique filename using UUID."""
    return f"{uuid.uuid4().hex}.jpg"


def save_image(data: bytes, filename: str) -> Path:
    """Save image bytes to the images directory.

    Returns the path to the saved file.
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
    """Full pipeline: validate, resize, save.

    Returns (filename, width, height).
    Raises ValueError on validation failure.
    """
    # 1. Validate extension
    validate_extension(original_filename)

    # 2. Validate file size
    validate_file_size(file_data)

    # 3. Resize and convert to JPEG
    processed_data, width, height = resize_image(file_data)

    # 4. Generate unique filename and save
    filename = generate_filename()
    save_image(processed_data, filename)

    return filename, width, height
