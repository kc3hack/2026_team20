import pytest
from fastapi.testclient import TestClient


class TestFork:
    def test_create_fork(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_create_fork_not_found(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_create_fork_unauthorized(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")


class TestThreads:
    def test_create_thread(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_create_thread_unauthorized(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")


class TestComments:
    def test_get_comments(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")

    def test_create_comment(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        pytest.skip("TODO: implement")

    def test_create_comment_unauthorized(self, client: TestClient) -> None:
        pytest.skip("TODO: implement")
