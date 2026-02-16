"""Tests for Image upload API endpoints."""

import io
import os
import shutil
import tempfile
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services import image_service


@pytest.fixture(autouse=True)
def setup_database():
    """Override conftest's autouse setup_database — images don't need DB."""
    yield


@pytest.fixture
def client():
    """FastAPI test client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def temp_images_dir():
    """Use a temporary directory for image storage during tests."""
    tmpdir = tempfile.mkdtemp()
    with patch.object(
        image_service,
        "get_settings",
        return_value=_fake_settings(tmpdir),
    ):
        yield tmpdir
    shutil.rmtree(tmpdir, ignore_errors=True)


def _fake_settings(images_dir: str):
    """Create a fake settings object for testing."""

    class FakeSettings:
        images_dir = ""
        max_image_size_mb = 5
        max_image_width = 1920
        jpeg_quality = 85

    s = FakeSettings()
    s.images_dir = images_dir
    return s


def _create_test_image(
    width: int = 100,
    height: int = 100,
    fmt: str = "JPEG",
) -> bytes:
    """Create a test image in memory."""
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def _create_test_png(width: int = 100, height: int = 100) -> bytes:
    """Create a test PNG image (RGBA) in memory."""
    img = Image.new("RGBA", (width, height), color=(255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_test_gif(width: int = 100, height: int = 100) -> bytes:
    """Create a test GIF image in memory."""
    img = Image.new("P", (width, height))
    buf = io.BytesIO()
    img.save(buf, format="GIF")
    return buf.getvalue()


class TestUploadImage:
    """POST /api/v1/images"""

    def test_upload_jpeg_success(self, client):
        """Upload a valid JPEG image returns 201 with url, filename, dimensions."""
        image_data = _create_test_image(200, 150)

        response = client.post(
            "/api/v1/images",
            files={"file": ("test.jpg", image_data, "image/jpeg")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["url"].startswith("/api/v1/images/")
        assert data["filename"].endswith(".jpg")
        assert data["width"] == 200
        assert data["height"] == 150

    def test_upload_png_success(self, client):
        """Upload a PNG image — gets converted to JPEG."""
        image_data = _create_test_png(300, 200)

        response = client.post(
            "/api/v1/images",
            files={"file": ("photo.png", image_data, "image/png")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["filename"].endswith(".jpg")
        assert data["width"] == 300
        assert data["height"] == 200

    def test_upload_gif_success(self, client):
        """Upload a GIF image — gets converted to JPEG."""
        image_data = _create_test_gif(50, 50)

        response = client.post(
            "/api/v1/images",
            files={"file": ("anim.gif", image_data, "image/gif")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["filename"].endswith(".jpg")

    def test_upload_webp_success(self, client):
        """Upload a WebP image."""
        img = Image.new("RGB", (80, 60), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="WEBP")
        image_data = buf.getvalue()

        response = client.post(
            "/api/v1/images",
            files={"file": ("pic.webp", image_data, "image/webp")},
        )
        assert response.status_code == 201

    def test_upload_resizes_large_image(self, client):
        """Image wider than 1920px gets resized (aspect ratio maintained)."""
        image_data = _create_test_image(3840, 2160)

        response = client.post(
            "/api/v1/images",
            files={"file": ("big.jpg", image_data, "image/jpeg")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["width"] == 1920
        assert data["height"] == 1080  # 2160 * (1920/3840)

    def test_upload_no_resize_when_within_limit(self, client):
        """Image within 1920px width is not resized."""
        image_data = _create_test_image(800, 600)

        response = client.post(
            "/api/v1/images",
            files={"file": ("small.jpg", image_data, "image/jpeg")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["width"] == 800
        assert data["height"] == 600

    def test_upload_invalid_extension(self, client):
        """Upload a file with invalid extension returns 400."""
        response = client.post(
            "/api/v1/images",
            files={"file": ("virus.exe", b"notanimage", "application/octet-stream")},
        )
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]

    def test_upload_bmp_rejected(self, client):
        """BMP files are not in allowed extensions."""
        img = Image.new("RGB", (10, 10))
        buf = io.BytesIO()
        img.save(buf, format="BMP")

        response = client.post(
            "/api/v1/images",
            files={"file": ("pic.bmp", buf.getvalue(), "image/bmp")},
        )
        assert response.status_code == 400

    def test_upload_file_too_large(self, client):
        """File exceeding 5MB is rejected with 400."""
        # Create data slightly over 5MB
        large_data = b"\x00" * (5 * 1024 * 1024 + 1)

        # We need a valid extension but the size check comes before image parsing
        response = client.post(
            "/api/v1/images",
            files={"file": ("big.jpg", large_data, "image/jpeg")},
        )
        assert response.status_code == 400
        assert "exceeds maximum" in response.json()["detail"]

    def test_upload_unique_filenames(self, client):
        """Each upload generates a unique filename."""
        image_data = _create_test_image()
        filenames = set()

        for _ in range(3):
            response = client.post(
                "/api/v1/images",
                files={"file": ("same.jpg", image_data, "image/jpeg")},
            )
            assert response.status_code == 201
            filenames.add(response.json()["filename"])

        assert len(filenames) == 3

    def test_upload_file_saved_to_disk(self, client, temp_images_dir):
        """Uploaded file is actually saved to the images directory."""
        image_data = _create_test_image()

        response = client.post(
            "/api/v1/images",
            files={"file": ("test.jpg", image_data, "image/jpeg")},
        )
        assert response.status_code == 201
        filename = response.json()["filename"]

        saved_path = os.path.join(temp_images_dir, filename)
        assert os.path.exists(saved_path)

        # Verify saved file is valid JPEG
        saved_img = Image.open(saved_path)
        assert saved_img.format == "JPEG"

    def test_upload_jpeg_extension_alias(self, client):
        """Files with .jpeg extension are accepted (normalized to .jpg)."""
        image_data = _create_test_image()

        response = client.post(
            "/api/v1/images",
            files={"file": ("photo.jpeg", image_data, "image/jpeg")},
        )
        assert response.status_code == 201
        assert response.json()["filename"].endswith(".jpg")


class TestImageService:
    """Unit tests for image_service functions."""

    def test_validate_extension_allowed(self):
        """All allowed extensions pass validation."""
        from app.services.image_service import validate_extension

        assert validate_extension("test.jpg") == ".jpg"
        assert validate_extension("test.jpeg") == ".jpg"
        assert validate_extension("test.png") == ".png"
        assert validate_extension("test.gif") == ".gif"
        assert validate_extension("test.webp") == ".webp"

    def test_validate_extension_case_insensitive(self):
        """Extension check is case-insensitive."""
        from app.services.image_service import validate_extension

        assert validate_extension("test.JPG") == ".jpg"
        assert validate_extension("test.PNG") == ".png"

    def test_validate_extension_rejected(self):
        """Invalid extensions raise ValueError."""
        from app.services.image_service import validate_extension

        with pytest.raises(ValueError, match="not allowed"):
            validate_extension("test.bmp")
        with pytest.raises(ValueError, match="not allowed"):
            validate_extension("test.svg")
        with pytest.raises(ValueError, match="not allowed"):
            validate_extension("test.exe")

    def test_validate_file_size_ok(self):
        """Data within limit passes."""
        from app.services.image_service import validate_file_size

        validate_file_size(b"\x00" * 100)  # Should not raise

    def test_validate_file_size_too_large(self):
        """Data exceeding limit raises ValueError."""
        from app.services.image_service import validate_file_size

        with pytest.raises(ValueError, match="exceeds maximum"):
            validate_file_size(b"\x00" * (5 * 1024 * 1024 + 1))

    def test_resize_image_no_resize_needed(self):
        """Image within max_width is not resized."""
        from app.services.image_service import resize_image

        img_data = _create_test_image(800, 600)
        result, w, h = resize_image(img_data, max_width=1920, quality=85)
        assert w == 800
        assert h == 600

    def test_resize_image_large(self):
        """Image wider than max_width is resized with aspect ratio."""
        from app.services.image_service import resize_image

        img_data = _create_test_image(3840, 2160)
        result, w, h = resize_image(img_data, max_width=1920, quality=85)
        assert w == 1920
        assert h == 1080

    def test_resize_image_rgba_to_rgb(self):
        """RGBA image is converted to RGB for JPEG output."""
        from app.services.image_service import resize_image

        img_data = _create_test_png(100, 100)
        result, w, h = resize_image(img_data, max_width=1920, quality=85)
        # Verify result is valid JPEG
        out_img = Image.open(io.BytesIO(result))
        assert out_img.mode == "RGB"

    def test_generate_filename_unique(self):
        """Each call produces a unique filename."""
        from app.services.image_service import generate_filename

        names = {generate_filename() for _ in range(10)}
        assert len(names) == 10
        for name in names:
            assert name.endswith(".jpg")
