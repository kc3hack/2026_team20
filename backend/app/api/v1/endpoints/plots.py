"""Plots endpoints – Plot 一時停止・再開。

docs/api.md 準拠:
- POST   /plots/{plotId}/pause  → 編集一時停止（要管理者権限）
- DELETE /plots/{plotId}/pause  → 編集再開（要管理者権限）

NOTE: このルーターは api.py で prefix="/plots" 付きで登録されるため、
ルート定義は /{plot_id}/pause のように相対パスで記述する。
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import _get_plot_or_404, _require_admin
from app.schemas import MessageResponse, PauseRequest

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── POST /plots/{plot_id}/pause ─────────────────
@router.post("/{plot_id}/pause", response_model=MessageResponse)
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
@router.delete("/{plot_id}/pause", response_model=MessageResponse)
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
