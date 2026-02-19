import pytest
from fastapi.testclient import TestClient


class TestGetMe:
    def test_get_me(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        pytest.skip("TODO: implement")

    def test_get_me_unauthorized(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")


class TestGetUserByUsername:
    def test_get_user_by_username(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_get_user_by_username_not_found(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")
