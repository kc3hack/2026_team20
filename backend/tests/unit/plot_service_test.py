"""plot_service のユニットテスト。

サービス関数を直接呼び出し、DB レベルの振る舞いを検証する。
NOTE: list_plots の tag フィルタは PostgreSQL 固有演算子 (@>) を使うため SQLite ではスキップ。
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Plot, Star, User
from app.services import plot_service


class TestListPlots:
    def test_list_plots(self, db: Session, test_user: User) -> None:
        """Plot が存在する場合、リストとして返される。"""
        plot_service.create_plot(db, test_user.id, "Plot A")
        plot_service.create_plot(db, test_user.id, "Plot B")

        plots, total = plot_service.list_plots(db)
        assert total == 2
        assert len(plots) == 2

    def test_list_plots_empty(self, db: Session) -> None:
        """Plot が存在しない場合、空リストを返す。"""
        plots, total = plot_service.list_plots(db)
        assert total == 0
        assert plots == []

    def test_list_plots_with_limit(self, db: Session, test_user: User) -> None:
        """limit パラメータで取得件数を制限できる。"""
        for i in range(5):
            plot_service.create_plot(db, test_user.id, f"Plot {i}")

        plots, total = plot_service.list_plots(db, limit=3)
        assert total == 5  # total は全件数
        assert len(plots) == 3  # limit で制限

    def test_list_plots_with_offset(self, db: Session, test_user: User) -> None:
        """offset パラメータで取得開始位置をずらせる。"""
        for i in range(5):
            plot_service.create_plot(db, test_user.id, f"Plot {i}")

        plots, total = plot_service.list_plots(db, limit=2, offset=3)
        assert total == 5
        assert len(plots) == 2  # 残り2件

    def test_list_plots_default_limit_is_20(self, db: Session, test_user: User) -> None:
        """デフォルト limit は 20（api.md 仕様: default=20）。"""
        for i in range(25):
            plot_service.create_plot(db, test_user.id, f"Plot {i}")

        plots, total = plot_service.list_plots(db)
        assert total == 25
        assert len(plots) == 20  # デフォルト limit=20


class TestCreatePlot:
    def test_create_plot(self, db: Session, test_user: User) -> None:
        """正常に Plot を作成できる。"""
        plot = plot_service.create_plot(
            db, test_user.id, "New Plot", description="desc", tags=["a", "b"]
        )
        assert plot.title == "New Plot"
        assert plot.description == "desc"
        assert plot.tags == ["a", "b"]
        assert plot.owner_id == test_user.id

    def test_create_plot_with_thumbnail_url(self, db: Session, test_user: User) -> None:
        """thumbnailUrl 付きで Plot を作成できる（api.md 仕様: thumbnailUrl フィールド）。"""
        plot = plot_service.create_plot(
            db,
            test_user.id,
            "With Thumbnail",
            thumbnail_url="/api/v1/images/test.jpg",
        )
        assert plot.thumbnail_url == "/api/v1/images/test.jpg"

    def test_create_plot_missing_title(self, db: Session, test_user: User) -> None:
        """title が空文字でも作成はできる（DB レベルの NOT NULL のみ制約）。"""
        # サービス層では title のバリデーションなし → DB が NOT NULL をチェック
        # 空文字は NULL ではないので作成可能
        plot = plot_service.create_plot(db, test_user.id, "")
        assert plot.title == ""

    def test_create_plot_title_max_200_chars(
        self, db: Session, test_user: User
    ) -> None:
        """title 200文字は作成可能（境界値: 最大200文字 OK）。"""
        title_200 = "a" * 200
        plot = plot_service.create_plot(db, test_user.id, title_200)
        assert len(plot.title) == 200

    def test_create_plot_description_max_2000_chars(
        self, db: Session, test_user: User
    ) -> None:
        """description 2000文字は作成可能（境界値: 最大2000文字 OK）。"""
        desc_2000 = "b" * 2000
        plot = plot_service.create_plot(
            db, test_user.id, "Title", description=desc_2000
        )
        assert plot.description is not None
        assert len(plot.description) == 2000

    def test_create_plot_defaults(self, db: Session, test_user: User) -> None:
        """省略可能フィールドのデフォルト値を確認する。"""
        plot = plot_service.create_plot(db, test_user.id, "Minimal")
        assert plot.description is None
        assert plot.tags == []
        assert plot.thumbnail_url is None


class TestGetPlotDetail:
    def test_get_plot_detail(self, db: Session, test_plot: Plot) -> None:
        """存在する Plot の詳細を取得できる。"""
        result = plot_service.get_plot_detail(db, test_plot.id)
        assert result.id == test_plot.id
        assert result.title == test_plot.title

    def test_get_plot_detail_not_found(self, db: Session) -> None:
        """存在しない Plot ID は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            plot_service.get_plot_detail(db, uuid.uuid4())


