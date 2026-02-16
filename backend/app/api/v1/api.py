from fastapi import APIRouter

from app.api.v1.endpoints import admin, history, images, plots, sections, sns

api_router = APIRouter()

api_router.include_router(plots.router, prefix="/plots", tags=["plots"])
api_router.include_router(sections.router, tags=["sections"])
api_router.include_router(history.router, tags=["history"])

# Endpoints will be registered here as they are implemented
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(sns.router, tags=["sns"])
