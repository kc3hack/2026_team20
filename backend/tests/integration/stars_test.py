"""Integration tests for /api/v1/plots/{plot_id}/stars endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Plot, Star, User


class TestGetStars:
    """GET /plots/{plot_id}/stars — 認証不要。"""

    def test_get_stars(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """スター追加後にスター一覧取得 → 200, items にユーザー情報を含む。"""
        star = Star(plot_id=test_plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()

        resp = client.get(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["user"]["id"] == str(test_user.id)

    def test_get_stars_empty(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """スターなしの Plot のスター一覧 → 200, items 空。"""
        resp = client.get(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_get_stars_not_found_plot(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Plot のスター一覧 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/plots/{fake_id}/stars")
        assert resp.status_code == 404

    def test_get_stars_unauthenticated(
        self, unauthed_client: TestClient, test_plot: Plot
    ) -> None:
        """未認証でスター一覧取得 → 200（認証不要エンドポイント）。"""
        resp = unauthed_client.get(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []


class TestAddStar:
    """POST /plots/{plot_id}/stars — AuthUser。"""

    def test_add_star(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """認証済みでスター追加 → 201。"""
        resp = client.post(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 201

    def test_add_star_duplicate(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """既にスター済みで再度スター追加 → 409 Conflict。"""
        star = Star(plot_id=test_plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()

        resp = client.post(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 409

    def test_add_star_not_found_plot(self, client: TestClient, test_user: User) -> None:
        """存在しない Plot にスター追加 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.post(f"/api/v1/plots/{fake_id}/stars")
        assert resp.status_code == 404

    def test_add_star_unauthorized(
        self, unauthed_client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """未認証でスター追加 → 401 Unauthorized。"""
        resp = unauthed_client.post(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 401


class TestDeleteStar:
    """DELETE /plots/{plot_id}/stars — AuthUser。"""

    def test_delete_star(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """スター済みでスター削除 → 204。"""
        star = Star(plot_id=test_plot.id, user_id=test_user.id)
        db.add(star)
        db.commit()

        resp = client.delete(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 204

    def test_delete_star_not_found(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """スターしていない状態でスター削除 → 404。"""
        resp = client.delete(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 404

    def test_delete_star_not_found_plot(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Plot のスター削除 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.delete(f"/api/v1/plots/{fake_id}/stars")
        assert resp.status_code == 404

    def test_delete_star_unauthorized(
        self, unauthed_client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """未認証でスター削除 → 401 Unauthorized。"""
        resp = unauthed_client.delete(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 401


class TestStarCount:
    """スター追加・削除後にスター数が正しく反映されるか。"""

    def test_star_count_after_add_and_delete(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """スター追加後に total=1、削除後に total=0 となることを確認。"""
        # スター追加
        resp = client.post(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 201

        # 一覧取得 → total=1
        resp = client.get(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        # スター削除
        resp = client.delete(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 204

        # 一覧取得 → total=0
        resp = client.get(f"/api/v1/plots/{test_plot.id}/stars")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
