"""Search endpoint: ILIKE ベースの Plot 検索。

docs/api.md の Search セクション準拠:
- GET /  → Plot 検索（q, limit, offset）

将来的に ts_vector ベースの全文検索に移行する場合、
このファイル内のクエリロジックのみ修正すれば良い。
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_

from app.api.v1.deps import DbSession
from app.models import Plot, Star

router = APIRouter()


def _serialize_plot(plot: Plot, star_count: int = 0) -> dict:
    """Plot を PlotResponse 形式に変換。"""
    return {
        "id": str(plot.id),
        "title": plot.title,
        "description": plot.description,
        "tags": plot.tags or [],
        "ownerId": str(plot.owner_id),
        "version": plot.version or 0,
        "starCount": star_count,
        "isStarred": False,
        "isPaused": plot.is_paused,
        "createdAt": plot.created_at.isoformat() if plot.created_at else None,
        "updatedAt": plot.updated_at.isoformat() if plot.updated_at else None,
    }


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
        items.append(_serialize_plot(plot, star_count))

    return {
        "items": items,
        "total": total,
        "query": q,
    }
