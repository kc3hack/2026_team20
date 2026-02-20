"""social_service のユニットテスト。"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Plot, Section, Thread, User
from app.services import social_service


class TestCreateFork:
    def test_create_fork(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """Plot をフォークできる。新しい Plot + Fork レコードが作成される。"""
        new_plot = social_service.fork_plot(
            db, test_plot.id, test_user.id, title="Forked"
        )
        assert new_plot.title == "Forked"
        assert new_plot.owner_id == test_user.id
        assert new_plot.id != test_plot.id

    def test_create_fork_title_omitted(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """title 省略時はデフォルトタイトル「{元タイトル} (fork)」になる。"""
        new_plot = social_service.fork_plot(db, test_plot.id, test_user.id)
        assert new_plot.title == f"{test_plot.title} (fork)"

    def test_create_fork_not_found(self, db: Session, test_user: User) -> None:
        """存在しない Plot のフォークは ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            social_service.fork_plot(db, uuid.uuid4(), test_user.id)


class TestCreateThread:
    def test_create_thread(self, db: Session, test_plot: Plot) -> None:
        """スレッドを作成できる（section なし）。"""
        thread = social_service.create_thread(db, test_plot.id)
        assert thread.plot_id == test_plot.id
        assert thread.section_id is None

    def test_create_thread_with_section(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """section_id 付きでスレッドを作成できる。"""
        thread = social_service.create_thread(
            db, test_plot.id, section_id=test_section.id
        )
        assert thread.section_id == test_section.id

    def test_create_thread_plot_not_found(self, db: Session) -> None:
        """存在しない Plot へのスレッド作成は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            social_service.create_thread(db, uuid.uuid4())

    def test_create_thread_section_not_found(
        self, db: Session, test_plot: Plot
    ) -> None:
        """存在しない Section を指定したスレッド作成は ValueError。"""
        with pytest.raises(ValueError, match="Section not found"):
            social_service.create_thread(db, test_plot.id, section_id=uuid.uuid4())


class TestListComments:
    def test_list_comments(self, db: Session, test_user: User, test_plot: Plot) -> None:
        """コメントがある場合、リストとして返される。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        social_service.create_comment(db, thread.id, test_user.id, "Comment 1")
        items, total = social_service.list_comments(db, thread.id)
        assert total == 1
        assert len(items) == 1
        comment, user = items[0]
        assert comment.content == "Comment 1"

    def test_list_comments_empty(self, db: Session, test_plot: Plot) -> None:
        """コメントがない場合は空リスト。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        items, total = social_service.list_comments(db, thread.id)
        assert total == 0
        assert items == []

    def test_list_comments_thread_not_found(self, db: Session) -> None:
        """存在しない Thread のコメント一覧取得は ValueError。"""
        with pytest.raises(ValueError, match="Thread not found"):
            social_service.list_comments(db, uuid.uuid4())

    def test_list_comments_with_limit_offset(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """limit / offset によるページネーションが正しく動作する。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        # 3件のコメントを作成
        for i in range(3):
            social_service.create_comment(db, thread.id, test_user.id, f"Comment {i}")

        # limit=2, offset=0 → 先頭2件
        items, total = social_service.list_comments(db, thread.id, limit=2, offset=0)
        assert total == 3
        assert len(items) == 2

        # limit=2, offset=2 → 残り1件
        items, total = social_service.list_comments(db, thread.id, limit=2, offset=2)
        assert total == 3
        assert len(items) == 1


class TestCreateComment:
    def test_create_comment(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """コメントを正常に投稿できる。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        comment, user = social_service.create_comment(
            db, thread.id, test_user.id, "Hello"
        )
        assert comment.content == "Hello"
        assert comment.thread_id == thread.id
        assert user is not None
        assert user.id == test_user.id

    def test_create_comment_reply(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """親コメント ID 付きで返信コメントを投稿できる。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        parent, _ = social_service.create_comment(db, thread.id, test_user.id, "Parent")
        reply, _ = social_service.create_comment(
            db, thread.id, test_user.id, "Reply", parent_comment_id=parent.id
        )
        assert reply.parent_comment_id == parent.id

    def test_create_comment_max_length(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """5000文字ちょうどのコメントは投稿できる。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        content = "a" * 5000
        comment, _ = social_service.create_comment(db, thread.id, test_user.id, content)
        assert len(comment.content) == 5000

    def test_create_comment_exceeds_max_length(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """5000文字を超えるコメントは ValueError。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        content = "a" * 5001
        with pytest.raises(ValueError, match="Content exceeds 5000 characters"):
            social_service.create_comment(db, thread.id, test_user.id, content)

    def test_create_comment_thread_not_found(
        self, db: Session, test_user: User
    ) -> None:
        """存在しない Thread へのコメント投稿は ValueError。"""
        with pytest.raises(ValueError, match="Thread not found"):
            social_service.create_comment(db, uuid.uuid4(), test_user.id, "Hello")

    def test_create_comment_parent_not_found(
        self, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """存在しない親コメント ID を指定した返信は ValueError。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        with pytest.raises(ValueError, match="Parent comment not found"):
            social_service.create_comment(
                db,
                thread.id,
                test_user.id,
                "Reply",
                parent_comment_id=uuid.uuid4(),
            )
