"""モデレーションサービス - BAN、一時停止、および差分ロジック。"""

from uuid import UUID

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Plot, PlotBan


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

    try:
        ban = PlotBan(plot_id=plot_id, user_id=user_id, reason=reason)
        db.add(ban)
        db.commit()
        db.refresh(ban)
        return ban

    except IntegrityError as e:
        db.rollback()
        raise ValueError("User is already banned from this plot") from e


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

    try:
        db.delete(ban)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


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
    try:
        plot = db.query(Plot).filter(Plot.id == plot_id).with_for_update().first()
        if not plot:
            raise ValueError("Plot not found")

        if plot.is_paused:
            raise ValueError("Plot is already paused")

        plot.is_paused = True
        plot.pause_reason = reason
        db.commit()
        db.refresh(plot)
        return plot
    except SQLAlchemyError:
        db.rollback()
        raise


def resume_plot(
    db: Session,
    plot_id: UUID,
) -> Plot:
    """一時停止されたプロットの編集を再開する。

    プロットが見つからない、または一時停止されていない場合はValueErrorを発生させる。
    """
    try:
        plot = db.query(Plot).filter(Plot.id == plot_id).with_for_update().first()
        if not plot:
            raise ValueError("Plot not found")

        if not plot.is_paused:
            raise ValueError("Plot is not paused")

        plot.is_paused = False
        plot.pause_reason = None
        db.commit()
        db.refresh(plot)
        return plot
    except SQLAlchemyError:
        db.rollback()
        raise
