"""Stars endpoints: スター追加・削除・一覧取得。

docs/api.md の SNS セクション準拠:
- GET  /plots/{plot_id}/stars  → スター一覧取得
- POST /plots/{plot_id}/stars  → スター追加（要認証, 409 if already starred）
- DELETE /plots/{plot_id}/stars → スター削除（要認証, 404 if not starred）
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.v1.deps import AuthUser, DbSession
from app.models import Star, User
from app.services import star_service

router = APIRouter()


# ─── ヘルパー ──────────────────────────────────────────────────
def _serialize_star(star: Star, user: User) -> dict:
    """Star + User 情報を api.md の StarListResponse.items 形式に変換。"""
    return {
        "user": {
            "id": str(user.id),
            "displayName": user.display_name,
            "avatarUrl": user.avatar_url,
        },
        "createdAt": star.created_at.isoformat() if star.created_at else None,
    }


# ─── GET /plots/{plot_id}/stars ───────────────────────────────
@router.get("/plots/{plot_id}/stars")
def list_stars(plot_id: UUID, db: DbSession):
    """スター一覧取得。"""
    try:
        star_user_pairs = star_service.list_stars(db, plot_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    items = [_serialize_star(star, user) for star, user in star_user_pairs]
    return {"items": items, "total": len(items)}


# ─── POST /plots/{plot_id}/stars ──────────────────────────────
@router.post(
    "/plots/{plot_id}/stars",
    status_code=status.HTTP_201_CREATED,
)
def add_star(plot_id: UUID, db: DbSession, current_user: AuthUser):
    """スター追加。既にスター済みなら 409 Conflict。"""
    try:
        star_service.add_star(db, plot_id, current_user.id)
    except ValueError as e:
        # "Already starred" → 409, "Plot not found" → 404
        if "Already starred" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return None


# ─── DELETE /plots/{plot_id}/stars ────────────────────────────
@router.delete(
    "/plots/{plot_id}/stars",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_star(plot_id: UUID, db: DbSession, current_user: AuthUser):
    """スター削除。スターしていなければ 404。"""
    try:
        star_service.remove_star(db, plot_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
