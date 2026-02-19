import pytest
from sqlalchemy.orm import Session

from app.models import Plot, User


class TestListStars:
    def test_list_stars(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_list_stars_empty(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")


class TestAddStar:
    def test_add_star(self, db: Session, test_plot: Plot, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_add_star_duplicate(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        pytest.skip("TODO: implement")


class TestRemoveStar:
    def test_remove_star(self, db: Session, test_plot: Plot, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_remove_star_not_found(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        pytest.skip("TODO: implement")
