"""Integration tests for /api/v1/auth endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Plot, User
from tests.conftest import TEST_USER_ID


class TestGetMe:
    """GET /api/v1/auth/me — AuthUser（認証必須）。"""

    def test_get_me(self, client: TestClient, test_user: User) -> None:
        """認証済みでユーザー情報取得 → 200。"""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(TEST_USER_ID)
        assert data["email"] == test_user.email
        assert data["displayName"] == test_user.display_name

    def test_get_me_unauthorized(self, unauthed_client: TestClient) -> None:
        """未認証でユーザー情報取得 → 401。"""
        resp = unauthed_client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestGetUserByUsername:
    """GET /api/v1/auth/users/{username} — 認証不要。"""

    def test_get_user_by_username(self, client: TestClient, test_user: User) -> None:
        """display_name でユーザー取得 → 200, plotCount と contributionCount を含む。"""
        resp = client.get(f"/api/v1/auth/users/{test_user.display_name}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(test_user.id)
        assert data["displayName"] == test_user.display_name
        assert "plotCount" in data
        assert "contributionCount" in data

    def test_get_user_by_username_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない username → 404。"""
        resp = client.get("/api/v1/auth/users/nonexistent_user_xyz")
        assert resp.status_code == 404


class TestGetUserPlots:
    """GET /api/v1/auth/users/{username}/plots — ユーザーのPlot一覧。"""

    def test_get_user_plots(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """Plot を持つユーザーの一覧取得 → 200, PlotListResponse 形式。"""
        resp = client.get(f"/api/v1/auth/users/{test_user.display_name}/plots")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert data["total"] >= 1
        assert any(item["id"] == str(test_plot.id) for item in data["items"])

    def test_get_user_plots_empty(self, client: TestClient, test_user: User) -> None:
        """Plot を持たないユーザーの一覧取得 → 200, 空リスト。"""
        resp = client.get(f"/api/v1/auth/users/{test_user.display_name}/plots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_user_plots_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しないユーザーのPlot一覧 → 404。"""
        resp = client.get("/api/v1/auth/users/nonexistent_user_xyz/plots")
        assert resp.status_code == 404


class TestGetUserContributions:
    """GET /api/v1/auth/users/{username}/contributions — ユーザーのコントリビューション一覧。"""

    def test_get_user_contributions(self, client: TestClient, test_user: User) -> None:
        """コントリビューション一覧取得 → 200, PlotListResponse 形式。"""
        resp = client.get(f"/api/v1/auth/users/{test_user.display_name}/contributions")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

    def test_get_user_contributions_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しないユーザーのコントリビューション一覧 → 404。"""
        resp = client.get("/api/v1/auth/users/nonexistent_user_xyz/contributions")
        assert resp.status_code == 404
