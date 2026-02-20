"""search_service のユニットテスト。

NOTE: search_plots は ILIKE を使用しており、SQLite でも動作する。
tag 検索は @> 演算子が必要なため search_service には tag 検索機能はない。
"""

from sqlalchemy.orm import Session

from app.models import Plot, Star, User
from app.services import search_service


def _create_plot(
    db: Session,
    owner_id,
    title: str = "Plot",
    description: str | None = None,
) -> Plot:
    """テスト用 Plot を作成する共通ヘルパー。"""
    plot = Plot(title=title, description=description, tags=[], owner_id=owner_id)
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return plot


class TestSearchPlots:
    def test_search_plots_by_title(self, db: Session, test_plot: Plot) -> None:
        """タイトルに一致する Plot が検索結果に含まれる。"""
        items, total = search_service.search_plots(db, "Test")
        assert total >= 1
        plot_ids = [p.id for p, _ in items]
        assert test_plot.id in plot_ids

    def test_search_plots_by_description(self, db: Session, test_user: User) -> None:
        """description に一致する Plot が検索結果に含まれる。"""
        plot = Plot(
            title="Alpha",
            description="UniqueDescXYZ",
            tags=[],
            owner_id=test_user.id,
        )
        db.add(plot)
        db.commit()
        db.refresh(plot)

        items, total = search_service.search_plots(db, "UniqueDescXYZ")
        assert total == 1
        assert items[0][0].id == plot.id

    def test_search_plots_no_results(self, db: Session) -> None:
        """マッチしないクエリは空リストを返す。"""
        items, total = search_service.search_plots(db, "zzz_no_match_999")
        assert total == 0
        assert items == []

    def test_search_plots_empty_query(self, db: Session, test_user: User) -> None:
        """空文字クエリは全件マッチする（ILIKE '%%' → 全件）。"""
        Plot(title="A", tags=[], owner_id=test_user.id)
        db.add(Plot(title="A", tags=[], owner_id=test_user.id))
        db.commit()

        items, total = search_service.search_plots(db, "")
        assert total >= 1

    # ── limit / offset ページネーション ──

    def test_search_plots_limit(self, db: Session, test_user: User) -> None:
        """limit を指定すると返却件数が制限され、total は全件数を返す。"""
        for i in range(5):
            _create_plot(db, test_user.id, title=f"LimitTest {i}")

        items, total = search_service.search_plots(db, "LimitTest", limit=3)
        assert total == 5
        assert len(items) == 3

    def test_search_plots_offset(self, db: Session, test_user: User) -> None:
        """offset を指定するとその分だけスキップされる。"""
        for i in range(5):
            _create_plot(db, test_user.id, title=f"OffsetTest {i}")

        items, total = search_service.search_plots(db, "OffsetTest", offset=3)
        assert total == 5
        assert len(items) == 2  # 5件中 offset=3 → 残り2件

    def test_search_plots_limit_and_offset(self, db: Session, test_user: User) -> None:
        """limit と offset を組み合わせたページネーション。"""
        for i in range(10):
            _create_plot(db, test_user.id, title=f"Page {i}")

        items, total = search_service.search_plots(
            db,
            "Page",
            limit=3,
            offset=2,
        )
        assert total == 10
        assert len(items) == 3

    def test_search_plots_offset_beyond_total(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """offset が total を超えた場合は空リストを返す。"""
        _create_plot(db, test_user.id, title="BeyondOffset")

        items, total = search_service.search_plots(
            db,
            "BeyondOffset",
            offset=100,
        )
        assert total == 1
        assert items == []

    # ── 特殊文字を含むクエリ ──

    def test_search_plots_query_with_percent(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """クエリに SQL ワイルドカード '%' が含まれるケース。

        NOTE: 現在の実装は '%' をエスケープしないため、
        ILIKE パターンが '%%100%%%' となり意図せず全件マッチする可能性がある。
        このテストは現状の動作を記録する回帰テストとして機能する。
        """
        _create_plot(db, test_user.id, title="100% Complete")
        _create_plot(db, test_user.id, title="NormalTitle")

        items, total = search_service.search_plots(db, "100%")
        # '%' がワイルドカードとして解釈されるため少なくとも1件はマッチする
        assert total >= 1
        titles = [p.title for p, _ in items]
        assert "100% Complete" in titles

    def test_search_plots_query_with_underscore(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """クエリに SQL ワイルドカード '_' が含まれるケース。

        '_' は ILIKE で任意の1文字にマッチするため、
        エスケープなしでは意図しない結果になりうる。
        """
        _create_plot(db, test_user.id, title="item_one")
        _create_plot(db, test_user.id, title="itemXone")

        items, total = search_service.search_plots(db, "item_one")
        # '_' がワイルドカードとして解釈される場合、"itemXone" もマッチする
        assert total >= 1
        titles = [p.title for p, _ in items]
        assert "item_one" in titles

    # ── star_count の返却検証 ──

    def test_search_plots_returns_star_count(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """検索結果のタプル2番目に正しい star_count が返る。"""
        plot = _create_plot(db, test_user.id, title="StarCountTest")

        # スターを2つ追加（同一ユーザーからの重複を避けるため別ユーザーを作成）
        from tests.conftest import OTHER_USER_ID, OTHER_USER_EMAIL

        other = User(
            id=OTHER_USER_ID,
            email=OTHER_USER_EMAIL,
            display_name="Other",
        )
        db.add(other)
        db.commit()

        db.add(Star(plot_id=plot.id, user_id=test_user.id))
        db.add(Star(plot_id=plot.id, user_id=other.id))
        db.commit()

        items, total = search_service.search_plots(db, "StarCountTest")
        assert total == 1
        returned_plot, star_count = items[0]
        assert returned_plot.id == plot.id
        assert star_count == 2

    def test_search_plots_star_count_zero(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """スターがない Plot の star_count は 0 を返す。"""
        _create_plot(db, test_user.id, title="ZeroStarTest")

        items, _ = search_service.search_plots(db, "ZeroStarTest")
        assert len(items) == 1
        _, star_count = items[0]
        assert star_count == 0

    # ── ソート順 ──

    def test_search_plots_ordered_by_created_at_desc(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """検索結果は created_at の降順でソートされる。"""
        from datetime import datetime, timezone

        old_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        new_time = datetime(2025, 1, 1, tzinfo=timezone.utc)

        first = Plot(
            title="SortTest A",
            tags=[],
            owner_id=test_user.id,
            created_at=old_time,
        )
        second = Plot(
            title="SortTest B",
            tags=[],
            owner_id=test_user.id,
            created_at=new_time,
        )
        db.add_all([first, second])
        db.commit()
        db.refresh(first)
        db.refresh(second)

        items, _ = search_service.search_plots(db, "SortTest")
        assert len(items) == 2
        # 降順なので新しい方が先
        assert items[0][0].id == second.id
        assert items[1][0].id == first.id

    # ── 大文字小文字 ──

    def test_search_plots_case_insensitive(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """ILIKE 検索は大文字小文字を区別しない。"""
        _create_plot(db, test_user.id, title="CaseSensitiveTitle")

        items, total = search_service.search_plots(db, "casesensitivetitle")
        assert total == 1
        assert items[0][0].title == "CaseSensitiveTitle"

    # ── title と description の両方にマッチ ──

    def test_search_plots_matches_title_and_description(
        self,
        db: Session,
        test_user: User,
    ) -> None:
        """title と description の両方にマッチしても重複なく1件で返る。"""
        _create_plot(
            db,
            test_user.id,
            title="DualMatch",
            description="DualMatch in desc too",
        )

        items, total = search_service.search_plots(db, "DualMatch")
        assert total == 1
