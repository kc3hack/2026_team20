"""Image upload and serving endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.schemas import ImageUploadResponse
from app.services.image_service import process_and_save

router = APIRouter()


@router.post("", response_model=ImageUploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    """Upload an image.

    - Validates file extension (.jpg, .png, .gif, .webp)
    - Validates file size (max 5MB)
    - Resizes to max 1920px width (aspect ratio maintained)
    - Converts to JPEG (quality 85)
    - Saves with UUID filename
    """
    file_data = await file.read()

    try:
        filename, width, height = process_and_save(
            file_data=file_data,
            original_filename=file.filename or "unknown.jpg",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ImageUploadResponse(
        url=f"/api/v1/images/{filename}",
        filename=filename,
        width=width,
        height=height,
    )
