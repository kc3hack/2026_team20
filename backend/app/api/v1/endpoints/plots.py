"""Plot CRUD API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Plot, User
from app.schemas import (
    CreatePlotRequest,
    UpdatePlotRequest,
    PlotResponse,
    PlotDetailResponse,
    PlotListResponse,
    SectionResponse,
    UserBrief,
)

router = APIRouter()


def get_user(db: Session, user_id: str | None) -> User:
    """Resolve user from X-Test-User-Id header (dev/test auth)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    import uuid as _uuid

    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def plot_to_response(plot: Plot) -> PlotResponse:
    """Convert Plot model to PlotResponse."""
    return PlotResponse(
        id=plot.id,
        title=plot.title,
        description=plot.description or "",
        tags=plot.tags or [],
        owner_id=plot.owner_id,
        star_count=len(plot.stars) if plot.stars else 0,
        is_starred=False,
        is_paused=plot.is_paused or False,
        editing_users=[],
        created_at=plot.created_at,
        updated_at=plot.updated_at,
    )


@router.get("", response_model=PlotListResponse)
def list_plots(
    tag: str | None = None,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List all plots with optional tag filter and pagination."""
    query = db.query(Plot)

    if tag:
        query = query.filter(Plot.tags.any(tag))

    total = query.count()
    plots = query.order_by(Plot.created_at.desc()).offset(offset).limit(limit).all()

    return PlotListResponse(
        items=[plot_to_response(p) for p in plots],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=PlotResponse, status_code=201)
def create_plot(
    body: CreatePlotRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Create a new plot."""
    user = get_user(db, x_test_user_id)

    plot = Plot(
        title=body.title,
        description=body.description,
        tags=body.tags,
        owner_id=user.id,
    )
    db.add(plot)
    db.commit()
    db.refresh(plot)

    return plot_to_response(plot)


@router.get("/{plot_id}", response_model=PlotDetailResponse)
def get_plot(plot_id: UUID, db: Session = Depends(get_db)):
    """Get plot by ID with sections."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    sections = sorted(plot.sections, key=lambda s: s.order_index)
    section_responses = [
        SectionResponse(
            id=s.id,
            plot_id=s.plot_id,
            title=s.title,
            content=s.content,
            order_index=s.order_index,
            version=s.version,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sections
    ]

    owner_brief = None
    if plot.owner:
        owner_brief = UserBrief(
            id=plot.owner.id,
            display_name=plot.owner.display_name,
            avatar_url=plot.owner.avatar_url,
        )

    resp = plot_to_response(plot)
    return PlotDetailResponse(
        **resp.model_dump(),
        sections=section_responses,
        owner=owner_brief,
    )


@router.put("/{plot_id}", response_model=PlotResponse)
def update_plot(
    plot_id: UUID,
    body: UpdatePlotRequest,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Update plot by ID."""
    get_user(db, x_test_user_id)

    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    if body.title is not None:
        plot.title = body.title
    if body.description is not None:
        plot.description = body.description
    if body.tags is not None:
        plot.tags = body.tags

    db.commit()
    db.refresh(plot)

    return plot_to_response(plot)


@router.delete("/{plot_id}", status_code=204)
def delete_plot(
    plot_id: UUID,
    db: Session = Depends(get_db),
    x_test_user_id: str | None = Header(None),
):
    """Delete plot by ID."""
    get_user(db, x_test_user_id)

    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    db.delete(plot)
    db.commit()
