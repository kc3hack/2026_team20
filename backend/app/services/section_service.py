"""Section business logic service."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Plot, Section

MAX_SECTIONS_PER_PLOT = 255


def get_plot_or_404(db: Session, plot_id: UUID) -> Plot:
    """Get plot by ID or raise 404."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    return plot


def get_section_or_404(db: Session, section_id: UUID) -> Section:
    """Get section by ID or raise 404."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


def check_section_limit(db: Session, plot_id: UUID) -> None:
    """Check if plot has reached the maximum number of sections (255)."""
    count = db.query(Section).filter(Section.plot_id == plot_id).count()
    if count >= MAX_SECTIONS_PER_PLOT:
        raise HTTPException(
            status_code=400,
            detail=f"Section limit reached: maximum {MAX_SECTIONS_PER_PLOT} sections per plot",
        )


def get_next_order_index(db: Session, plot_id: UUID) -> int:
    """Get the next available order_index for a plot's sections."""
    max_order = (
        db.query(Section.order_index)
        .filter(Section.plot_id == plot_id)
        .order_by(Section.order_index.desc())
        .first()
    )
    return (max_order[0] + 1) if max_order else 0


def create_section(
    db: Session,
    plot_id: UUID,
    title: str,
    content: dict | None = None,
) -> Section:
    """Create a new section for a plot."""
    # Verify plot exists
    get_plot_or_404(db, plot_id)

    # Check section limit
    check_section_limit(db, plot_id)

    # Determine order_index
    order_index = get_next_order_index(db, plot_id)

    section = Section(
        plot_id=plot_id,
        title=title,
        content=content,
        order_index=order_index,
        version=1,
    )
    db.add(section)
    db.commit()
    db.refresh(section)

    return section


def update_section(
    db: Session,
    section_id: UUID,
    title: str | None = None,
    content: dict | None = None,
) -> Section:
    """Update an existing section."""
    section = get_section_or_404(db, section_id)

    # Check if plot is paused
    plot = get_plot_or_404(db, section.plot_id)
    if plot.is_paused:
        raise HTTPException(status_code=403, detail="This plot is paused")

    if title is not None:
        section.title = title
    if content is not None:
        section.content = content
        section.version += 1

    db.commit()
    db.refresh(section)

    return section


def delete_section(db: Session, section_id: UUID) -> None:
    """Delete a section."""
    section = get_section_or_404(db, section_id)

    # Check if plot is paused
    plot = get_plot_or_404(db, section.plot_id)
    if plot.is_paused:
        raise HTTPException(status_code=403, detail="This plot is paused")

    db.delete(section)
    db.commit()


def reorder_section(db: Session, section_id: UUID, new_order: int) -> Section:
    """Reorder a section within its plot.

    Shifts other sections' order_index values to accommodate the new position.
    """
    section = get_section_or_404(db, section_id)
    old_order = section.order_index

    if old_order == new_order:
        return section

    # Get all sections for this plot, ordered
    siblings = (
        db.query(Section)
        .filter(Section.plot_id == section.plot_id)
        .order_by(Section.order_index)
        .all()
    )

    # Clamp new_order to valid range
    max_order = len(siblings) - 1
    if new_order < 0:
        new_order = 0
    if new_order > max_order:
        new_order = max_order

    if old_order == new_order:
        return section

    # Shift sections between old and new positions
    if old_order < new_order:
        # Moving down: shift sections in [old+1, new] up by -1
        for s in siblings:
            if old_order < s.order_index <= new_order:
                s.order_index -= 1
    else:
        # Moving up: shift sections in [new, old-1] down by +1
        for s in siblings:
            if new_order <= s.order_index < old_order:
                s.order_index += 1

    section.order_index = new_order
    db.commit()
    db.refresh(section)

    return section


def list_sections(db: Session, plot_id: UUID) -> list[Section]:
    """List all sections for a plot, ordered by order_index."""
    # Verify plot exists
    get_plot_or_404(db, plot_id)

    return (
        db.query(Section)
        .filter(Section.plot_id == plot_id)
        .order_by(Section.order_index)
        .all()
    )
