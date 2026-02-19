"""Search endpoint: ILIKE ベースの Plot 検索。

docs/api.md の Search セクション準拠:
- GET /  → Plot 検索（q, limit, offset）

将来的に ts_vector ベースの全文検索に移行する場合、
このファイル内のクエリロジックのみ修正すれば良い。
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_

from app.api.v1.deps import DbSession
from app.api.v1.utils import plot_to_response
from app.models import Plot, Star

router = APIRouter()


@router.get("/")
def search_plots(
    db: DbSession,
    q: str = Query(..., min_length=1, description="検索クエリ"),
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """ILIKE を使用した Plot 検索。title と description を対象とする。"""
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

    items = []
    for plot in plots:
        star_count = db.query(Star).filter(Star.plot_id == plot.id).count()
        items.append(plot_to_response(plot, star_count=star_count))

    return {
        "items": items,
        "total": total,
        "query": q,
    }
