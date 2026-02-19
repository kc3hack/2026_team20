"""Auth endpoints – ユーザー認証・プロフィール・Plot/Contribution一覧。

エンドポイント:
- GET /auth/me: 現在のユーザー情報取得
- GET /auth/users/{username}: ユーザープロフィール取得
- GET /auth/users/{username}/plots: ユーザーのPlot一覧
- GET /auth/users/{username}/contributions: ユーザーのContribution一覧

実装ノート:
- 本モジュールのエンドポイントは同期関数（def）で実装されている。
- FastAPIは同期エンドポイントをスレッドプールで実行するため、
  現在の規模ではパフォーマンス上の問題はない。
- 将来的に非同期化（async def）が必要になった場合は、
  SQLAlchemyの非同期セッション（AsyncSession）への移行が必要。
"""

import logging

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import _get_user_by_username_or_404, plot_to_response
from app.models import HotOperation, Plot, Section, User
from app.schemas import PlotListResponse, UserProfileResponse, UserResponse

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


def _user_to_profile(
    user: User, plot_count: int, contribution_count: int
) -> UserProfileResponse:
    """User ORM → UserProfileResponse に変換。"""
    return UserProfileResponse(
        id=str(user.id),
        displayName=user.display_name,
        avatarUrl=user.avatar_url,
        plotCount=plot_count,
        contributionCount=contribution_count,
        createdAt=user.created_at,
    )


# ─── GET /auth/me ────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: AuthUser,
    db: DbSession,
) -> UserResponse:
    """現在のユーザー情報を取得する（要認証）。"""
    # CurrentUser.id は UUID 型のため、parse_uuid は不要
    user = db.execute(
        select(User).where(User.id == current_user.id)
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
    user = _get_user_by_username_or_404(db, username)

    # オーナーとして作成した Plot 数
    plot_count: int = db.execute(
        select(func.count()).select_from(Plot).where(Plot.owner_id == user.id)
    ).scalar_one()

    # コントリビューション数（セクションを編集した他人の Plot 数）
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
    user = _get_user_by_username_or_404(db, username)

    total: int = db.execute(
        select(func.count()).select_from(Plot).where(Plot.owner_id == user.id)
    ).scalar_one()

    # selectinload で stars を事前ロードし、N+1 問題を回避
    # 自分が作成した Plot は作成順（created_at）で表示する。
    # オーナー自身が「いつ作ったか」を時系列で把握できるようにするため。
    plots = (
        db.execute(
            select(Plot)
            .options(selectinload(Plot.stars))
            .where(Plot.owner_id == user.id)
            .order_by(Plot.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )

    return PlotListResponse(
        items=[plot_to_response(p) for p in plots],
        total=total,
        limit=limit,
        offset=offset,
    )


# ─── GET /auth/users/{username}/contributions ────
@router.get("/users/{username}/contributions", response_model=PlotListResponse)
def get_user_contributions(
    username: str,
    db: DbSession,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> PlotListResponse:
    """ユーザーがコントリビューションした Plot 一覧を取得する。"""
    user = _get_user_by_username_or_404(db, username)

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

    # selectinload で stars を事前ロードし、N+1 問題を回避
    # コントリビューションした Plot は最終更新順（updated_at）で表示する。
    # 直近アクティブな Plot を上位に表示し、協業の進捗を追いやすくするため。
    plots = (
        db.execute(
            select(Plot)
            .options(selectinload(Plot.stars))
            .where(Plot.id.in_(select(contributed_plot_ids_subq)))
            .order_by(Plot.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )

    return PlotListResponse(
        items=[plot_to_response(p) for p in plots],
        total=total,
        limit=limit,
        offset=offset,
    )
