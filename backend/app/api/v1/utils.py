"""API 共通ユーティリティ関数。

公開関数:
- parse_uuid: 文字列 → UUID 変換（失敗時 400）
- plot_to_response: Plot ORM → PlotResponse 変換
- _require_admin: 管理者権限チェック（403）

内部関数:
- _get_plot_or_404: Plot 取得（未存在時 404）
- _get_user_or_404: User 取得（未存在時 404）
- _get_user_by_username_or_404: display_name で User 取得（未存在時 404）
"""

import uuid
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.schemas import CurrentUser, PlotResponse, SectionResponse

ADMIN_ROLE = "admin"


def _require_admin(user: CurrentUser) -> None:
    """管理者権限を検証する。admin でなければ 403 を返す。"""
    if user.role != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )


if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models import Plot, User


def parse_uuid(value: str, field_name: str = "ID") -> uuid.UUID:
    """文字列を UUID に変換する。不正な値の場合は 400 Bad Request を返す。"""
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID format for {field_name}",
        ) from exc


def _get_plot_or_404(db: "Session", plot_id: str) -> "Plot":
    """Plot を取得する。存在しなければ HTTPException(404) を送出する。"""
    from app.models import Plot  # 循環インポート回避

    parsed_id = parse_uuid(plot_id, "plot_id")
    plot = db.execute(select(Plot).where(Plot.id == parsed_id)).scalar_one_or_none()
    if plot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found",
        )
    return plot


def _get_user_or_404(db: "Session", user_id: str) -> "User":
    """User を取得する。存在しなければ HTTPException(404) を送出する。"""
    from app.models import User  # 循環インポート回避

    parsed_id = parse_uuid(user_id, "user_id")
    user = db.execute(select(User).where(User.id == parsed_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def _get_user_by_username_or_404(db: "Session", username: str) -> "User":
    """display_name で User を取得する。存在しなければ HTTPException(404) を送出する。"""
    from app.models import User  # 循環インポート回避

    user = db.execute(
        select(User).where(User.display_name == username)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def plot_to_response(
    plot: "Plot",
    *,
    star_count: int | None = None,
    is_starred: bool = False,
) -> PlotResponse:
    """Plot ORM → PlotResponse に変換する共通ヘルパー。

    star_count を明示的に渡すと、その値を使用する。
    省略時は plot.stars リレーション（selectinload 済み前提）の長さを使用する。

    Note:
        star_count を省略する場合、呼び出し元で
        ``selectinload(Plot.stars)`` を適用済みであること。
    """
    if star_count is None:
        # eager load されていない場合は遅延ロードで N+1 が発生するため、
        # 明示的にエラーにして呼び出し元の修正を促す。
        if "stars" not in plot.__dict__:
            raise RuntimeError(
                "plot.stars must be eagerly loaded with selectinload(). "
                "Add .options(selectinload(Plot.stars)) to the query."
            )
        star_count = len(plot.stars)

    return PlotResponse(
        id=str(plot.id),
        title=plot.title,
        description=plot.description,
        tags=plot.tags or [],
        ownerId=str(plot.owner_id),
        starCount=star_count,
        isStarred=is_starred,
        isPaused=plot.is_paused,
        thumbnailUrl=plot.thumbnail_url,
        version=plot.version or 0,
        createdAt=plot.created_at,
        updatedAt=plot.updated_at,
    )


def section_to_response(section: "Section") -> SectionResponse:
    """Section ORM → SectionResponse に変換する共通ヘルパー。

    plots.py (PlotDetail), sections.py (CRUD), history.py (rollback)
    の3箇所で統一的に使用する。
    """
    from app.models import Section  # noqa: F811 – 循環インポート回避

    return SectionResponse(
        id=str(section.id),
        plotId=str(section.plot_id),
        title=section.title,
        content=section.content,
        orderIndex=section.order_index,
        version=section.version,
        createdAt=section.created_at,
        updatedAt=section.updated_at,
    )
