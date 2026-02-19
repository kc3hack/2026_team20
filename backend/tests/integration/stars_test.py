import pytest
from fastapi.testclient import TestClient


class TestGetStars:
    def test_get_stars(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_get_stars_empty(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")


class TestAddStar:
    def test_add_star(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        pytest.skip("TODO: implement")

    def test_add_star_duplicate(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_add_star_unauthorized(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")


class TestDeleteStar:
    def test_delete_star(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_delete_star_not_found(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")
