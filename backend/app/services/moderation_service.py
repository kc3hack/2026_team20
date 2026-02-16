"""Moderation service - BAN, pause, diff, and restore logic."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import ColdSnapshot, HotOperation, Plot, PlotBan, Section


# Restore window (72 hours)
RESTORE_WINDOW_HOURS = 72


def ban_user(
    db: Session,
    plot_id: UUID,
    user_id: UUID,
    reason: str | None = None,
) -> PlotBan:
    """Ban a user from a specific plot.

    Raises ValueError if plot not found or user already banned.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    existing = (
        db.query(PlotBan)
        .filter(PlotBan.plot_id == plot_id, PlotBan.user_id == user_id)
        .first()
    )
    if existing:
        raise ValueError("User is already banned from this plot")

    ban = PlotBan(plot_id=plot_id, user_id=user_id, reason=reason)
    db.add(ban)
    db.commit()
    db.refresh(ban)
    return ban


def unban_user(
    db: Session,
    plot_id: UUID,
    user_id: UUID,
) -> None:
    """Remove a ban for a user on a specific plot.

    Raises ValueError if ban not found.
    """
    ban = (
        db.query(PlotBan)
        .filter(PlotBan.plot_id == plot_id, PlotBan.user_id == user_id)
        .first()
    )
    if not ban:
        raise ValueError("Ban not found")

    db.delete(ban)
    db.commit()


def is_user_banned(db: Session, plot_id: UUID, user_id: UUID) -> bool:
    """Check if a user is banned from a plot."""
    ban = (
        db.query(PlotBan)
        .filter(PlotBan.plot_id == plot_id, PlotBan.user_id == user_id)
        .first()
    )
    return ban is not None


def pause_plot(
    db: Session,
    plot_id: UUID,
    reason: str | None = None,
) -> Plot:
    """Pause editing on a plot.

    Raises ValueError if plot not found or already paused.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    if plot.is_paused:
        raise ValueError("Plot is already paused")

    plot.is_paused = True
    plot.pause_reason = reason
    db.commit()
    db.refresh(plot)
    return plot


def resume_plot(
    db: Session,
    plot_id: UUID,
) -> Plot:
    """Resume editing on a paused plot.

    Raises ValueError if plot not found or not paused.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    if not plot.is_paused:
        raise ValueError("Plot is not paused")

    plot.is_paused = False
    plot.pause_reason = None
    db.commit()
    db.refresh(plot)
    return plot


def get_section_diff(
    db: Session,
    section_id: UUID,
    version: int,
) -> dict:
    """Get diff between the specified version and the version before it.

    Compares version N with version N-1 (or empty if N is the first).
    Returns additions/deletions format.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Get target snapshot
    target_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == version,
        )
        .first()
    )
    if not target_snapshot:
        raise ValueError("Version not found")

    # Get the previous snapshot (highest version < target)
    prev_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version < version,
        )
        .order_by(ColdSnapshot.version.desc())
        .first()
    )

    from_text = _extract_text(prev_snapshot.content if prev_snapshot else None)
    to_text = _extract_text(target_snapshot.content)

    additions, deletions = _compute_diff(from_text, to_text)

    return {
        "from_version": prev_snapshot.version if prev_snapshot else 0,
        "to_version": version,
        "additions": additions,
        "deletions": deletions,
    }


def restore_to_version(
    db: Session,
    section_id: UUID,
    version: int,
) -> Section:
    """Restore a section to a specific version (72h window only).

    Raises ValueError if section/version not found or outside window.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Check the operation at that version is within 72h
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RESTORE_WINDOW_HOURS)
    operation = (
        db.query(HotOperation)
        .filter(
            HotOperation.section_id == section_id,
            HotOperation.version == version,
            HotOperation.created_at >= cutoff,
        )
        .first()
    )
    if not operation:
        raise ValueError("Version not found or outside 72-hour restore window")

    # Get the cold snapshot for the target version
    snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == version,
        )
        .first()
    )
    if not snapshot:
        raise ValueError("Snapshot not found for this version")

    # Restore section content
    section.content = snapshot.content
    section.version = version
    db.commit()
    db.refresh(section)
    return section


def _extract_text(content: dict | None) -> str:
    """Extract plain text from Tiptap JSON content."""
    if not content:
        return ""
    import json

    return json.dumps(content, ensure_ascii=False, sort_keys=True)


def _compute_diff(from_text: str, to_text: str) -> tuple[list[dict], list[dict]]:
    """Simple diff between two strings."""
    additions = []
    deletions = []

    if from_text == to_text:
        return additions, deletions

    if from_text and from_text != to_text:
        deletions.append({"start": 0, "end": len(from_text), "text": from_text})

    if to_text and from_text != to_text:
        additions.append({"start": 0, "end": len(to_text), "text": to_text})

    return additions, deletions
