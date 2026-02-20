"""Integration tests for /api/v1 history endpoints.

SQLite 制約:
- record_operation は .returning() を使用するため SQLite では動作しない。
  → 操作ログ作成テストは DB 直接挿入で代替する。
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ColdSnapshot, HotOperation, Plot, RollbackLog, Section, User
from tests.conftest import TEST_USER_ID


class TestPostOperations:
    """POST /api/v1/sections/{section_id}/operations — AuthUser。

    NOTE: SQLite は RETURNING 句をサポートしないため、
    実際のエンドポイント呼び出しは失敗する可能性がある。
    ここではエンドポイントの認証・バリデーションのみテストする。
    """

    def test_create_operation_unauthorized(
        self, unauthed_client: TestClient, test_user: User, test_section: Section
    ) -> None:
        """未認証で操作ログ作成 → 401。

        api.md 準拠: 認証なしのリクエストは 401 Unauthorized を返す。
        """
        resp = unauthed_client.post(
            f"/api/v1/sections/{test_section.id}/operations",
            json={"operationType": "insert", "position": 0, "content": "hello"},
        )
        assert resp.status_code == 401

    def test_create_operation_section_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Section に操作ログ作成 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.post(
            f"/api/v1/sections/{fake_id}/operations",
            json={"operationType": "insert", "position": 0, "content": "hello"},
        )
        assert resp.status_code == 404


class TestGetHistory:
    """GET /api/v1/sections/{section_id}/history — 認証不要。"""

    def test_get_history(
        self, client: TestClient, test_user: User, test_section: Section, db: Session
    ) -> None:
        """操作ログ存在時に履歴取得 → 200, items を含む。"""
        op = HotOperation(
            section_id=test_section.id,
            operation_type="insert",
            payload={"position": 0, "content": "test"},
            user_id=test_user.id,
            version=1,
        )
        db.add(op)
        db.commit()

        resp = client.get(f"/api/v1/sections/{test_section.id}/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    def test_get_history_empty(
        self, client: TestClient, test_user: User, test_section: Section
    ) -> None:
        """操作ログなしで履歴取得 → 200, items 空。"""
        resp = client.get(f"/api/v1/sections/{test_section.id}/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_get_history_section_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Section の履歴取得 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/sections/{fake_id}/history")
        assert resp.status_code == 404

    def test_get_history_with_limit_offset(
        self, client: TestClient, test_user: User, test_section: Section, db: Session
    ) -> None:
        """limit/offset パラメータで履歴のページネーション → 200。"""
        for i in range(3):
            op = HotOperation(
                section_id=test_section.id,
                operation_type="insert",
                payload={"position": i, "content": f"test{i}"},
                user_id=test_user.id,
                version=i + 1,
            )
            db.add(op)
        db.commit()

        resp = client.get(
            f"/api/v1/sections/{test_section.id}/history?limit=2&offset=0"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 2

        resp2 = client.get(
            f"/api/v1/sections/{test_section.id}/history?limit=2&offset=2"
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert len(data2["items"]) == 1


class TestGetDiff:
    """GET /api/v1/sections/{section_id}/diff/{from}/{to} — 認証不要。"""

    def test_get_diff(
        self, client: TestClient, test_user: User, test_section: Section, db: Session
    ) -> None:
        """2つのスナップショットバージョン間の差分取得 → 200。"""
        snap1 = ColdSnapshot(
            plot_id=test_section.plot_id,
            version=1,
            content={
                "plot": {"title": "Test"},
                "sections": [
                    {
                        "id": str(test_section.id),
                        "title": "Test Section",
                        "content": {
                            "type": "doc",
                            "content": [{"type": "text", "text": "v1"}],
                        },
                        "orderIndex": 0,
                    }
                ],
            },
        )
        snap2 = ColdSnapshot(
            plot_id=test_section.plot_id,
            version=2,
            content={
                "plot": {"title": "Test"},
                "sections": [
                    {
                        "id": str(test_section.id),
                        "title": "Test Section",
                        "content": {
                            "type": "doc",
                            "content": [{"type": "text", "text": "v2"}],
                        },
                        "orderIndex": 0,
                    }
                ],
            },
        )
        db.add_all([snap1, snap2])
        db.commit()

        resp = client.get(f"/api/v1/sections/{test_section.id}/diff/1/2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["fromVersion"] == 1
        assert data["toVersion"] == 2

    def test_get_diff_not_found(
        self, client: TestClient, test_user: User, test_section: Section
    ) -> None:
        """スナップショットが存在しないバージョンの差分取得 → 404。"""
        resp = client.get(f"/api/v1/sections/{test_section.id}/diff/999/1000")
        assert resp.status_code == 404

    def test_get_diff_section_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Section の差分取得 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/sections/{fake_id}/diff/1/2")
        assert resp.status_code == 404


class TestSnapshots:
    """GET /api/v1/plots/{plot_id}/snapshots — 認証不要。"""

    def test_get_snapshots(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """スナップショット一覧取得 → 200。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id, version=1, content={"plot": {}, "sections": []}
        )
        db.add(snap)
        db.commit()

        resp = client.get(f"/api/v1/plots/{test_plot.id}/snapshots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_get_snapshots_empty(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """スナップショットなしで一覧取得 → 200, items 空。"""
        resp = client.get(f"/api/v1/plots/{test_plot.id}/snapshots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_get_snapshots_plot_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Plot のスナップショット一覧 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/plots/{fake_id}/snapshots")
        assert resp.status_code == 404

    def test_get_snapshot_detail(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """スナップショット詳細取得 → 200。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {"title": "Test"}, "sections": []},
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        resp = client.get(f"/api/v1/plots/{test_plot.id}/snapshots/{snap.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == 1
        assert data["plotId"] == str(test_plot.id)

    def test_get_snapshot_detail_not_found(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """存在しないスナップショットの詳細取得 → 404。"""
        fake_snap_id = uuid.uuid4()
        resp = client.get(f"/api/v1/plots/{test_plot.id}/snapshots/{fake_snap_id}")
        assert resp.status_code == 404


class TestRollback:
    """POST /api/v1/plots/{plot_id}/rollback/{snapshot_id} — AuthUser。"""

    def test_rollback(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """スナップショットへのロールバック → 200, Plot の内容が復元される。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={
                "plot": {"title": "Rolled Back Title", "description": "restored"},
                "sections": [
                    {
                        "title": "Restored Section",
                        "content": {"type": "doc", "content": []},
                        "orderIndex": 0,
                        "version": 1,
                    }
                ],
            },
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/rollback/{snap.id}",
            json={
                "expectedVersion": test_plot.version,
                "reason": "test rollback",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Rolled Back Title"

    def test_rollback_not_found(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """存在しないスナップショットへのロールバック → 404。"""
        fake_snap_id = uuid.uuid4()
        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/rollback/{fake_snap_id}",
            json={},
        )
        assert resp.status_code == 404

    def test_rollback_version_conflict(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """バージョン不一致でロールバック → 409 Conflict。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={
                "plot": {"title": "Snapshot Title"},
                "sections": [],
            },
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        # expectedVersion に現在と異なる値を指定して 409 を誘発
        wrong_version = test_plot.version + 999
        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/rollback/{snap.id}",
            json={
                "expectedVersion": wrong_version,
                "reason": "should conflict",
            },
        )
        assert resp.status_code == 409

    def test_rollback_unauthorized(
        self, unauthed_client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """未認証でロールバック → 401。

        api.md 準拠: 認証なしのリクエストは 401 Unauthorized を返す。
        """
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {}, "sections": []},
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        resp = unauthed_client.post(
            f"/api/v1/plots/{test_plot.id}/rollback/{snap.id}",
            json={"reason": "unauthorized attempt"},
        )
        assert resp.status_code == 401

    def test_rollback_paused_plot(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """一時停止中の Plot へのロールバック → 403。"""
        test_plot.is_paused = True
        db.commit()
        db.refresh(test_plot)

        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {}, "sections": []},
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        resp = client.post(
            f"/api/v1/plots/{test_plot.id}/rollback/{snap.id}",
            json={"reason": "paused plot attempt"},
        )
        assert resp.status_code == 403


class TestRollbackLogs:
    """GET /api/v1/plots/{plot_id}/rollback-logs — AuthUser（所有者 or 管理者）。"""

    def test_get_rollback_logs(
        self, client: TestClient, test_user: User, test_plot: Plot, db: Session
    ) -> None:
        """ロールバックログ取得（所有者） → 200。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {}, "sections": []},
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        log = RollbackLog(
            plot_id=test_plot.id,
            snapshot_id=snap.id,
            snapshot_version=1,
            user_id=test_user.id,
            reason="test log",
        )
        db.add(log)
        db.commit()

        resp = client.get(f"/api/v1/plots/{test_plot.id}/rollback-logs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["reason"] == "test log"
        assert data["items"][0]["snapshotVersion"] == 1

    def test_get_rollback_logs_empty(
        self, client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """ロールバックログなしで取得 → 200, items 空。"""
        resp = client.get(f"/api/v1/plots/{test_plot.id}/rollback-logs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_get_rollback_logs_unauthorized(
        self, unauthed_client: TestClient, test_user: User, test_plot: Plot
    ) -> None:
        """未認証でロールバックログ取得 → 401。

        api.md 準拠: 認証なしのリクエストは 401 Unauthorized を返す。
        """
        resp = unauthed_client.get(f"/api/v1/plots/{test_plot.id}/rollback-logs")
        assert resp.status_code == 401

    def test_get_rollback_logs_non_owner(
        self,
        other_user_client: TestClient,
        test_user: User,
        other_user: User,
        test_plot: Plot,
    ) -> None:
        """所有者でも管理者でもないユーザーがログ取得 → 403。"""
        resp = other_user_client.get(f"/api/v1/plots/{test_plot.id}/rollback-logs")
        assert resp.status_code == 403

    def test_get_rollback_logs_admin(
        self,
        admin_client: TestClient,
        test_user: User,
        admin_user: User,
        test_plot: Plot,
        db: Session,
    ) -> None:
        """管理者によるロールバックログ取得 → 200。"""
        snap = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {}, "sections": []},
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

        log = RollbackLog(
            plot_id=test_plot.id,
            snapshot_id=snap.id,
            snapshot_version=1,
            user_id=test_user.id,
            reason="admin view test",
        )
        db.add(log)
        db.commit()

        resp = admin_client.get(f"/api/v1/plots/{test_plot.id}/rollback-logs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    def test_get_rollback_logs_plot_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """存在しない Plot のロールバックログ取得 → 404。"""
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/plots/{fake_id}/rollback-logs")
        assert resp.status_code == 404
