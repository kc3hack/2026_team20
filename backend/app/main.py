from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router

app = FastAPI(
    title="Plot Platform API",
    description="「本当に欲しい」をカタチにするコミュニティ企画プラットフォーム",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Mount static files for image serving (GET /api/v1/images/{filename})
# This must come AFTER include_router so POST /api/v1/images is handled by the router
_images_dir = Path("images")
_images_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/v1/images", StaticFiles(directory=str(_images_dir)), name="images")


@app.get("/health")
async def health():
    return {"status": "ok"}
