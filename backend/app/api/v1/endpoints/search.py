"""Search endpoint: ILIKE ベースの Plot 検索。

docs/api.md の Search セクション準拠:
- GET /  → Plot 検索（q, limit, offset）

将来的に ts_vector ベースの全文検索に移行する場合、
search_service.py 内のクエリロジックのみ修正すれば良い。
"""

from fastapi import APIRouter, Query

from app.api.v1.deps import DbSession
from app.api.v1.utils import plot_to_response
from app.services import search_service

router = APIRouter()


@router.get("/")
def search_plots(
    db: DbSession,
    q: str = Query(..., min_length=1, description="検索クエリ"),
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """ILIKE を使用した Plot 検索。title と description を対象とする。"""
    plot_star_pairs, total = search_service.search_plots(db, q, limit, offset)

    items = [
        plot_to_response(plot, star_count=star_count)
        for plot, star_count in plot_star_pairs
    ]

    return {
        "items": items,
        "total": total,
        "query": q,
    }
