"""Plots endpoints: CRUD および一覧取得。

docs/api.md の Plots セクション準拠:
- GET    /plots           → Plot 一覧取得（tag フィルタ, limit, offset）
- POST   /plots           → Plot 作成（要認証）
- GET    /plots/{plot_id}  → Plot 詳細取得
- PUT    /plots/{plot_id}  → Plot 更新（要認証・作成者のみ）
- DELETE /plots/{plot_id}  → Plot 削除（要認証・作成者のみ）
- GET    /plots/trending   → 急上昇 Plot 一覧
- GET    /plots/popular    → 人気 Plot 一覧
- GET    /plots/new        → 新規 Plot 一覧
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.api.v1.deps import AuthUser, DbSession, OptionalUser
from app.api.v1.utils import plot_to_response
from app.models import Plot, Section, User
from app.services import plot_service

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────
class CreatePlotRequest(BaseModel):
    title: str
    description: str | None = None
    tags: list[str] | None = None
    thumbnailUrl: str | None = None  # noqa: N815


class UpdatePlotRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    thumbnailUrl: str | None = ...  # noqa: N815 – sentinel: 未指定と明示的 null を区別


# ─── シリアライズヘルパー ──────────────────────────────────────
def _serialize_section(section: Section) -> dict:
    """Section を SectionResponse 形式に変換。api.md L586-598 準拠。"""
    return {
        "id": str(section.id),
        "plotId": str(section.plot_id),
        "title": section.title,
        "content": section.content,
        "orderIndex": section.order_index,
        "version": section.version,
        "createdAt": section.created_at.isoformat() if section.created_at else None,
        "updatedAt": section.updated_at.isoformat() if section.updated_at else None,
    }


def _serialize_user_brief(user: User | None) -> dict | None:
    """User を簡易形式に変換。"""
    if user is None:
        return None
    return {
        "id": str(user.id),
        "displayName": user.display_name,
        "avatarUrl": user.avatar_url,
    }


def _to_plot_dict(
    plot: Plot,
    star_count: int = 0,
    is_starred: bool = False,
) -> dict:
    """共通の plot_to_response() を使って PlotResponse dict を返す。"""
    return plot_to_response(plot, star_count=star_count, is_starred=is_starred).model_dump()


def _to_plot_detail_dict(
    plot: Plot,
    star_count: int = 0,
    is_starred: bool = False,
) -> dict:
    """Plot を PlotDetailResponse 形式に変換。api.md L563-574 準拠。

    PlotResponse の全フィールド + sections, owner を含む。
    """
    result = _to_plot_dict(plot, star_count, is_starred)
    result["sections"] = [
        _serialize_section(s)
        for s in sorted(plot.sections or [], key=lambda s: s.order_index)
    ]
    result["owner"] = _serialize_user_brief(plot.owner)
    return result


def _enrich_plot(
    db: DbSession,
    plot: Plot,
    current_user_id: str | None,
) -> dict:
    """Plot にスター数と isStarred を付与して PlotResponse に変換する。"""
    star_count = plot_service.get_star_count(db, plot.id)
    is_starred = plot_service.is_starred_by(db, plot.id, current_user_id)
    return _to_plot_dict(plot, star_count, is_starred)


def _enrich_plots_as_list(
    db: DbSession,
    plots: list[Plot],
    current_user_id: str | None,
    total: int,
    limit: int,
    offset: int,
) -> dict:
    """Plot リストを PlotListResponse 形式に変換する。"""
    items = [_enrich_plot(db, p, current_user_id) for p in plots]
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ─── GET /plots/trending ─────────────────────────────────────
# NOTE: trending/popular/new は /plots/{plot_id} より前に定義する。
#       FastAPI は登録順でマッチするため、{plot_id} が先だと
#       "trending" を UUID として解釈しようとして 422 エラーになる。
@router.get("/trending")
def list_trending(
    db: DbSession,
    current_user: OptionalUser,
    limit: int = Query(default=5, le=100, ge=1),
):
    """急上昇 Plot 一覧（直近72時間のスター増加数でソート）。"""
    plots = plot_service.list_trending(db, limit)
    user_id = current_user.id if current_user else None
    items = [_enrich_plot(db, p, user_id) for p in plots]
    return {
        "items": items,
        "total": len(items),
        "limit": limit,
        "offset": 0,
    }


# ─── GET /plots/popular ──────────────────────────────────────
@router.get("/popular")
def list_popular(
    db: DbSession,
    current_user: OptionalUser,
    limit: int = Query(default=5, le=100, ge=1),
):
    """人気 Plot 一覧（全期間のスター総数でソート）。"""
    plots = plot_service.list_popular(db, limit)
    user_id = current_user.id if current_user else None
    items = [_enrich_plot(db, p, user_id) for p in plots]
    return {
        "items": items,
        "total": len(items),
        "limit": limit,
        "offset": 0,
    }


# ─── GET /plots/new ──────────────────────────────────────────
@router.get("/new")
def list_new(
    db: DbSession,
    current_user: OptionalUser,
    limit: int = Query(default=5, le=100, ge=1),
):
    """新規 Plot 一覧（作成日時の降順）。"""
    plots = plot_service.list_new(db, limit)
    user_id = current_user.id if current_user else None
    items = [_enrich_plot(db, p, user_id) for p in plots]
    return {
        "items": items,
        "total": len(items),
        "limit": limit,
        "offset": 0,
    }


# ─── GET /plots ──────────────────────────────────────────────
@router.get("/")
def list_plots(
    db: DbSession,
    current_user: OptionalUser,
    tag: str | None = Query(default=None, description="タグでフィルタ"),
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """Plot 一覧取得。"""
    plots, total = plot_service.list_plots(db, tag, limit, offset)
    user_id = current_user.id if current_user else None
    return _enrich_plots_as_list(db, plots, user_id, total, limit, offset)


# ─── POST /plots ─────────────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_plot(body: CreatePlotRequest, db: DbSession, current_user: AuthUser):
    """Plot 作成（要認証）。"""
    plot = plot_service.create_plot(
        db,
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        tags=body.tags,
        thumbnail_url=body.thumbnailUrl,
    )
    star_count = plot_service.get_star_count(db, plot.id)
    return _to_plot_dict(plot, star_count, is_starred=False)


# ─── GET /plots/{plot_id} ────────────────────────────────────
@router.get("/{plot_id}")
def get_plot(plot_id: UUID, db: DbSession, current_user: OptionalUser):
    """Plot 詳細取得。"""
    try:
        plot = plot_service.get_plot_detail(db, plot_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    user_id = current_user.id if current_user else None
    star_count = plot_service.get_star_count(db, plot.id)
    is_starred = plot_service.is_starred_by(db, plot.id, user_id)
    return _to_plot_detail_dict(plot, star_count, is_starred)


# ─── PUT /plots/{plot_id} ────────────────────────────────────
@router.put("/{plot_id}")
def update_plot(
    plot_id: UUID,
    body: UpdatePlotRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """Plot 更新（要認証・作成者のみ）。"""
    try:
        plot = plot_service.update_plot(
            db,
            plot_id=plot_id,
            user_id=current_user.id,
            title=body.title,
            description=body.description,
            tags=body.tags,
            thumbnail_url=body.thumbnailUrl,
        )
    except ValueError as e:
        if "Forbidden" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    star_count = plot_service.get_star_count(db, plot.id)
    is_starred = plot_service.is_starred_by(db, plot.id, current_user.id)
    return _to_plot_dict(plot, star_count, is_starred)


# ─── DELETE /plots/{plot_id} ─────────────────────────────────
@router.delete("/{plot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plot(plot_id: UUID, db: DbSession, current_user: AuthUser):
    """Plot 削除（要認証・作成者のみ）。"""
    try:
        plot_service.delete_plot(db, plot_id, current_user.id)
    except ValueError as e:
        if "Forbidden" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
