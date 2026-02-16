"""History service - 2-layer storage business logic.

Phase 1 (Hot): Operation logs in hot_operations (72h TTL)
Phase 2 (Cold): Snapshots in cold_snapshots (permanent)
"""

import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import HotOperation, ColdSnapshot, Section, User


# TTL for hot operations (72 hours)
HOT_OPERATION_TTL_HOURS = 72


def record_operation(
    db: Session,
    section_id: UUID,
    user_id: UUID,
    operation_type: str,
    payload: dict | None = None,
) -> HotOperation:
    """Record an operation in hot_operations and create a cold snapshot.

    1. Increment section version
    2. Save operation log (Phase 1 - hot, 72h)
    3. Save content snapshot (Phase 2 - cold, permanent)
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Increment version
    section.version += 1
    new_version = section.version

    # Phase 1: Record hot operation
    operation = HotOperation(
        section_id=section_id,
        operation_type=operation_type,
        payload=payload,
        user_id=user_id,
        version=new_version,
    )
    db.add(operation)

    # Phase 2: Create cold snapshot of current content
    snapshot = ColdSnapshot(
        section_id=section_id,
        content=section.content,
        version=new_version,
    )
    db.add(snapshot)

    db.commit()
    db.refresh(operation)
    return operation


def get_history(
    db: Session,
    section_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Get operation history for a section (72h window only).

    Returns list of history items with user info, and total count.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

    query = (
        db.query(HotOperation)
        .filter(
            HotOperation.section_id == section_id,
            HotOperation.created_at >= cutoff,
        )
        .order_by(HotOperation.created_at.desc())
    )

    total = query.count()
    operations = query.offset(offset).limit(limit).all()

    items = []
    for op in operations:
        user = db.query(User).filter(User.id == op.user_id).first()
        items.append(
            {
                "id": op.id,
                "section_id": op.section_id,
                "operation_type": op.operation_type,
                "payload": op.payload,
                "user": {
                    "id": user.id,
                    "displayName": user.display_name,
                    "avatarUrl": user.avatar_url,
                }
                if user
                else None,
                "version": op.version,
                "created_at": op.created_at,
            }
        )

    return items, total


def rollback_to_version(
    db: Session,
    section_id: UUID,
    version: int,
) -> Section:
    """Rollback a section to a specific version.

    Only allowed if version is within the 72h hot operation window.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Check the operation at that version is within 72h
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)
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
        raise ValueError("Version not found or outside 72-hour rollback window")

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

    # Restore section content from snapshot
    section.content = snapshot.content
    section.version = version

    db.commit()
    db.refresh(section)
    return section


def get_diff(
    db: Session,
    section_id: UUID,
    from_version: int,
    to_version: int,
) -> dict:
    """Compute diff between two snapshot versions.

    Simple text-based diff: compare JSON-serialized content.
    Returns additions and deletions.
    """
    from_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == from_version,
        )
        .first()
    )

    to_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == to_version,
        )
        .first()
    )

    if not from_snapshot or not to_snapshot:
        raise ValueError("Snapshot not found for one or both versions")

    # Extract text content from Tiptap JSON
    from_text = _extract_text(from_snapshot.content)
    to_text = _extract_text(to_snapshot.content)

    additions, deletions = _simple_diff(from_text, to_text)

    return {
        "from_version": from_version,
        "to_version": to_version,
        "additions": additions,
        "deletions": deletions,
    }


def _extract_text(content: dict | None) -> str:
    """Extract plain text from Tiptap JSON content."""
    if not content:
        return ""
    return json.dumps(content, ensure_ascii=False, sort_keys=True)


def _simple_diff(from_text: str, to_text: str) -> tuple[list[dict], list[dict]]:
    """Simple diff between two strings.

    Finds text that exists in to_text but not from_text (additions)
    and text that exists in from_text but not to_text (deletions).
    """
    additions = []
    deletions = []

    if from_text == to_text:
        return additions, deletions

    # Simple approach: if texts differ, report the full change
    if from_text and from_text != to_text:
        deletions.append({"start": 0, "end": len(from_text), "text": from_text})

    if to_text and from_text != to_text:
        additions.append({"start": 0, "end": len(to_text), "text": to_text})

    return additions, deletions
