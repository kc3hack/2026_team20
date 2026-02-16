"""Admin/Moderation API endpoints - BAN, pause, diff, restore."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.schemas import (
    BanRequest,
    DiffResponse,
    PauseRequest,
    SectionResponse,
    UnbanRequest,
)
from app.services import moderation_service

router = APIRouter()


def _get_user(db: Session, user_id_header: str | None) -> User:
    """Get user by X-Test-User-Id header (dev/test only)."""
    if not user_id_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    import uuid as _uuid

    try:
        uid = _uuid.UUID(user_id_header)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _section_to_response(section) -> dict:
    """Convert Section model to response dict."""
    return {
        "id": section.id,
        "plot_id": section.plot_id,
        "title": section.title,
        "content": section.content,
        "order_index": section.order_index,
        "version": section.version,
        "created_at": section.created_at,
        "updated_at": section.updated_at,
    }


# --- BAN endpoints ---


@router.post("/admin/bans", status_code=201)
def ban_user_endpoint(
    body: BanRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Ban a user from a specific plot."""
    _get_user(db, x_test_user_id)  # Verify admin is authenticated

    try:
        ban = moderation_service.ban_user(
            db=db,
            plot_id=body.plot_id,
            user_id=body.user_id,
            reason=body.reason,
        )
    except ValueError as e:
        msg = str(e)
        if "already banned" in msg:
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=404, detail=msg)

    return {"id": str(ban.id), "plotId": str(ban.plot_id), "userId": str(ban.user_id)}


@router.delete("/admin/bans", status_code=204)
def unban_user_endpoint(
    body: UnbanRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Remove a ban for a user on a specific plot."""
    _get_user(db, x_test_user_id)  # Verify admin is authenticated

    try:
        moderation_service.unban_user(
            db=db,
            plot_id=body.plot_id,
            user_id=body.user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Pause endpoints ---


@router.post("/plots/{plot_id}/pause")
def pause_plot_endpoint(
    plot_id: UUID,
    body: PauseRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Pause editing on a plot."""
    _get_user(db, x_test_user_id)  # Verify admin is authenticated

    try:
        plot = moderation_service.pause_plot(
            db=db,
            plot_id=plot_id,
            reason=body.reason,
        )
    except ValueError as e:
        msg = str(e)
        if "already paused" in msg:
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=404, detail=msg)

    return {"id": str(plot.id), "isPaused": plot.is_paused}


@router.delete("/plots/{plot_id}/pause")
def resume_plot_endpoint(
    plot_id: UUID,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Resume editing on a paused plot."""
    _get_user(db, x_test_user_id)  # Verify admin is authenticated

    try:
        plot = moderation_service.resume_plot(db=db, plot_id=plot_id)
    except ValueError as e:
        msg = str(e)
        if "not paused" in msg:
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=404, detail=msg)

    return {"id": str(plot.id), "isPaused": plot.is_paused}


# --- Diff endpoint ---


@router.get("/sections/{section_id}/diff/{version}", response_model=DiffResponse)
def get_section_diff_endpoint(
    section_id: UUID,
    version: int,
    db: Session = Depends(get_db),
):
    """Get diff for a section at a specific version (compared to previous version)."""
    try:
        diff = moderation_service.get_section_diff(
            db=db,
            section_id=section_id,
            version=version,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return DiffResponse(
        fromVersion=diff["from_version"],
        toVersion=diff["to_version"],
        additions=diff["additions"],
        deletions=diff["deletions"],
    )


# --- Restore endpoint ---


@router.post(
    "/sections/{section_id}/restore/{version}",
    response_model=SectionResponse,
)
def restore_section_endpoint(
    section_id: UUID,
    version: int,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Restore a section to a specific version (72h window only)."""
    _get_user(db, x_test_user_id)

    try:
        restored = moderation_service.restore_to_version(
            db=db,
            section_id=section_id,
            version=version,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return SectionResponse(**_section_to_response(restored))
