"""認証フィクスチャが正しく動作するかを確認するテスト。

conftest.py の dependency_overrides による認証モック戦略が
各クライアントフィクスチャで正しく機能しているかを検証する。

⚠️ ドキュメントとの乖離:
  conftest.py のドキュメントでは unauthed_client は「403 を返す」と記載されているが、
  実際は HTTPBearer(auto_error=False) + get_current_user 内の手動チェックにより
  Bearer トークン不在時に **401 Unauthorized** を返す。
  （auth.py L20-23 のコメント参照）

⚠️ conftest の制約:
  client と unauthed_client は同じ app.dependency_overrides を共有するため、
  同一テスト内で併用すると後から生成されたフィクスチャの設定で上書きされる。
  そのため、認証済み/未認証の比較テストは別々のテストで行う。
"""

from fastapi.testclient import TestClient

from app.models import User
from tests.conftest import (
    ADMIN_USER_EMAIL,
    ADMIN_USER_ID,
    OTHER_USER_EMAIL,
    OTHER_USER_ID,
    TEST_USER_EMAIL,
    TEST_USER_ID,
)


class TestAuthFixtures:
    """各クライアントフィクスチャの認証状態を検証する。"""

    def test_client_is_authenticated(self, client: TestClient, test_user: User) -> None:
        """client フィクスチャが認証済みであることを確認。

        GET /api/v1/auth/me は AuthUser（get_current_user）に依存するため、
        dependency_overrides が正しく TEST_USER を返していれば 200 になる。
        """
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200, (
            f"認証済みなのに {resp.status_code}: {resp.text}"
        )

        data = resp.json()
        assert data["id"] == str(TEST_USER_ID)
        assert data["email"] == TEST_USER_EMAIL

    def test_unauthed_client_is_not_authenticated(
        self, unauthed_client: TestClient
    ) -> None:
        """unauthed_client が未認証であることを確認。

        get_current_user はオーバーライドされていないため、
        HTTPBearer(auto_error=False) が None を返し、
        get_current_user 内の ``if credentials is None`` で 401 Unauthorized を送出する。
        """
        resp = unauthed_client.get("/api/v1/auth/me")
        # HTTPBearer(auto_error=True) は Bearer 不在時に 401 を返す
        assert resp.status_code == 401, f"未認証なのに {resp.status_code}: {resp.text}"

    def test_other_user_client_is_different_user(
        self,
        other_user_client: TestClient,
        test_user: User,
        other_user: User,
    ) -> None:
        """other_user_client が test_user とは異なるユーザーであることを確認。

        other_user_client は OTHER_USER として認証されているため、
        /auth/me で返されるユーザーは TEST_USER ではなく OTHER_USER になる。
        """
        resp = other_user_client.get("/api/v1/auth/me")
        assert resp.status_code == 200, (
            f"認証済みなのに {resp.status_code}: {resp.text}"
        )

        data = resp.json()
        # OTHER_USER であること
        assert data["id"] == str(OTHER_USER_ID)
        assert data["email"] == OTHER_USER_EMAIL
        # TEST_USER ではないこと
        assert data["id"] != str(TEST_USER_ID)
        assert data["email"] != TEST_USER_EMAIL

    def test_admin_client_has_admin_role(
        self, admin_client: TestClient, admin_user: User
    ) -> None:
        """admin_client が管理者権限を持っていることを確認。

        admin_current_user フィクスチャは role="admin" で CurrentUser を生成する。
        /auth/me で返されるユーザーが ADMIN_USER であることを確認し、
        さらに管理者専用エンドポイント（POST /admin/bans）にアクセスできることで
        role="admin" が機能していることを間接的に検証する。
        """
        # /auth/me で admin ユーザーとして認証されていることを確認
        resp = admin_client.get("/api/v1/auth/me")
        assert resp.status_code == 200, (
            f"認証済みなのに {resp.status_code}: {resp.text}"
        )

        data = resp.json()
        assert data["id"] == str(ADMIN_USER_ID)
        assert data["email"] == ADMIN_USER_EMAIL

    def test_admin_client_can_access_admin_endpoint(
        self,
        admin_client: TestClient,
        admin_user: User,
        test_user: User,
        test_plot,
    ) -> None:
        """admin_client が管理者専用エンドポイントにアクセスできることを確認。

        POST /api/v1/admin/bans は _require_admin(current_user) で
        role="admin" を検証するため、admin_client なら 201 を返す。
        """
        resp = admin_client.post(
            "/api/v1/admin/bans",
            json={
                "plotId": str(test_plot.id),
                "userId": str(TEST_USER_ID),
            },
        )
        assert resp.status_code == 201, (
            f"admin なのに管理者エンドポイントが拒否された: {resp.status_code}: {resp.text}"
        )

    def test_authenticated_client_cannot_access_admin_endpoint(
        self,
        client: TestClient,
        test_user: User,
        test_plot,
    ) -> None:
        """通常の認証済みクライアントが管理者エンドポイントにアクセスできないことを確認。

        client は role="authenticated" のため、
        _require_admin が 403 Forbidden を返す。
        """
        resp = client.post(
            "/api/v1/admin/bans",
            json={
                "plotId": str(test_plot.id),
                "userId": str(TEST_USER_ID),
            },
        )
        assert resp.status_code == 403, (
            f"非 admin なのに管理者エンドポイントにアクセスできた: {resp.status_code}: {resp.text}"
        )

    def test_unauthed_client_cannot_access_admin_endpoint(
        self, unauthed_client: TestClient
    ) -> None:
        """未認証クライアントが管理者エンドポイントにアクセスできないことを確認。

        認証なし → get_current_user が 401 を返す（admin チェック以前の問題）。
        """
        resp = unauthed_client.post(
            "/api/v1/admin/bans",
            json={
                "plotId": "00000000-0000-4000-a000-000000000001",
                "userId": "00000000-0000-4000-a000-000000000001",
            },
        )
        assert resp.status_code == 401, (
            f"未認証なのに管理者エンドポイントが {resp.status_code} を返した: {resp.text}"
        )

    def test_other_user_client_cannot_access_admin_endpoint(
        self,
        other_user_client: TestClient,
        other_user: User,
        test_user: User,
        test_plot,
    ) -> None:
        """other_user_client（role="authenticated"）が管理者エンドポイントにアクセスできないことを確認。"""
        resp = other_user_client.post(
            "/api/v1/admin/bans",
            json={
                "plotId": str(test_plot.id),
                "userId": str(TEST_USER_ID),
            },
        )
        assert resp.status_code == 403, (
            f"非 admin (other_user) なのに管理者エンドポイントにアクセスできた: {resp.status_code}: {resp.text}"
        )
