"""History API endpoints - 2-layer storage (hot operations + cold snapshots)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Section, User
from app.schemas import (
    CreateOperationRequest,
    DiffResponse,
    HistoryItem,
    HistoryListResponse,
    SectionResponse,
    UserBrief,
)
from app.services import history_service

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


def _section_to_response(section: Section) -> dict:
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


@router.post("/sections/{section_id}/operations", status_code=201)
def create_operation(
    section_id: UUID,
    body: CreateOperationRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Record an operation log for a section (Phase 1: hot, 72h TTL)."""
    user = _get_user(db, x_test_user_id)

    # Verify section exists
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    payload = {
        "position": body.position,
        "content": body.content,
        "length": body.length,
    }

    try:
        operation = history_service.record_operation(
            db=db,
            section_id=section_id,
            user_id=user.id,
            operation_type=body.operation_type,
            payload=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"id": str(operation.id), "version": operation.version}


@router.get("/sections/{section_id}/history", response_model=HistoryListResponse)
def get_history(
    section_id: UUID,
    limit: int = Query(default=50, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Get operation history for a section (72h window only)."""
    # Verify section exists
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    items, total = history_service.get_history(
        db=db,
        section_id=section_id,
        limit=limit,
        offset=offset,
    )

    history_items = []
    for item in items:
        user_data = item.get("user")
        user_brief = (
            UserBrief(
                id=user_data["id"],
                displayName=user_data["displayName"],
                avatarUrl=user_data.get("avatarUrl"),
            )
            if user_data
            else UserBrief(
                id="00000000-0000-0000-0000-000000000000",
                displayName="Unknown",
                avatarUrl=None,
            )
        )

        history_items.append(
            HistoryItem(
                id=item["id"],
                sectionId=item["section_id"],
                operationType=item["operation_type"],
                payload=item["payload"],
                user=user_brief,
                version=item["version"],
                createdAt=item["created_at"],
            )
        )

    return HistoryListResponse(items=history_items, total=total)


@router.post(
    "/sections/{section_id}/rollback/{version}",
    response_model=SectionResponse,
)
def rollback_section(
    section_id: UUID,
    version: int,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None, alias="X-Test-User-Id"),
):
    """Rollback a section to a specific version (72h window only)."""
    _get_user(db, x_test_user_id)

    # Verify section exists
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    try:
        restored = history_service.rollback_to_version(
            db=db,
            section_id=section_id,
            version=version,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return SectionResponse(**_section_to_response(restored))


@router.get(
    "/sections/{section_id}/diff/{from_version}/{to_version}",
    response_model=DiffResponse,
)
def get_diff(
    section_id: UUID,
    from_version: int,
    to_version: int,
    db: Session = Depends(get_db),
):
    """Get diff between two snapshot versions."""
    # Verify section exists
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    try:
        diff = history_service.get_diff(
            db=db,
            section_id=section_id,
            from_version=from_version,
            to_version=to_version,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return DiffResponse(
        fromVersion=diff["from_version"],
        toVersion=diff["to_version"],
        additions=diff["additions"],
        deletions=diff["deletions"],
    )
