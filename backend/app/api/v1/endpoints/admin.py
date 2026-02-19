"""Admin endpoints – BAN 管理・Plot 一時停止。"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.v1.deps import AuthUser, DbSession
from app.models import Plot, PlotBan
from app.schemas import BanRequest, PauseRequest, UnbanRequest

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


def _get_plot_or_404(db: DbSession, plot_id: str) -> Plot:
    """Plot を取得する。存在しなければ 404 を返す。"""
    plot = db.execute(
        select(Plot).where(Plot.id == uuid.UUID(plot_id))
    ).scalar_one_or_none()
    if plot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found",
        )
    return plot


# ─── POST /admin/bans ────────────────────────────
@router.post("/admin/bans", status_code=status.HTTP_201_CREATED)
def ban_user(
    body: BanRequest,
    current_user: AuthUser,
    db: DbSession,
) -> dict[str, str]:
    """ユーザーを BAN する（要管理者権限）。"""
    _require_admin(current_user)

    # 対象 Plot の存在確認
    _get_plot_or_404(db, body.plot_id)

    # 既に BAN されている場合は 409
    existing = db.execute(
        select(PlotBan).where(
            PlotBan.plot_id == uuid.UUID(body.plot_id),
            PlotBan.user_id == uuid.UUID(body.user_id),
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already banned from this plot",
        )

    ban = PlotBan(
        plot_id=uuid.UUID(body.plot_id),
        user_id=uuid.UUID(body.user_id),
        reason=body.reason,
    )
    db.add(ban)
    db.commit()

    logger.info(
        "Admin %s banned user %s from plot %s (reason=%s)",
        current_user.id,
        body.user_id,
        body.plot_id,
        body.reason,
    )
    return {"detail": "User banned"}


# ─── DELETE /admin/bans ──────────────────────────
@router.delete("/admin/bans", status_code=status.HTTP_204_NO_CONTENT)
def unban_user(
    body: UnbanRequest,
    current_user: AuthUser,
    db: DbSession,
) -> Response:
    """BAN を解除する（要管理者権限）。"""
    _require_admin(current_user)

    ban = db.execute(
        select(PlotBan).where(
            PlotBan.plot_id == uuid.UUID(body.plot_id),
            PlotBan.user_id == uuid.UUID(body.user_id),
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
        body.user_id,
        body.plot_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── POST /plots/{plot_id}/pause ─────────────────
@router.post("/plots/{plot_id}/pause")
def pause_plot(
    plot_id: str,
    body: PauseRequest,
    current_user: AuthUser,
    db: DbSession,
) -> dict[str, str]:
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
    return {"detail": "Plot paused"}


# ─── DELETE /plots/{plot_id}/pause ────────────────
@router.delete("/plots/{plot_id}/pause")
def resume_plot(
    plot_id: str,
    current_user: AuthUser,
    db: DbSession,
) -> dict[str, str]:
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
    return {"detail": "Plot resumed"}
