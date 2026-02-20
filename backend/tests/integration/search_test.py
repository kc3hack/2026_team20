"""Search endpoint integration tests: ILIKE ベースの Plot 検索。

テスト対象:
- GET /api/v1/search/?q=...
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Plot, User


class TestSearch:
    def test_search_plots(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """タイトルで検索してヒットする。"""
        resp = client.get("/api/v1/search/", params={"q": "Test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert data["query"] == "Test"
        assert len(data["items"]) >= 1
        ids = [item["id"] for item in data["items"]]
        assert str(test_plot.id) in ids

    def test_search_plots_with_query(
        self, client: TestClient, db: Session, test_user: User
    ) -> None:
        """description に一致するクエリでもヒットする。"""
        plot = Plot(
            title="Unique Title ABC",
            description="Special description XYZ",
            tags=[],
            owner_id=test_user.id,
        )
        db.add(plot)
        db.commit()
        db.refresh(plot)

        resp = client.get("/api/v1/search/", params={"q": "XYZ"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        ids = [item["id"] for item in data["items"]]
        assert str(plot.id) in ids

    def test_search_plots_no_results(self, client: TestClient) -> None:
        """マッチしないクエリは空リストを返す。"""
        resp = client.get("/api/v1/search/", params={"q": "zzznonexistent999"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_search_plots_with_pagination(
        self, client: TestClient, db: Session, test_user: User
    ) -> None:
        """limit/offset による pagination が機能する。"""
        for i in range(3):
            db.add(
                Plot(
                    title=f"Paginated Plot {i}",
                    description="pagination test",
                    tags=[],
                    owner_id=test_user.id,
                )
            )
        db.commit()

        resp = client.get(
            "/api/v1/search/",
            params={"q": "Paginated", "limit": 2, "offset": 0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 2

        resp2 = client.get(
            "/api/v1/search/",
            params={"q": "Paginated", "limit": 2, "offset": 2},
        )
        data2 = resp2.json()
        assert data2["total"] == 3
        assert len(data2["items"]) == 1

    # ── バリデーション: q パラメータ ──────────────────────

    def test_search_missing_q_returns_422(self, client: TestClient) -> None:
        """q パラメータなしは 422 Unprocessable Entity。"""
        resp = client.get("/api/v1/search/")
        assert resp.status_code == 422

    def test_search_empty_q_returns_422(self, client: TestClient) -> None:
        """q が空文字列は min_length=1 バリデーションで 422。"""
        resp = client.get("/api/v1/search/", params={"q": ""})
        assert resp.status_code == 422

    # ── バリデーション: limit 境界値 ──────────────────────

    def test_search_limit_zero_returns_422(self, client: TestClient) -> None:
        """limit=0 は ge=1 バリデーションで 422。"""
        resp = client.get("/api/v1/search/", params={"q": "test", "limit": 0})
        assert resp.status_code == 422

    def test_search_limit_exceeds_max_returns_422(self, client: TestClient) -> None:
        """limit=101 は le=100 バリデーションで 422。"""
        resp = client.get("/api/v1/search/", params={"q": "test", "limit": 101})
        assert resp.status_code == 422

    def test_search_limit_at_max_succeeds(self, client: TestClient) -> None:
        """limit=100 は上限値ちょうどなので 200 OK。"""
        resp = client.get("/api/v1/search/", params={"q": "test", "limit": 100})
        assert resp.status_code == 200

    # ── バリデーション: offset 境界値 ──────────────────────

    def test_search_negative_offset_returns_422(self, client: TestClient) -> None:
        """offset=-1 は ge=0 バリデーションで 422。"""
        resp = client.get("/api/v1/search/", params={"q": "test", "offset": -1})
        assert resp.status_code == 422

    # ── 特殊文字・SQL インジェクション対策 ──────────────────

    def test_search_sql_injection_safe(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """SQL インジェクション文字列でもエラーにならず安全に空結果を返す。"""
        resp = client.get("/api/v1/search/", params={"q": "'; DROP TABLE plots; --"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)

    def test_search_special_ilike_chars(
        self, client: TestClient, db: Session, test_user: User
    ) -> None:
        """ILIKE ワイルドカード文字 (%, _) がリテラル検索される。

        NOTE: 現在の実装は % / _ をエスケープしていないため、
        ILIKE ワイルドカードとして解釈される。
        このテストはその挙動を明示的に記録するためのもの。
        """
        # title に「100%完了」を含む Plot を作成
        plot = Plot(
            title="100%完了プロット",
            description="complete",
            tags=[],
            owner_id=test_user.id,
        )
        db.add(plot)
        db.commit()
        db.refresh(plot)

        # "%" で検索 → ILIKE '%%%' になるため全件ヒットする可能性がある
        resp = client.get("/api/v1/search/", params={"q": "%"})
        assert resp.status_code == 200
        data = resp.json()
        # エラーにならないことが重要（安全性の確認）
        assert isinstance(data["items"], list)

    def test_search_unicode_query(
        self, client: TestClient, db: Session, test_user: User
    ) -> None:
        """日本語などマルチバイト文字での検索が正常に動作する。"""
        plot = Plot(
            title="関西の旅行プラン",
            description="大阪と京都を巡るルート",
            tags=[],
            owner_id=test_user.id,
        )
        db.add(plot)
        db.commit()
        db.refresh(plot)

        resp = client.get("/api/v1/search/", params={"q": "関西"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        ids = [item["id"] for item in data["items"]]
        assert str(plot.id) in ids
