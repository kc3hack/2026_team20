import pytest
from sqlalchemy.orm import Session

from app.models import Plot, User


class TestSearchPlots:
    def test_search_plots_by_title(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_by_tag(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_no_results(self, db: Session) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_empty_query(self, db: Session) -> None:
        pytest.skip("TODO: implement")
