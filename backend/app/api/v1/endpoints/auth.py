"""Auth endpoints – ユーザー情報取得。"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.v1.deps import AuthUser, DbSession
from app.models import Plot, Star, User
from app.schemas import PlotListResponse, PlotResponse, UserProfileResponse, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    """User ORM → UserResponse に変換。"""
    return UserResponse(
        id=str(user.id),
        email=user.email,
        displayName=user.display_name,
        avatarUrl=user.avatar_url,
        createdAt=user.created_at,
    )


def _user_to_profile(user: User, plot_count: int, contribution_count: int) -> UserProfileResponse:
    """User ORM → UserProfileResponse に変換。"""
    return UserProfileResponse(
        id=str(user.id),
        displayName=user.display_name,
        avatarUrl=user.avatar_url,
        plotCount=plot_count,
        contributionCount=contribution_count,
        createdAt=user.created_at,
    )


def _plot_to_response(plot: Plot, *, is_starred: bool = False) -> PlotResponse:
    """Plot ORM → PlotResponse に変換。"""
    return PlotResponse(
        id=str(plot.id),
        title=plot.title,
        description=plot.description,
        tags=plot.tags or [],
        ownerId=str(plot.owner_id),
        starCount=len(plot.stars),
        isStarred=is_starred,
        isPaused=plot.is_paused,
        editingUsers=[],
        createdAt=plot.created_at,
        updatedAt=plot.updated_at,
    )


# ─── GET /auth/me ────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: AuthUser,
    db: DbSession,
) -> UserResponse:
    """現在のユーザー情報を取得する（要認証）。"""
    user = db.execute(
        select(User).where(User.id == uuid.UUID(current_user.id))
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return _user_to_response(user)


# ─── GET /auth/users/{username} ──────────────────
@router.get("/users/{username}", response_model=UserProfileResponse)
def get_user_profile(
    username: str,
    db: DbSession,
) -> UserProfileResponse:
    """ユーザーの公開プロフィールを取得する。"""
    user = db.execute(
        select(User).where(User.display_name == username)
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found",
        )

    # オーナーとして作成した Plot 数
    plot_count: int = db.execute(
        select(func.count()).select_from(Plot).where(Plot.owner_id == user.id)
    ).scalar_one()

    # コントリビューション数（セクションを編集した他人の Plot 数）
    from app.models import HotOperation, Section

    contribution_count: int = db.execute(
        select(func.count(func.distinct(Plot.id)))
        .select_from(HotOperation)
        .join(Section, HotOperation.section_id == Section.id)
        .join(Plot, Section.plot_id == Plot.id)
        .where(HotOperation.user_id == user.id)
        .where(Plot.owner_id != user.id)
    ).scalar_one()

    return _user_to_profile(user, plot_count, contribution_count)


# ─── GET /auth/users/{username}/plots ────────────
@router.get("/users/{username}/plots", response_model=PlotListResponse)
def get_user_plots(
    username: str,
    db: DbSession,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PlotListResponse:
    """ユーザーが作成した Plot 一覧を取得する。"""
    user = db.execute(
        select(User).where(User.display_name == username)
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found",
        )

    total: int = db.execute(
        select(func.count()).select_from(Plot).where(Plot.owner_id == user.id)
    ).scalar_one()

    plots = db.execute(
        select(Plot)
        .where(Plot.owner_id == user.id)
        .order_by(Plot.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    return PlotListResponse(
        items=[_plot_to_response(p) for p in plots],
        total=total,
        limit=limit,
        offset=offset,
    )


# ─── GET /auth/users/{username}/contributions ────
@router.get(
    "/users/{username}/contributions", response_model=PlotListResponse
)
def get_user_contributions(
    username: str,
    db: DbSession,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PlotListResponse:
    """ユーザーがコントリビューションした Plot 一覧を取得する。"""
    from app.models import HotOperation, Section

    user = db.execute(
        select(User).where(User.display_name == username)
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found",
        )

    # コントリビューションした Plot の ID を取得（自分がオーナーでないもの）
    contributed_plot_ids_subq = (
        select(func.distinct(Plot.id))
        .select_from(HotOperation)
        .join(Section, HotOperation.section_id == Section.id)
        .join(Plot, Section.plot_id == Plot.id)
        .where(HotOperation.user_id == user.id)
        .where(Plot.owner_id != user.id)
        .subquery()
    )

    total: int = db.execute(
        select(func.count()).select_from(contributed_plot_ids_subq)
    ).scalar_one()

    plots = db.execute(
        select(Plot)
        .where(Plot.id.in_(select(contributed_plot_ids_subq)))
        .order_by(Plot.updated_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    return PlotListResponse(
        items=[_plot_to_response(p) for p in plots],
        total=total,
        limit=limit,
        offset=offset,
    )
