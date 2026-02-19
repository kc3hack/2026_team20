"""検索サービス - ILIKE ベースの Plot 検索ロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
将来的に ts_vector ベースの全文検索に移行する場合、
このファイル内のクエリロジックのみ修正すれば良い。
"""

from sqlalchemy import or_
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
    pattern = f"%{q}%"

    query = db.query(Plot).filter(
        or_(
            Plot.title.ilike(pattern),
            Plot.description.ilike(pattern),
        )
    )

    total = query.count()

    plots = (
        query
        .order_by(Plot.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[tuple[Plot, int]] = []
    for plot in plots:
        star_count = db.query(Star).filter(Star.plot_id == plot.id).count()
        items.append((plot, star_count))

    return items, total
