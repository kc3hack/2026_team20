"""スターサービス - スターの追加・削除・一覧取得ロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
失敗時は ValueError を raise し、endpoint 側で HTTPException に変換する。
"""

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Plot, Star, User


def get_plot_or_raise(db: Session, plot_id: UUID) -> Plot:
    """Plot を取得し、存在しなければ ValueError を raise する。"""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")
    return plot


def list_stars(
    db: Session,
    plot_id: UUID,
) -> list[tuple[Star, User]]:
    """スター一覧を取得する。

    戻り値は (Star, User) のタプルリスト。
    User が見つからないスターは除外される。
    """
    get_plot_or_raise(db, plot_id)

    stars = db.query(Star).filter(Star.plot_id == plot_id).all()

    result: list[tuple[Star, User]] = []
    for star in stars:
        user = db.query(User).filter(User.id == star.user_id).first()
        if user:
            result.append((star, user))

    return result


def add_star(db: Session, plot_id: UUID, user_id: UUID) -> Star:
    """スターを追加する。

    既にスター済みの場合は ValueError("Already starred") を raise する。
    """
    get_plot_or_raise(db, plot_id)

    existing = (
        db.query(Star)
        .filter(Star.plot_id == plot_id, Star.user_id == user_id)
        .first()
    )
    if existing:
        raise ValueError("Already starred")

    try:
        star = Star(plot_id=plot_id, user_id=user_id)
        db.add(star)
        db.commit()
        db.refresh(star)
        return star
    except IntegrityError:
        db.rollback()
        raise ValueError("Already starred")


def remove_star(db: Session, plot_id: UUID, user_id: UUID) -> None:
    """スターを削除する。

    スターしていない場合は ValueError("Not starred") を raise する。
    """
    get_plot_or_raise(db, plot_id)

    star = (
        db.query(Star)
        .filter(Star.plot_id == plot_id, Star.user_id == user_id)
        .first()
    )
    if not star:
        raise ValueError("Not starred")

    db.delete(star)
    db.commit()
