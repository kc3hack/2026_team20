
"""モデレーションサービス - BAN、一時停止、および差分ロジック。"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import ColdSnapshot, Plot, PlotBan, Section
from app.services.history_service import compute_diff, extract_text


def ban_user(
    db: Session,
    plot_id: UUID,
    user_id: UUID,
    reason: str | None = None,
) -> PlotBan:
    """特定のプロットからユーザーをBANする。

    プロットが見つからない、またはユーザーが既にBANされている場合はValueErrorを発生させる。
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
    """特定のプロットのユーザーのBANを解除する。

    BANが見つからない場合はValueErrorを発生させる。
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
    """ユーザーがプロットからBANされているかをチェックする。"""
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
    """プロットの編集を一時停止する。

    プロットが見つからない、または既に一時停止されている場合はValueErrorを発生させる。
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
    """一時停止されたプロットの編集を再開する。

    プロットが見つからない、または一時停止されていない場合はValueErrorを発生させる。
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
    """指定されたバージョンとその前のバージョンの差分を取得する。

    バージョンNをバージョンN-1と比較する（Nが最初の場合は空と比較）。
    追加/削除形式で返す。
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # 対象のスナップショットを取得
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

    # 前のスナップショットを取得（target未満の最大バージョン）
    prev_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version < version,
        )
        .order_by(ColdSnapshot.version.desc())
        .first()
    )

    from_text = extract_text(prev_snapshot.content if prev_snapshot else None)
    to_text = extract_text(target_snapshot.content)

    additions, deletions = compute_diff(from_text, to_text)

    return {
        "from_version": prev_snapshot.version if prev_snapshot else 0,
        "to_version": version,
        "additions": additions,
        "deletions": deletions,
    }
