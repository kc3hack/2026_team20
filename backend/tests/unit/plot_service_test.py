import pytest
from sqlalchemy.orm import Session

from app.models import Plot, User


class TestListPlots:
    def test_list_plots(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_list_plots_empty(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestCreatePlot:
    def test_create_plot(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_create_plot_missing_title(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")


class TestGetPlotDetail:
    def test_get_plot_detail(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_get_plot_detail_not_found(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestUpdatePlot:
    def test_update_plot(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_update_plot_not_found(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestDeletePlot:
    def test_delete_plot(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_delete_plot_not_found(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestListTrending:
    def test_list_trending(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestListPopular:
    def test_list_popular(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestListNew:
    def test_list_new(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestGetStarCount:
    def test_get_star_count(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")


class TestIsStarredBy:
    def test_is_starred_by(self, db: Session, test_plot: Plot, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_is_not_starred_by(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        pytest.skip("TODO: implement")
