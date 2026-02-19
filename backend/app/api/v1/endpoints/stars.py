"""Stars endpoints: スター追加・削除・一覧取得。

docs/api.md の SNS セクション準拠:
- GET  /plots/{plot_id}/stars  → スター一覧取得
- POST /plots/{plot_id}/stars  → スター追加（要認証, 409 if already starred）
- DELETE /plots/{plot_id}/stars → スター削除（要認証, 404 if not starred）
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.api.v1.deps import AuthUser, DbSession
from app.models import Plot, Star, User

router = APIRouter()


# ─── ヘルパー ──────────────────────────────────────────────────
def _get_plot_or_404(db: DbSession, plot_id: UUID) -> Plot:
    """Plot を取得し、存在しなければ 404 を返す。"""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found",
        )
    return plot


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
    _get_plot_or_404(db, plot_id)

    stars = db.query(Star).filter(Star.plot_id == plot_id).all()

    items = []
    for star in stars:
        user = db.query(User).filter(User.id == star.user_id).first()
        if user:
            items.append(_serialize_star(star, user))

    return {"items": items, "total": len(items)}


# ─── POST /plots/{plot_id}/stars ──────────────────────────────
@router.post(
    "/plots/{plot_id}/stars",
    status_code=status.HTTP_201_CREATED,
)
def add_star(plot_id: UUID, db: DbSession, current_user: AuthUser):
    """スター追加。既にスター済みなら 409 Conflict。"""
    _get_plot_or_404(db, plot_id)

    existing = (
        db.query(Star)
        .filter(Star.plot_id == plot_id, Star.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already starred",
        )

    try:
        star = Star(plot_id=plot_id, user_id=current_user.id)
        db.add(star)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already starred",
        )

    return None


# ─── DELETE /plots/{plot_id}/stars ────────────────────────────
@router.delete(
    "/plots/{plot_id}/stars",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_star(plot_id: UUID, db: DbSession, current_user: AuthUser):
    """スター削除。スターしていなければ 404。"""
    _get_plot_or_404(db, plot_id)

    star = (
        db.query(Star)
        .filter(Star.plot_id == plot_id, Star.user_id == current_user.id)
        .first()
    )
    if not star:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not starred",
        )

    db.delete(star)
    db.commit()
