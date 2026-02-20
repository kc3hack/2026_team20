"""Social endpoints integration tests: フォーク・スレッド・コメント。

テスト対象:
- POST /api/v1/plots/{plot_id}/fork  (要認証)
- POST /api/v1/threads               (要認証)
- GET  /api/v1/threads/{thread_id}/comments
- POST /api/v1/threads/{thread_id}/comments (要認証)
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Comment, Plot, Section, Thread, User


class TestFork:
    def test_create_fork(
        self,
        client: TestClient,
        test_user: User,
        test_plot: Plot,
        test_section: Section,
    ) -> None:
        """認証済みユーザーが Plot をフォークできる。"""
        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/fork",
            json={"title": "My Fork"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My Fork"
        # フォークは自分のものになる（PlotResponse は ownerId を返す）
        assert data["ownerId"] == str(test_user.id)

    def test_create_fork_title_omitted(
        self,
        client: TestClient,
        test_user: User,
        test_plot: Plot,
    ) -> None:
        """title 省略時は元タイトル + " (fork)" が付与される（api.md: title 省略可）。"""
        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/fork",
            json={},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == f"{test_plot.title} (fork)"
        assert data["ownerId"] == str(test_user.id)

    def test_create_fork_not_found(self, client: TestClient) -> None:
        """存在しない Plot のフォークは 404。"""
        fake_id = uuid.uuid4()
        resp = client.post(
            f"/api/v1/plots/{fake_id}/fork",
            json={"title": "Fork"},
        )
        assert resp.status_code == 404

    def test_create_fork_unauthorized(
        self, unauthed_client: TestClient, test_plot: Plot
    ) -> None:
        """未認証ユーザーはフォークできない (401)。"""
        resp = unauthed_client.post(
            f"/api/v1/plots/{test_plot.id}/fork",
            json={"title": "Fork"},
        )
        assert resp.status_code == 401


class TestThreads:
    def test_create_thread(self, client: TestClient, test_plot: Plot) -> None:
        """認証済みユーザーがスレッドを作成できる。"""
        resp = client.post(
            "/api/v1/threads",
            json={"plotId": str(test_plot.id)},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["plotId"] == str(test_plot.id)
        assert data["sectionId"] is None

    def test_create_thread_with_section(
        self, client: TestClient, test_plot: Plot, test_section: Section
    ) -> None:
        """sectionId を指定してスレッドを作成できる（api.md: sectionId 省略可）。"""
        resp = client.post(
            "/api/v1/threads",
            json={
                "plotId": str(test_plot.id),
                "sectionId": str(test_section.id),
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["plotId"] == str(test_plot.id)
        assert data["sectionId"] == str(test_section.id)

    def test_create_thread_plot_not_found(self, client: TestClient) -> None:
        """存在しない Plot でスレッド作成は 404。"""
        fake_id = uuid.uuid4()
        resp = client.post(
            "/api/v1/threads",
            json={"plotId": str(fake_id)},
        )
        assert resp.status_code == 404

    def test_create_thread_unauthorized(
        self, unauthed_client: TestClient, test_plot: Plot
    ) -> None:
        """未認証ユーザーはスレッドを作成できない (401)。"""
        resp = unauthed_client.post(
            "/api/v1/threads",
            json={"plotId": str(test_plot.id)},
        )
        assert resp.status_code == 401


class TestComments:
    def test_get_comments_empty(
        self, client: TestClient, db: Session, test_plot: Plot
    ) -> None:
        """スレッドのコメント一覧を取得できる（空）。"""
        # スレッドを直接 DB に作成
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        resp = client.get(f"/api/v1/threads/{thread.id}/comments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_comments_thread_not_found(self, client: TestClient) -> None:
        """存在しない Thread のコメント一覧は 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/threads/{fake_id}/comments")
        assert resp.status_code == 404

    def test_get_comments_pagination(
        self, client: TestClient, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """limit / offset でページネーションできる（api.md: limit=50, offset）。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        # 3件のコメントを作成
        for i in range(3):
            comment = Comment(
                thread_id=thread.id,
                user_id=test_user.id,
                content=f"Comment {i}",
            )
            db.add(comment)
        db.commit()

        # limit=2 で先頭 2 件取得
        resp = client.get(
            f"/api/v1/threads/{thread.id}/comments",
            params={"limit": 2, "offset": 0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

        # offset=2 で残り 1 件取得
        resp = client.get(
            f"/api/v1/threads/{thread.id}/comments",
            params={"limit": 2, "offset": 2},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["total"] == 3

    def test_create_comment(
        self, client: TestClient, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """認証済みユーザーがコメントを投稿できる。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        resp = client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": "Hello, world!"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Hello, world!"
        assert data["threadId"] == str(thread.id)
        assert data["user"]["id"] == str(test_user.id)
        # parentCommentId 省略時は null
        assert data["parentCommentId"] is None

    def test_create_reply_comment(
        self, client: TestClient, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """parentCommentId を指定して返信コメントを作成できる（api.md: parentCommentId 省略可）。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        # 親コメントを作成
        parent_resp = client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": "Parent comment"},
        )
        assert parent_resp.status_code == 201
        parent_id = parent_resp.json()["id"]

        # 返信コメントを作成
        resp = client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": "Reply", "parentCommentId": parent_id},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Reply"
        assert data["parentCommentId"] == parent_id

    def test_create_comment_max_5000_chars(
        self, client: TestClient, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """ちょうど 5000 文字のコメントは成功する（境界値）。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        content = "a" * 5000
        resp = client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": content},
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == content

    def test_create_comment_exceeds_5000_chars(
        self, client: TestClient, db: Session, test_user: User, test_plot: Plot
    ) -> None:
        """5001 文字のコメントは 400 Bad Request（api.md: max 5000）。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        content = "a" * 5001
        resp = client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": content},
        )
        assert resp.status_code == 400

    def test_create_comment_thread_not_found(self, client: TestClient) -> None:
        """存在しない Thread へのコメント投稿は 404。"""
        fake_id = uuid.uuid4()
        resp = client.post(
            f"/api/v1/threads/{fake_id}/comments",
            json={"content": "Should fail"},
        )
        assert resp.status_code == 404

    def test_create_comment_unauthorized(
        self, unauthed_client: TestClient, db: Session, test_plot: Plot
    ) -> None:
        """未認証ユーザーはコメントを投稿できない (401)。"""
        thread = Thread(plot_id=test_plot.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

        resp = unauthed_client.post(
            f"/api/v1/threads/{thread.id}/comments",
            json={"content": "Should fail"},
        )
        assert resp.status_code == 401
