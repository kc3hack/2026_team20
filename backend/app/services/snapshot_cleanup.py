"""Snapshot cleanup - applies retention policy daily at 3am.

Spec: renew-api.md lines 53-65

Retention policy:
- 0-7 days: Keep all
- 7-30 days: Keep 1 per hour (latest in each hour)
- 30+ days: Keep 1 per day (latest in each day)
"""

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, delete, distinct, select
from sqlalchemy.orm import Session

from app.models import ColdSnapshot
from app.services.history_service import delete_expired_hot_operations

logger = logging.getLogger(__name__)


def cleanup_old_snapshots(db: Session, plot_id: str | None = None) -> int:
    """Apply retention policy to snapshots.

    各Plot単位でスナップショットの保持ポリシーを適用する。
    - 0-7日: 全て保持
    - 7-30日: 1時間あたり最新1件のみ保持
    - 30日以上: 1日あたり最新1件のみ保持

    Args:
        db: Database session
        plot_id: If provided, only clean up snapshots for this plot.

    Returns:
        Number of snapshots deleted.
    """
    now = datetime.now(UTC)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # Get all plot_ids that have snapshots (or just the specified one)
    if plot_id:
        plot_ids = [plot_id]
    else:
        stmt = select(distinct(ColdSnapshot.plot_id))
        plot_ids = db.execute(stmt).scalars().all()

    total_deleted = 0

    for pid in plot_ids:
        # Phase 1: Clean 7-30 day range (keep 1 per hour)
        deleted = _thin_snapshots_by_period(
            db=db,
            plot_id=pid,
            older_than=seven_days_ago,
            newer_than=thirty_days_ago,
            group_format="hour",
        )
        total_deleted += deleted

        # Phase 2: Clean 30+ day range (keep 1 per day)
        deleted = _thin_snapshots_by_period(
            db=db,
            plot_id=pid,
            older_than=thirty_days_ago,
            newer_than=None,
            group_format="day",
        )
        total_deleted += deleted

    if total_deleted > 0:
        db.commit()
        logger.info(
            "Deleted %d old snapshot(s) across %d plot(s)", total_deleted, len(plot_ids)
        )

    return total_deleted


def _thin_snapshots_by_period(
    db: Session,
    plot_id: str | UUID,
    older_than: datetime,
    newer_than: datetime | None,
    group_format: str,
) -> int:
    """Delete snapshots except the latest one per time bucket.

    Args:
        db: Database session
        plot_id: Plot to clean up
        older_than: Only consider snapshots older than this
        newer_than: Only consider snapshots newer than this (None = no lower bound)
        group_format: "hour" or "day" - determines grouping granularity

    Returns:
        Number of snapshots deleted.
    """
    # Build date range filter
    filters = [
        ColdSnapshot.plot_id == plot_id,
        ColdSnapshot.created_at < older_than,
    ]
    if newer_than is not None:
        filters.append(ColdSnapshot.created_at >= newer_than)

    # Get all snapshots in this range, ordered by created_at desc
    stmt = (
        select(ColdSnapshot)
        .where(and_(*filters))
        .order_by(ColdSnapshot.created_at.desc())
    )
    snapshots = db.execute(stmt).scalars().all()

    if not snapshots:
        return 0

    # Group by time bucket and find IDs to delete
    # (keep the latest snapshot in each bucket)
    # Why: Use set without type param to avoid Column[UUID] vs UUID basedpyright noise
    keep_ids: set[UUID] = set()
    seen_buckets: set[str] = set()

    for snap in snapshots:
        if group_format == "hour":
            # Why: Group by year-month-day-hour for hourly retention
            bucket = snap.created_at.strftime("%Y-%m-%d-%H")
        else:
            # Why: Group by year-month-day for daily retention
            bucket = snap.created_at.strftime("%Y-%m-%d")

        if bucket not in seen_buckets:
            # This is the latest snapshot in this bucket (ordered desc)
            seen_buckets.add(bucket)
            keep_ids.add(snap.id)

    # Delete all snapshots in the range that aren't in keep_ids
    delete_ids = [snap.id for snap in snapshots if snap.id not in keep_ids]

    if not delete_ids:
        return 0

    stmt_del = delete(ColdSnapshot).where(ColdSnapshot.id.in_(delete_ids))
    db.execute(stmt_del)

    return len(delete_ids)


def start_snapshot_cleanup() -> None:
    """Start the snapshot cleanup scheduler (APScheduler CronTrigger, daily at 3am).

    main.py の lifespan から呼び出す。
    APSchedulerが未インストールの場合は警告ログを出して無視する。
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        logger.warning(
            "apscheduler is not installed. Snapshot cleanup will not start. "
            "Install with: pip install apscheduler"
        )
        return

    from app.core.database import get_db

    def _snapshot_cleanup_job() -> None:
        """Scheduler job: run snapshot retention cleanup in a fresh DB session."""
        db = next(get_db())
        try:
            cleanup_old_snapshots(db)
        except Exception:
            logger.exception("Snapshot cleanup failed")
        finally:
            db.close()

    def _hot_operation_ttl_job() -> None:
        """Scheduler job: delete HotOperations older than 72 hours."""
        db = next(get_db())
        try:
            deleted = delete_expired_hot_operations(db)
            if deleted > 0:
                logger.info(
                    "HotOperation TTL cleanup: deleted %d expired record(s)", deleted
                )
        except Exception:
            logger.exception("HotOperation TTL cleanup failed")
        finally:
            db.close()

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _snapshot_cleanup_job,
        trigger=CronTrigger(hour=3, minute=0),
        id="snapshot_cleanup",
        replace_existing=True,
    )
    scheduler.add_job(
        _hot_operation_ttl_job,
        trigger=IntervalTrigger(hours=6),
        id="hot_operation_ttl_cleanup",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Snapshot cleanup scheduler started (daily at 3:00 AM)")
    logger.info("HotOperation TTL cleanup scheduler started (every 6 hours)")
