"""検索サービス - ILIKE ベースの Plot 検索ロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
将来的に ts_vector ベースの全文検索に移行する場合、
このファイル内のクエリロジックのみ修正すれば良い。
"""

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Plot, Star


def search_plots(
    db: Session,
    q: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[tuple[Plot, int]], int]:
    """ILIKE を使用した Plot 検索。title と description を対象とする。

    戻り値は ((Plot, star_count) のリスト, total件数) のタプル。
    """
    # ILIKE ワイルドカード文字をエスケープし、DoS を防止する
    escaped_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped_q}%"

    filter_cond = or_(
        Plot.title.ilike(pattern, escape="\\"),
        Plot.description.ilike(pattern, escape="\\"),
    )

    total = db.query(Plot).filter(filter_cond).count()

    # スター数を1回のクエリで取得する（N+1 回避）。
    # LEFT OUTER JOIN で Star テーブルを結合し、plot ごとに COUNT する。
    star_count_subq = (
        db.query(Star.plot_id, func.count(Star.id).label("star_count"))
        .group_by(Star.plot_id)
        .subquery()
    )

    items = (
        db.query(Plot, func.coalesce(star_count_subq.c.star_count, 0))
        .outerjoin(star_count_subq, Plot.id == star_count_subq.c.plot_id)
        .filter(filter_cond)
        .order_by(Plot.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [(plot, star_count) for plot, star_count in items], total
