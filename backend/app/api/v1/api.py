from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    history,
    images,
    plots,
    search,
    sections,
    social,
    stars,
)

# ルーター登録順序
# プレフィックスあり: ルーター内で相対パスを定義（/plots/{id}）
# プレフィックスなし: ルーター内で絶対パスを定義（/sections/{id}）
# NOTE: historyは/sections/...と/plots/...の両方を含むためプレフィックスなし
api_router = APIRouter()

# プレフィックスあり
api_router.include_router(plots.router, prefix="/plots", tags=["plots"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# プレフィックスなし（各ルーター内で完全パスを定義）
api_router.include_router(sections.router, tags=["sections"])
api_router.include_router(history.router, tags=["history"])
api_router.include_router(stars.router, tags=["stars"])
api_router.include_router(social.router, tags=["social"])
api_router.include_router(admin.router, tags=["admin"])
