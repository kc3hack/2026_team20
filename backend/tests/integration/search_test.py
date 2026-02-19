import pytest
from fastapi.testclient import TestClient


class TestSearch:
    def test_search_plots(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_with_query(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_no_results(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_search_plots_with_pagination(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")
