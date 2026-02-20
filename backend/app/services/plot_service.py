"""Plotサービス - CRUD および一覧取得ロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
失敗時は ValueError を raise し、endpoint 側で HTTPException に変換する。
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Plot, Star


def list_plots(
    db: Session,
    tag: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Plot], int]:
    """Plot 一覧を取得する。

    tag が指定された場合、tags JSON カラムに含まれる Plot のみ返す。
    戻り値は (Plot リスト, total件数) のタプル。
    """
    query = db.query(Plot)

    if tag:
        # PostgreSQL の JSON 配列に対して要素が含まれるかチェック
        # tags カラムは JSON 型 (list[str]) なので、cast して検索する
        query = query.filter(Plot.tags.op("@>")(f'["{tag}"]'))

    total = query.count()

    plots = (
        query
        .order_by(Plot.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return plots, total


def create_plot(
    db: Session,
    user_id: UUID,
    title: str,
    description: str | None = None,
    tags: list[str] | None = None,
    thumbnail_url: str | None = None,
) -> Plot:
    """Plot を作成する。"""
    plot = Plot(
        title=title,
        description=description,
        tags=tags or [],
        owner_id=user_id,
        thumbnail_url=thumbnail_url,
    )
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return plot


def get_plot_detail(db: Session, plot_id: UUID) -> Plot:
    """Plot 詳細を取得する。

    存在しない場合は ValueError を raise する。
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")
    return plot


def update_plot(
    db: Session,
    plot_id: UUID,
    user_id: UUID,
    title: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None,
    thumbnail_url: str | None = ...,  # sentinel: None は「削除」、... は「未指定」
) -> Plot:
    """Plot を更新する（作成者のみ）。

    - Plot が見つからない場合: ValueError("Plot not found")
    - 作成者でない場合: ValueError("Forbidden")
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    if str(plot.owner_id) != str(user_id):
        raise ValueError("Forbidden")

    if title is not None:
        plot.title = title
    if description is not None:
        plot.description = description
    if tags is not None:
        plot.tags = tags
    # thumbnail_url: ... は未指定、None は明示的に削除
    if thumbnail_url is not ...:
        plot.thumbnail_url = thumbnail_url

    db.commit()
    db.refresh(plot)
    return plot


def delete_plot(db: Session, plot_id: UUID, user_id: UUID) -> None:
    """Plot を削除する（作成者のみ）。

    関連データは ON DELETE CASCADE で自動削除される。
    - Plot が見つからない場合: ValueError("Plot not found")
    - 作成者でない場合: ValueError("Forbidden")
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    if str(plot.owner_id) != str(user_id):
        raise ValueError("Forbidden")

    db.delete(plot)
    db.commit()


def get_star_count(db: Session, plot_id: UUID) -> int:
    """Plot のスター数を取得する。"""
    return db.query(Star).filter(Star.plot_id == plot_id).count()


def is_starred_by(db: Session, plot_id: UUID, user_id: UUID | None) -> bool:
    """指定ユーザーが Plot にスターしているか判定する。"""
    if user_id is None:
        return False
    return (
        db.query(Star)
        .filter(Star.plot_id == plot_id, Star.user_id == user_id)
        .first()
        is not None
    )


def list_trending(db: Session, limit: int = 5) -> list[Plot]:
    """急上昇 Plot 一覧（直近72時間のスター増加数でソート）。"""
    since = datetime.now(timezone.utc) - timedelta(hours=72)

    # 直近72時間にスターされた Plot を、スター数降順で取得
    results = (
        db.query(Plot, func.count(Star.id).label("recent_stars"))
        .join(Star, Star.plot_id == Plot.id)
        .filter(Star.created_at >= since)
        .group_by(Plot.id)
        .order_by(func.count(Star.id).desc())
        .limit(limit)
        .all()
    )

    return [plot for plot, _ in results]


def list_popular(db: Session, limit: int = 5) -> list[Plot]:
    """人気 Plot 一覧（全期間のスター総数でソート）。"""
    results = (
        db.query(Plot, func.count(Star.id).label("total_stars"))
        .outerjoin(Star, Star.plot_id == Plot.id)
        .group_by(Plot.id)
        .order_by(func.count(Star.id).desc())
        .limit(limit)
        .all()
    )

    return [plot for plot, _ in results]


def list_new(db: Session, limit: int = 5) -> list[Plot]:
    """新規 Plot 一覧（作成日時の降順）。"""
    return (
        db.query(Plot)
        .order_by(Plot.created_at.desc())
        .limit(limit)
        .all()
    )
