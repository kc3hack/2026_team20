"""Cleanup service - TTL cleanup job for hot_operations.

Deletes hot_operations older than 72 hours to keep DB lean.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import HotOperation
from app.services.history_service import HOT_OPERATION_TTL_HOURS


def cleanup_expired_operations(db: Session) -> int:
    """Delete hot_operations older than 72 hours.

    Returns the number of deleted rows.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

    deleted_count = (
        db.query(HotOperation)
        .filter(HotOperation.created_at < cutoff)
        .delete(synchronize_session="fetch")
    )

    db.commit()
    return deleted_count
