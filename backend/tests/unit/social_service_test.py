import pytest
from sqlalchemy.orm import Session

from app.models import Plot, User


class TestCreateFork:
    def test_create_fork(self, db: Session, test_plot: Plot, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_create_fork_not_found(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")


class TestCreateThread:
    def test_create_thread(self, db: Session, test_plot: Plot) -> None:
        pytest.skip("TODO: implement")

    def test_create_thread_with_section(
        self, db: Session, test_plot: Plot, test_section
    ) -> None:
        pytest.skip("TODO: implement")


class TestListComments:
    def test_list_comments(self, db: Session) -> None:
        pytest.skip("TODO: implement")

    def test_list_comments_empty(self, db: Session) -> None:
        pytest.skip("TODO: implement")


class TestCreateComment:
    def test_create_comment(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")

    def test_create_comment_reply(self, db: Session, test_user: User) -> None:
        pytest.skip("TODO: implement")
