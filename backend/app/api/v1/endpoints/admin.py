"""Admin endpoints – BAN 管理。"""

import logging

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import _get_plot_or_404, _get_user_or_404, _require_admin
from app.models import PlotBan
from app.schemas import BanRequest, MessageResponse, UnbanRequest

logger = logging.getLogger(__name__)

router = APIRouter()


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
