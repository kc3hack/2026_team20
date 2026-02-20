"""star_service のユニットテスト。"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Plot, User
from app.services import star_service


# 存在しない Plot ID（DB に INSERT されない UUID）
NON_EXISTENT_PLOT_ID = uuid.UUID("00000000-0000-4000-a000-ffffffffffff")


class TestListStars:
    def test_list_stars(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """スターが存在する場合、(Star, User) タプルのリストを返す。"""
        star_service.add_star(db, test_plot.id, test_user.id)
        result = star_service.list_stars(db, test_plot.id)
        assert len(result) == 1
        star, user = result[0]
        assert user.id == test_user.id

    def test_list_stars_contains_user_info(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """スター一覧にユーザー情報（displayName 相当）が含まれる。"""
        star_service.add_star(db, test_plot.id, test_user.id)
        result = star_service.list_stars(db, test_plot.id)
        _, user = result[0]
        assert user.display_name is not None
        assert user.display_name == "Test User"

    def test_list_stars_multiple_users(
        self, db: Session, test_plot: Plot, test_user: User, other_user: User
    ) -> None:
        """複数ユーザーがスターした場合、全員分のタプルが返る。"""
        star_service.add_star(db, test_plot.id, test_user.id)
        star_service.add_star(db, test_plot.id, other_user.id)
        result = star_service.list_stars(db, test_plot.id)
        assert len(result) == 2
        user_ids = {user.id for _, user in result}
        assert user_ids == {test_user.id, other_user.id}

    def test_list_stars_empty(self, db: Session, test_plot: Plot) -> None:
        """スターがない場合は空リスト。"""
        result = star_service.list_stars(db, test_plot.id)
        assert result == []

    def test_list_stars_plot_not_found(self, db: Session) -> None:
        """存在しない Plot のスター一覧を取得すると ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            star_service.list_stars(db, NON_EXISTENT_PLOT_ID)


class TestAddStar:
    def test_add_star(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """スターを正常に追加できる。"""
        star = star_service.add_star(db, test_plot.id, test_user.id)
        assert star.plot_id == test_plot.id
        assert star.user_id == test_user.id

    def test_add_star_duplicate(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """同じユーザーが二度スターすると ValueError（409 Conflict 相当）。"""
        star_service.add_star(db, test_plot.id, test_user.id)
        with pytest.raises(ValueError, match="Already starred"):
            star_service.add_star(db, test_plot.id, test_user.id)

    def test_add_star_plot_not_found(self, db: Session, test_user: User) -> None:
        """存在しない Plot にスターすると ValueError（404 相当）。"""
        with pytest.raises(ValueError, match="Plot not found"):
            star_service.add_star(db, NON_EXISTENT_PLOT_ID, test_user.id)


class TestRemoveStar:
    def test_remove_star(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """スターを正常に削除できる。"""
        star_service.add_star(db, test_plot.id, test_user.id)
        star_service.remove_star(db, test_plot.id, test_user.id)
        result = star_service.list_stars(db, test_plot.id)
        assert result == []

    def test_remove_star_not_found(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """スターしていない状態で削除すると ValueError（404 相当）。"""
        with pytest.raises(ValueError, match="Not starred"):
            star_service.remove_star(db, test_plot.id, test_user.id)

    def test_remove_star_plot_not_found(self, db: Session, test_user: User) -> None:
        """存在しない Plot のスターを削除すると ValueError（404 相当）。"""
        with pytest.raises(ValueError, match="Plot not found"):
            star_service.remove_star(db, NON_EXISTENT_PLOT_ID, test_user.id)
