"""history_service のユニットテスト。

NOTE:
- record_operation() は .returning() を使うため SQLite では動作しない → スキップ
- rollback_plot_to_snapshot() は with_for_update() を使うが SQLite は無視するため動作する
- get_diff() は ColdSnapshot のバージョン検索を行う
- delete_expired_hot_operations() は TTL ベースのクリーンアップ
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models import ColdSnapshot, HotOperation, Plot, RollbackLog, Section, User
from app.services import history_service
from app.services.history_service import ConflictError


class TestCreateOperation:
    def test_create_operation(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """record_operation は .returning() を使うため SQLite ではスキップ。"""
        pytest.skip(
            "record_operation uses .returning() which is not supported on SQLite"
        )

    def test_create_operation_invalid_type(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """record_operation は .returning() を使うため SQLite ではスキップ。"""
        pytest.skip(
            "record_operation uses .returning() which is not supported on SQLite"
        )


class TestListOperations:
    def test_list_operations(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """操作履歴が存在する場合、リストとして返される。"""
        # HotOperation を直接 DB に挿入（record_operation は SQLite で使えないため）
        op = HotOperation(
            section_id=test_section.id,
            operation_type="insert",
            payload={"text": "hello"},
            user_id=test_user.id,
            version=1,
        )
        db.add(op)
        db.commit()

        items, total = history_service.get_history(db, test_section.id)
        assert total == 1
        assert len(items) == 1
        assert items[0]["operation_type"] == "insert"

    def test_list_operations_empty(self, db: Session, test_section: Section) -> None:
        """操作履歴がない場合は空リスト。"""
        items, total = history_service.get_history(db, test_section.id)
        assert total == 0
        assert items == []


class TestGetDiff:
    def test_get_diff(
        self, db: Session, test_section: Section, test_plot: Plot
    ) -> None:
        """2つのスナップショット間の差分を計算できる。"""
        snap1 = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={
                "plot": {"title": test_plot.title},
                "sections": [
                    {
                        "id": str(test_section.id),
                        "title": test_section.title,
                        "content": {
                            "type": "doc",
                            "content": [{"type": "text", "text": "Hello"}],
                        },
                        "orderIndex": 0,
                    }
                ],
            },
        )
        snap2 = ColdSnapshot(
            plot_id=test_plot.id,
            version=2,
            content={
                "plot": {"title": test_plot.title},
                "sections": [
                    {
                        "id": str(test_section.id),
                        "title": test_section.title,
                        "content": {
                            "type": "doc",
                            "content": [{"type": "text", "text": "World"}],
                        },
                        "orderIndex": 0,
                    }
                ],
            },
        )
        db.add_all([snap1, snap2])
        db.commit()

        result = history_service.get_diff(db, test_section.id, 1, 2)
        assert result["from_version"] == 1
        assert result["to_version"] == 2
        # "Hello" → "World" なので additions と deletions がある
        assert len(result["additions"]) > 0 or len(result["deletions"]) > 0

    def test_get_diff_no_operations(self, db: Session, test_section: Section) -> None:
        """スナップショットが存在しない場合は ValueError。"""
        with pytest.raises(ValueError, match="Snapshot not found"):
            history_service.get_diff(db, test_section.id, 1, 2)


class TestCreateSnapshot:
    def test_create_snapshot(self, db: Session, test_plot: Plot) -> None:
        """ColdSnapshot を直接作成できる（バッチジョブのシミュレーション）。"""
        snapshot = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {"title": test_plot.title}, "sections": []},
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        assert snapshot.plot_id == test_plot.id
        assert snapshot.version == 1


class TestListSnapshots:
    def test_list_snapshots(self, db: Session, test_plot: Plot) -> None:
        """スナップショット一覧を取得できる。"""
        for v in range(1, 4):
            db.add(ColdSnapshot(plot_id=test_plot.id, version=v, content={}))
        db.commit()

        snapshots, total = history_service.get_plot_snapshots(db, test_plot.id)
        assert total == 3
        assert len(snapshots) == 3

    def test_list_snapshots_empty(self, db: Session, test_plot: Plot) -> None:
        """スナップショットがない場合は空リスト。"""
        snapshots, total = history_service.get_plot_snapshots(db, test_plot.id)
        assert total == 0
        assert snapshots == []


class TestGetSnapshotDetail:
    def test_get_snapshot_detail(self, db: Session, test_plot: Plot) -> None:
        """スナップショット詳細を取得できる。"""
        snapshot = ColdSnapshot(
            plot_id=test_plot.id, version=1, content={"plot": {}, "sections": []}
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        result = history_service.get_snapshot_detail(db, test_plot.id, snapshot.id)
        assert result.id == snapshot.id

    def test_get_snapshot_detail_not_found(self, db: Session, test_plot: Plot) -> None:
        """存在しないスナップショットは ValueError。"""
        with pytest.raises(ValueError, match="Snapshot not found"):
            history_service.get_snapshot_detail(db, test_plot.id, uuid.uuid4())


class TestRollbackPlot:
    def test_rollback_plot(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """スナップショットから Plot をロールバックできる。"""
        snapshot = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={
                "plot": {
                    "title": "Rolled Back Title",
                    "description": "old desc",
                    "tags": ["old"],
                },
                "sections": [
                    {
                        "title": "Sec1",
                        "content": {"type": "doc"},
                        "orderIndex": 0,
                        "version": 1,
                    }
                ],
            },
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        result = history_service.rollback_plot_to_snapshot(
            db, test_plot.id, snapshot.id, test_user.id, reason="Test rollback"
        )
        assert result.title == "Rolled Back Title"
        assert result.version == 1  # version 0 → 1 after rollback

    def test_rollback_plot_no_snapshot(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """存在しないスナップショットへのロールバックは ValueError。"""
        with pytest.raises(ValueError, match="Snapshot not found"):
            history_service.rollback_plot_to_snapshot(
                db, test_plot.id, uuid.uuid4(), test_user.id
            )

    def test_rollback_plot_version_conflict(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """expectedVersion 不一致の場合は ConflictError（409 相当）。

        API仕様: POST /plots/{plotId}/rollback/{snapshotId}
        expectedVersion が指定され plots.version と一致しない → 409 Conflict
        """
        snapshot = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {"title": "snap"}, "sections": []},
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        # test_plot.version は 0、expectedVersion=999 で不一致
        with pytest.raises(ConflictError, match="Version conflict"):
            history_service.rollback_plot_to_snapshot(
                db,
                test_plot.id,
                snapshot.id,
                test_user.id,
                expected_version=999,
            )

    def test_rollback_plot_version_match(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """expectedVersion が一致する場合はロールバック成功。"""
        snapshot = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {"title": "Matched"}, "sections": []},
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        result = history_service.rollback_plot_to_snapshot(
            db,
            test_plot.id,
            snapshot.id,
            test_user.id,
            expected_version=test_plot.version,
        )
        assert result.title == "Matched"

    def test_rollback_plot_paused(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """一時停止中の Plot へのロールバックは PermissionError（403 相当）。

        API仕様: POST /plots/{plotId}/rollback/{snapshotId}
        Plotが一時停止中 → 403 Forbidden
        """
        snapshot = ColdSnapshot(
            plot_id=test_plot.id,
            version=1,
            content={"plot": {"title": "snap"}, "sections": []},
        )
        db.add(snapshot)
        db.commit()

        # Plot を一時停止状態にする
        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="paused"):
            history_service.rollback_plot_to_snapshot(
                db, test_plot.id, snapshot.id, test_user.id
            )


class TestListRollbackLogs:
    def test_list_rollback_logs(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """ロールバックログが存在する場合、リストとして返される。"""
        snapshot = ColdSnapshot(plot_id=test_plot.id, version=1, content={})
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        log = RollbackLog(
            plot_id=test_plot.id,
            snapshot_id=snapshot.id,
            snapshot_version=1,
            user_id=test_user.id,
            reason="Test",
        )
        db.add(log)
        db.commit()

        items, total = history_service.get_rollback_logs(db, test_plot.id)
        assert total == 1
        assert len(items) == 1
        assert items[0]["reason"] == "Test"

    def test_list_rollback_logs_empty(self, db: Session, test_plot: Plot) -> None:
        """ロールバックログがない場合は空リスト。"""
        items, total = history_service.get_rollback_logs(db, test_plot.id)
        assert total == 0
        assert items == []


class TestCleanupOldOperations:
    def test_cleanup_old_operations(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """72 時間超過の HotOperation が削除される。"""
        old_op = HotOperation(
            section_id=test_section.id,
            operation_type="insert",
            payload={},
            user_id=test_user.id,
            version=1,
        )
        db.add(old_op)
        db.commit()
        db.refresh(old_op)

        # created_at を 73 時間前に手動設定
        old_time = datetime.now(UTC) - timedelta(hours=73)
        old_op.created_at = old_time
        db.commit()

        deleted = history_service.delete_expired_hot_operations(db)
        assert deleted == 1

    def test_cleanup_old_operations_nothing_to_clean(self, db: Session) -> None:
        """削除対象がない場合は 0 を返す。"""
        deleted = history_service.delete_expired_hot_operations(db)
        assert deleted == 0

    def test_cleanup_boundary_exactly_72h(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """71時間前の HotOperation は削除されない（TTL 72時間の境界値テスト）。

        TTL 条件は created_at < (now - 72h) なので、71時間前は保持される。
        """
        op = HotOperation(
            section_id=test_section.id,
            operation_type="insert",
            payload={},
            user_id=test_user.id,
            version=1,
        )
        db.add(op)
        db.commit()
        db.refresh(op)

        # created_at を 71 時間前に設定（72時間 TTL 以内なので削除されない）
        within_ttl = datetime.now(UTC) - timedelta(hours=71)
        op.created_at = within_ttl
        db.commit()

        deleted = history_service.delete_expired_hot_operations(db)
        assert deleted == 0

    def test_cleanup_mixed_old_and_new(
        self, db: Session, test_section: Section, test_user: User
    ) -> None:
        """新旧混在時に古い操作のみ削除される。"""
        old_op = HotOperation(
            section_id=test_section.id,
            operation_type="insert",
            payload={},
            user_id=test_user.id,
            version=1,
        )
        new_op = HotOperation(
            section_id=test_section.id,
            operation_type="update",
            payload={},
            user_id=test_user.id,
            version=2,
        )
        db.add_all([old_op, new_op])
        db.commit()
        db.refresh(old_op)

        old_op.created_at = datetime.now(UTC) - timedelta(hours=73)
        db.commit()

        deleted = history_service.delete_expired_hot_operations(db)
        assert deleted == 1

        # 新しい操作は残っている
        remaining = db.query(HotOperation).count()
        assert remaining == 1


class TestListOperationsLimitOffset:
    """get_history の limit/offset パラメータテスト。

    API仕様: GET /sections/{sectionId}/history
    デフォルト limit=50, offset=0
    """

    def test_limit(self, db: Session, test_section: Section, test_user: User) -> None:
        """limit を指定すると結果が制限される。"""
        for i in range(5):
            op = HotOperation(
                section_id=test_section.id,
                operation_type="insert",
                payload={"i": i},
                user_id=test_user.id,
                version=i + 1,
            )
            db.add(op)
        db.commit()

        items, total = history_service.get_history(db, test_section.id, limit=2)
        assert total == 5
        assert len(items) == 2

    def test_offset(self, db: Session, test_section: Section, test_user: User) -> None:
        """offset を指定するとスキップされる。"""
        for i in range(5):
            op = HotOperation(
                section_id=test_section.id,
                operation_type="insert",
                payload={"i": i},
                user_id=test_user.id,
                version=i + 1,
            )
            db.add(op)
        db.commit()

        items, total = history_service.get_history(
            db, test_section.id, limit=10, offset=3
        )
        assert total == 5
        assert len(items) == 2  # 5 - 3 = 2


class TestListSnapshotsLimitOffset:
    """get_plot_snapshots の limit/offset パラメータテスト。

    API仕様: GET /plots/{plotId}/snapshots
    デフォルト limit=20, max=100, offset=0
    """

    def test_limit(self, db: Session, test_plot: Plot) -> None:
        """limit を指定すると結果が制限される。"""
        for v in range(5):
            db.add(ColdSnapshot(plot_id=test_plot.id, version=v + 1, content={}))
        db.commit()

        snapshots, total = history_service.get_plot_snapshots(db, test_plot.id, limit=2)
        assert total == 5
        assert len(snapshots) == 2

    def test_offset(self, db: Session, test_plot: Plot) -> None:
        """offset を指定するとスキップされる。"""
        for v in range(5):
            db.add(ColdSnapshot(plot_id=test_plot.id, version=v + 1, content={}))
        db.commit()

        snapshots, total = history_service.get_plot_snapshots(
            db, test_plot.id, limit=10, offset=3
        )
        assert total == 5
        assert len(snapshots) == 2


class TestListRollbackLogsLimitOffset:
    """get_rollback_logs の limit/offset パラメータテスト。

    API仕様: GET /plots/{plotId}/rollback-logs
    デフォルト limit=20, max=100, offset=0
    """

    def test_limit(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """limit を指定すると結果が制限される。"""
        snap = ColdSnapshot(plot_id=test_plot.id, version=1, content={})
        db.add(snap)
        db.commit()
        db.refresh(snap)

        for i in range(5):
            db.add(
                RollbackLog(
                    plot_id=test_plot.id,
                    snapshot_id=snap.id,
                    snapshot_version=1,
                    user_id=test_user.id,
                    reason=f"reason {i}",
                )
            )
        db.commit()

        items, total = history_service.get_rollback_logs(db, test_plot.id, limit=2)
        assert total == 5
        assert len(items) == 2

    def test_offset(self, db: Session, test_plot: Plot, test_user: User) -> None:
        """offset を指定するとスキップされる。"""
        snap = ColdSnapshot(plot_id=test_plot.id, version=1, content={})
        db.add(snap)
        db.commit()
        db.refresh(snap)

        for i in range(5):
            db.add(
                RollbackLog(
                    plot_id=test_plot.id,
                    snapshot_id=snap.id,
                    snapshot_version=1,
                    user_id=test_user.id,
                    reason=f"reason {i}",
                )
            )
        db.commit()

        items, total = history_service.get_rollback_logs(
            db, test_plot.id, limit=10, offset=3
        )
        assert total == 5
        assert len(items) == 2
