"""Section CRUD API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.schemas import (
    CreateSectionRequest,
    UpdateSectionRequest,
    SectionResponse,
    SectionListResponse,
    ReorderSectionRequest,
)
from app.services.section_service import (
    create_section,
    get_section_or_404,
    update_section,
    delete_section,
    reorder_section,
    list_sections,
)

router = APIRouter()


def _get_user(db: Session, user_id: str | None) -> User:
    """Resolve user from X-Test-User-Id header (dev/test auth)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _section_to_response(section) -> SectionResponse:
    """Convert Section model to SectionResponse."""
    return SectionResponse(
        id=section.id,
        plot_id=section.plot_id,
        title=section.title,
        content=section.content,
        order_index=section.order_index,
        version=section.version,
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


# --- Plot-scoped routes (nested under /plots/{plot_id}/sections) ---


@router.get("/plots/{plot_id}/sections", response_model=SectionListResponse)
def get_plot_sections(
    plot_id: UUID,
    db: Session = Depends(get_db),
):
    """List all sections for a plot, ordered by order_index."""
    sections = list_sections(db, plot_id)
    return SectionListResponse(
        items=[_section_to_response(s) for s in sections],
        total=len(sections),
    )


@router.post(
    "/plots/{plot_id}/sections",
    response_model=SectionResponse,
    status_code=201,
)
def create_plot_section(
    plot_id: UUID,
    body: CreateSectionRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Create a new section for a plot."""
    _get_user(db, x_test_user_id)

    section = create_section(
        db=db,
        plot_id=plot_id,
        title=body.title,
        content=body.content,
    )
    return _section_to_response(section)


# --- Section-scoped routes (direct /sections/{id}) ---


@router.get("/sections/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a single section by ID."""
    section = get_section_or_404(db, section_id)
    return _section_to_response(section)


@router.put("/sections/{section_id}", response_model=SectionResponse)
def update_section_endpoint(
    section_id: UUID,
    body: UpdateSectionRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Update a section."""
    _get_user(db, x_test_user_id)

    section = update_section(
        db=db,
        section_id=section_id,
        title=body.title,
        content=body.content,
    )
    return _section_to_response(section)


@router.delete("/sections/{section_id}", status_code=204)
def delete_section_endpoint(
    section_id: UUID,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Delete a section."""
    _get_user(db, x_test_user_id)
    delete_section(db, section_id)


@router.post("/sections/{section_id}/reorder", response_model=SectionResponse)
def reorder_section_endpoint(
    section_id: UUID,
    body: ReorderSectionRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Reorder a section within its plot."""
    _get_user(db, x_test_user_id)

    section = reorder_section(
        db=db,
        section_id=section_id,
        new_order=body.new_order,
    )
    return _section_to_response(section)
