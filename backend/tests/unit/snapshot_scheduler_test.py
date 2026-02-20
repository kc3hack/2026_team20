"""snapshot_scheduler のユニットテスト。

api.md 仕様:
- スナップショットは5分間隔バッチで自動作成される。
- 1スナップショットあたりの最大サイズは10MB。
- 超過したPlotのスナップショットは作成がスキップされ、ログに警告が出力される。

テスト対象:
- create_plot_snapshot: 個別Plotのスナップショット作成
- run_snapshot_batch: バッチ処理で全Plotのスナップショットを一括作成
"""

import pytest
from sqlalchemy.orm import Session

from app.models import ColdSnapshot, Plot, Section, User
from app.services import snapshot_scheduler


class TestCreatePlotSnapshot:
    """create_plot_snapshot のテスト。

    Plot の現在の状態（メタデータ + 全セクション）を ColdSnapshot として保存する。
    """

    def test_create_snapshot_basic(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """正常な Plot でスナップショットを作成できる。"""
        result = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert result is not None
        assert isinstance(result, ColdSnapshot)
        assert result.plot_id == test_plot.id

    def test_create_snapshot_includes_sections(
        self, db: Session, test_plot: Plot, test_section: Section, test_user: User
    ) -> None:
        """スナップショットにセクション情報が含まれる。"""
        result = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert result is not None
        assert result.content is not None
        # content 内に sections キーが存在する
        assert "sections" in result.content

    def test_create_snapshot_includes_plot_metadata(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """スナップショットに Plot のメタデータ（title, description 等）が含まれる。"""
        result = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert result is not None
        assert result.content is not None
        assert "plot" in result.content

    def test_create_snapshot_empty_sections(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """セクションが 0 件の Plot でもスナップショットを作成できる。"""
        result = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert result is not None
        assert result.content is not None
        assert result.content["sections"] == [] or isinstance(
            result.content["sections"], list
        )

    def test_create_snapshot_multiple_calls_succeed(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """同一 Plot に対して複数回スナップショットを作成できる。"""
        snap1 = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert snap1 is not None
        assert isinstance(snap1, ColdSnapshot)

        snap2 = snapshot_scheduler.create_plot_snapshot(db, test_plot)
        assert snap2 is not None
        assert isinstance(snap2, ColdSnapshot)


class TestRunSnapshotBatch:
    """run_snapshot_batch のテスト。

    全 Plot に対してバッチでスナップショットを作成する。
    """

    def test_batch_with_plots(
        self, db: Session, test_plot: Plot, test_user: User
    ) -> None:
        """Plot が存在する場合、バッチ処理でスナップショットが作成される。"""
        created = snapshot_scheduler.run_snapshot_batch(db)
        assert created >= 1

    def test_batch_empty_no_plots(self, db: Session) -> None:
        """Plot が存在しない場合、0 を返す。"""
        created = snapshot_scheduler.run_snapshot_batch(db)
        assert created == 0

    def test_batch_multiple_plots(self, db: Session, test_user: User) -> None:
        """複数の Plot がある場合、全てのスナップショットが作成される。"""
        for i in range(3):
            plot = Plot(
                title=f"Batch Plot {i}",
                owner_id=test_user.id,
                tags=[],
            )
            db.add(plot)
        db.commit()

        created = snapshot_scheduler.run_snapshot_batch(db)
        assert created == 3
