from fastapi import APIRouter

# from app.api.v1.endpoints import (
#     admin,
#     auth,
#     history,
#     images,
#     plots,
#     search,
#     sections,
#     social,
#     stars,
# )

# 追加し次第コメントアウトを解除
api_router = APIRouter()
# api_router.include_router(plots.router, prefix="/plots", tags=["plots"])
# api_router.include_router(sections.router, tags=["sections"])
# api_router.include_router(history.router, prefix="/sections", tags=["history"])
# api_router.include_router(images.router, prefix="/images", tags=["images"])
# api_router.include_router(stars.router, tags=["stars"])
# api_router.include_router(social.router, tags=["social"])
# api_router.include_router(search.router, prefix="/search", tags=["search"])
# api_router.include_router(admin.router, tags=["admin"])
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
