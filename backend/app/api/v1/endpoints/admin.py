"""Admin endpoints – BAN 管理・Plot 一時停止。"""

import logging

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import _get_plot_or_404, _get_user_or_404
from app.models import Plot, PlotBan, User
from app.schemas import BanRequest, MessageResponse, PauseRequest, UnbanRequest

logger = logging.getLogger(__name__)

router = APIRouter()

ADMIN_ROLE = "admin"


def _require_admin(user: AuthUser) -> None:
    """管理者権限を検証する。admin でなければ 403 を返す。"""
    if user.role != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )


# ─── POST /admin/bans ────────────────────────────
@router.post(
    "/admin/bans",
    status_code=status.HTTP_201_CREATED,
    response_model=MessageResponse,
)
def ban_user(
    body: BanRequest,
    current_user: AuthUser,
    db: DbSession,
) -> MessageResponse:
    """ユーザーを BAN する（要管理者権限）。"""
    _require_admin(current_user)

    # 対象 Plot と User の存在確認（内部でパース済み）
    plot = _get_plot_or_404(db, body.plotId)
    user = _get_user_or_404(db, body.userId)

    # 既に BAN されている場合は 409
    existing = db.execute(
        select(PlotBan).where(
            PlotBan.plot_id == plot.id,
            PlotBan.user_id == user.id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already banned from this plot",
        )

    ban = PlotBan(
        plot_id=plot.id,
        user_id=user.id,
        reason=body.reason,
    )
    db.add(ban)
    db.commit()

    logger.info(
        "Admin %s banned user %s from plot %s (reason=%s)",
        current_user.id,
        body.userId,
        body.plotId,
        body.reason,
    )
    return MessageResponse(detail="User banned")


# ─── DELETE /admin/bans ──────────────────────────
@router.delete("/admin/bans", status_code=status.HTTP_204_NO_CONTENT)
def unban_user(
    body: UnbanRequest,
    current_user: AuthUser,
    db: DbSession,
) -> Response:
    """BAN を解除する（要管理者権限）。"""
    _require_admin(current_user)

    # 対象 Plot と User の存在確認（内部でパース済み）
    plot = _get_plot_or_404(db, body.plotId)
    user = _get_user_or_404(db, body.userId)

    ban = db.execute(
        select(PlotBan).where(
            PlotBan.plot_id == plot.id,
            PlotBan.user_id == user.id,
        )
    ).scalar_one_or_none()

    if ban is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ban record not found",
        )

    db.delete(ban)
    db.commit()

    logger.info(
        "Admin %s unbanned user %s from plot %s",
        current_user.id,
        body.userId,
        body.plotId,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── POST /plots/{plot_id}/pause ─────────────────
@router.post("/plots/{plot_id}/pause", response_model=MessageResponse)
def pause_plot(
    plot_id: str,
    body: PauseRequest,
    current_user: AuthUser,
    db: DbSession,
) -> MessageResponse:
    """Plot の編集を一時停止する（要管理者権限）。"""
    _require_admin(current_user)

    plot = _get_plot_or_404(db, plot_id)

    if plot.is_paused:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plot is already paused",
        )

    plot.is_paused = True
    plot.pause_reason = body.reason
    db.commit()

    logger.info(
        "Admin %s paused plot %s (reason=%s)",
        current_user.id,
        plot_id,
        body.reason,
    )
    return MessageResponse(detail="Plot paused")


# ─── DELETE /plots/{plot_id}/pause ────────────────
@router.delete("/plots/{plot_id}/pause", response_model=MessageResponse)
def resume_plot(
    plot_id: str,
    current_user: AuthUser,
    db: DbSession,
) -> MessageResponse:
    """Plot の編集を再開する（要管理者権限）。"""
    _require_admin(current_user)

    plot = _get_plot_or_404(db, plot_id)

    if not plot.is_paused:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plot is not paused",
        )

    plot.is_paused = False
    plot.pause_reason = None
    db.commit()

    logger.info(
        "Admin %s resumed plot %s",
        current_user.id,
        plot_id,
    )
    return MessageResponse(detail="Plot resumed")