class TestUpdatePlot:
    def test_update_plot(self, db: Session, test_plot: Plot) -> None:
        """作成者が Plot を更新できる。"""
        updated = plot_service.update_plot(
            db, test_plot.id, test_plot.owner_id, title="Updated"
        )
        assert updated.title == "Updated"

    def test_update_plot_not_found(self, db: Session) -> None:
        """存在しない Plot の更新は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            plot_service.update_plot(db, uuid.uuid4(), uuid.uuid4(), title="X")

    def test_update_plot_forbidden(self, db: Session, test_plot: Plot) -> None:
        """作成者以外が Plot を更新しようとすると ValueError("Forbidden")。"""
        other_user_id = uuid.uuid4()
        with pytest.raises(ValueError, match="Forbidden"):
            plot_service.update_plot(db, test_plot.id, other_user_id, title="Hacked")


class TestDeletePlot:
    def test_delete_plot(self, db: Session, test_plot: Plot) -> None:
        """作成者が Plot を削除できる。"""
        plot_service.delete_plot(db, test_plot.id, test_plot.owner_id)
        # 削除後は取得できない
        with pytest.raises(ValueError, match="Plot not found"):
            plot_service.get_plot_detail(db, test_plot.id)

    def test_delete_plot_not_found(self, db: Session) -> None:
        """存在しない Plot の削除は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            plot_service.delete_plot(db, uuid.uuid4(), uuid.uuid4())

    def test_delete_plot_forbidden(self, db: Session, test_plot: Plot) -> None:
        """作成者以外が Plot を削除しようとすると ValueError("Forbidden")。"""
        other_user_id = uuid.uuid4()
        with pytest.raises(ValueError, match="Forbidden"):
            plot_service.delete_plot(db, test_plot.id, other_user_id)


class TestListTrending:
    def test_list_trending(self, db: Session, test_user: User) -> None:
        """直近のスターがある Plot がトレンドに含まれる。"""
        plot = plot_service.create_plot(db, test_user.id, "Trending")
        star = Star(plot_id=plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()

        result = plot_service.list_trending(db)
        assert len(result) >= 1
        ids = [p.id for p in result]
        assert plot.id in ids

    def test_list_trending_empty(self, db: Session) -> None:
        """スターがない場合、空リストを返す。"""
        result = plot_service.list_trending(db)
        assert result == []

    def test_list_trending_default_limit_is_5(
        self, db: Session, test_user: User
    ) -> None:
        """デフォルト limit は 5（api.md 仕様: default=5）。"""
        for i in range(7):
            p = plot_service.create_plot(db, test_user.id, f"T{i}")
            star = Star(plot_id=p.id, user_id=test_user.id)
            db.add(star)
        db.commit()

        result = plot_service.list_trending(db)
        assert len(result) == 5  # デフォルト limit=5

    def test_list_trending_custom_limit(self, db: Session, test_user: User) -> None:
        """limit パラメータでトレンド取得件数を変更できる。"""
        for i in range(5):
            p = plot_service.create_plot(db, test_user.id, f"T{i}")
            star = Star(plot_id=p.id, user_id=test_user.id)
            db.add(star)
        db.commit()

        result = plot_service.list_trending(db, limit=2)
        assert len(result) == 2


class TestListPopular:
    def test_list_popular(self, db: Session, test_user: User) -> None:
        """スターがある Plot が人気リストに含まれる。"""
        plot = plot_service.create_plot(db, test_user.id, "Popular")
        star = Star(plot_id=plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()

        result = plot_service.list_popular(db)
        assert len(result) >= 1

    def test_list_popular_empty(self, db: Session) -> None:
        """Plot がない場合、空リストを返す。"""
        result = plot_service.list_popular(db)
        assert result == []

    def test_list_popular_default_limit_is_5(
        self, db: Session, test_user: User
    ) -> None:
        """デフォルト limit は 5（api.md 仕様: default=5）。"""
        for i in range(7):
            plot_service.create_plot(db, test_user.id, f"P{i}")

        result = plot_service.list_popular(db)
        assert len(result) == 5  # デフォルト limit=5

    def test_list_popular_custom_limit(self, db: Session, test_user: User) -> None:
        """limit パラメータで人気リスト取得件数を変更できる。"""
        for i in range(5):
            plot_service.create_plot(db, test_user.id, f"P{i}")

        result = plot_service.list_popular(db, limit=3)
        assert len(result) == 3


class TestListNew:
    def test_list_new(self, db: Session, test_user: User) -> None:
        """最新 Plot が返される。"""
        plot_service.create_plot(db, test_user.id, "New 1")
        plot_service.create_plot(db, test_user.id, "New 2")

        result = plot_service.list_new(db)
        assert len(result) >= 2

    def test_list_new_empty(self, db: Session) -> None:
        """Plot がない場合、空リストを返す。"""
        result = plot_service.list_new(db)
        assert result == []

    def test_list_new_default_limit_is_5(self, db: Session, test_user: User) -> None:
        """デフォルト limit は 5（api.md 仕様: default=5）。"""
        for i in range(7):
            plot_service.create_plot(db, test_user.id, f"N{i}")

        result = plot_service.list_new(db)
        assert len(result) == 5  # デフォルト limit=5

    def test_list_new_custom_limit(self, db: Session, test_user: User) -> None:
        """limit パラメータで新規リスト取得件数を変更できる。"""
        for i in range(5):
            plot_service.create_plot(db, test_user.id, f"N{i}")

        result = plot_service.list_new(db, limit=2)
        assert len(result) == 2


class TestGetStarCount:
    def test_get_star_count(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """スター数を正しくカウントできる。"""
        assert plot_service.get_star_count(db, test_plot.id) == 0
        star = Star(plot_id=test_plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()
        assert plot_service.get_star_count(db, test_plot.id) == 1


class TestIsStarredBy:
    def test_is_starred_by(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """スター済みユーザーは True を返す。"""
        star = Star(plot_id=test_plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()
        assert plot_service.is_starred_by(db, test_plot.id, test_user.id) is True

    def test_is_not_starred_by(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """スター未済ユーザーは False を返す。"""
        assert plot_service.is_starred_by(db, test_plot.id, test_user.id) is False

    def test_is_starred_by_none_user(self, db: Session, test_plot: Plot) -> None:
        """user_id が None の場合は常に False を返す（未認証ユーザー対応）。"""
        assert plot_service.is_starred_by(db, test_plot.id, None) is False
