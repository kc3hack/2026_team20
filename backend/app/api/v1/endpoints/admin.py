"""Admin endpoints – BAN 管理。"""

import logging

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import _get_plot_or_404, _get_user_or_404, _require_admin
from app.schemas import BanRequest
from app.services import moderation_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── POST /admin/bans ────────────────────────────
@router.post(
    "/admin/bans",
    status_code=status.HTTP_201_CREATED,
)
def ban_user(
    body: BanRequest,
    current_user: AuthUser,
    db: DbSession,
) -> Response:
    """ユーザーを BAN する（要管理者権限）。"""
    _require_admin(current_user)

    # 対象 Plot と User の存在確認（内部でパース済み）
    plot = _get_plot_or_404(db, body.plotId)
    user = _get_user_or_404(db, body.userId)

    try:
        moderation_service.ban_user(
            db, plot_id=plot.id, user_id=user.id, reason=body.reason
        )
    except ValueError as e:
        # "User is already banned from this plot" → 409 Conflict
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e

    logger.info(
        "Admin %s banned user %s from plot %s (reason=%s)",
        current_user.id,
        body.userId,
        body.plotId,
        body.reason,
    )
    return Response(status_code=status.HTTP_201_CREATED)


# ─── DELETE /admin/bans ──────────────────────────
@router.delete("/admin/bans", status_code=status.HTTP_204_NO_CONTENT)
def unban_user(
    current_user: AuthUser,
    db: DbSession,
    plotId: str = Query(..., description="BAN 解除対象の Plot ID (UUID)"),
    userId: str = Query(..., description="BAN 解除対象の User ID (UUID)"),
) -> Response:
    """BAN を解除する（要管理者権限）。"""
    _require_admin(current_user)

    # 対象 Plot と User の存在確認（内部でパース済み）
    plot = _get_plot_or_404(db, plotId)
    user = _get_user_or_404(db, userId)

    try:
        moderation_service.unban_user(db, plot_id=plot.id, user_id=user.id)
    except ValueError as e:
        # "Ban not found" → 404 Not Found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    logger.info(
        "Admin %s unbanned user %s from plot %s",
        current_user.id,
        userId,
        plotId,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
