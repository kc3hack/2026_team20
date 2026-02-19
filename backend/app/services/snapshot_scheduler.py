"""Snapshot scheduler - creates ColdSnapshots every 5 minutes.

Spec: renew-api.md lines 227-241

5分間隔で更新されたPlotのColdSnapshotを作成する。
- APScheduler IntervalTrigger (5 minutes)
- Plot.updated_at >= (now - 5min) のPlotを検索
- Plot全体JSON（メタデータ + 全セクション）でColdSnapshotを作成
- 10MBを超えるスナップショットはスキップ（警告ログ）
"""

import json
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import ColdSnapshot, Plot

logger = logging.getLogger(__name__)

# Max snapshot size (10MB)
MAX_SNAPSHOT_SIZE = 10 * 1024 * 1024

# Snapshot interval in minutes
SNAPSHOT_INTERVAL_MINUTES = 5


def create_plot_snapshot(db: Session, plot: Plot) -> ColdSnapshot | None:
    """Create a ColdSnapshot for a plot.

    Plot全体（メタデータ + 全セクション）をJSON化してColdSnapshotに保存する。
    10MBを超える場合はNoneを返しスキップする。

    Returns:
        ColdSnapshot if created, None if size limit exceeded.
    """
    # Build plot-wide JSON content
    content = {
        "plot": {
            "title": plot.title,
            "description": plot.description,
            "tags": plot.tags or [],
        },
        "sections": [
            {
                "id": str(section.id),
                "title": section.title,
                "content": section.content,
                "orderIndex": section.order_index,
                "version": section.version,
            }
            for section in sorted(plot.sections, key=lambda s: s.order_index)
        ],
    }

    # Check size limit
    snapshot_json = json.dumps(content, ensure_ascii=False)
    snapshot_size = len(snapshot_json.encode("utf-8"))
    if snapshot_size > MAX_SNAPSHOT_SIZE:
        logger.warning(
            "Snapshot for plot %s exceeds 10MB limit (%d bytes), skipping",
            plot.id,
            snapshot_size,
        )
        return None

    snapshot = ColdSnapshot(
        plot_id=plot.id,
        content=content,
        version=plot.version,
    )
    db.add(snapshot)
    return snapshot


def run_snapshot_batch(db: Session) -> int:
    """Run one batch of snapshot creation.

    直近5分間に更新されたPlotを検索し、各PlotのColdSnapshotを作成する。
    バッチジョブ（APScheduler）から呼び出されることを想定。

    Returns:
        Number of snapshots created.
    """
    cutoff = datetime.now(UTC) - timedelta(minutes=SNAPSHOT_INTERVAL_MINUTES)

    # Find plots updated in last 5 minutes
    stmt = (
        select(Plot)
        .where(Plot.updated_at >= cutoff)
        .options(selectinload(Plot.sections))
    )
    plots = db.execute(stmt).scalars().all()

    count = 0
    for plot in plots:
        snapshot = create_plot_snapshot(db, plot)
        if snapshot:
            count += 1

    if count > 0:
        db.commit()
        logger.info("Created %d snapshot(s) for %d updated plot(s)", count, len(plots))

    return count


def start_snapshot_scheduler() -> None:
    """Start the snapshot scheduler (APScheduler IntervalTrigger, 5 minutes).

    main.py の lifespan から呼び出す。
    APSchedulerが未インストールの場合は警告ログを出して無視する。
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        logger.warning(
            "apscheduler is not installed. Snapshot scheduler will not start. "
            "Install with: pip install apscheduler"
        )
        return

    from app.core.database import get_db

    def _job() -> None:
        """Scheduler job: create snapshots in a fresh DB session."""
        db = next(get_db())
        try:
            run_snapshot_batch(db)
        except Exception:
            logger.exception("Snapshot batch failed")
        finally:
            db.close()

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _job,
        trigger=IntervalTrigger(minutes=SNAPSHOT_INTERVAL_MINUTES),
        id="snapshot_scheduler",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Snapshot scheduler started (interval: %d minutes)",
        SNAPSHOT_INTERVAL_MINUTES,
    )
