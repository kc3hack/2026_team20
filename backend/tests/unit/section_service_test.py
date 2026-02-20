"""section_service のユニットテスト。

サービス関数を直接呼び出し、DB レベルの振る舞いを検証する。

api.md 仕様:
- GET /plots/{plotId}/sections → list_sections
- POST /plots/{plotId}/sections → create_section (403 if paused, 400 if limit)
- GET /sections/{sectionId} → get_section
- PUT /sections/{sectionId} → update_section (403 if paused)
- DELETE /sections/{sectionId} → delete_section (403 if paused)
- POST /sections/{sectionId}/reorder → reorder_section (403 if paused)
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Plot, Section, User
from app.services import section_service


# ─── list_sections ──────────────────────────────────────────────


class TestListSections:
    """list_sections のテスト"""

    def test_list_sections_with_data(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """セクション一覧を取得できる。"""
        sections, total = section_service.list_sections(db, test_plot.id)
        assert total == 1
        assert len(sections) == 1
        assert sections[0].id == test_section.id

    def test_list_sections_empty(self, db: Session, test_plot: Plot) -> None:
        """セクションが存在しない場合、空リストを返す。"""
        sections, total = section_service.list_sections(db, test_plot.id)
        assert total == 0
        assert sections == []

    def test_list_sections_ordered_by_order_index(
        self, db: Session, test_plot: Plot
    ) -> None:
        """セクションが order_index 昇順で返される。"""
        s2 = Section(plot_id=test_plot.id, title="Second", order_index=2)
        s0 = Section(plot_id=test_plot.id, title="First", order_index=0)
        s1 = Section(plot_id=test_plot.id, title="Middle", order_index=1)
        db.add_all([s2, s0, s1])
        db.commit()

        sections, total = section_service.list_sections(db, test_plot.id)
        assert total == 3
        assert [s.title for s in sections] == ["First", "Middle", "Second"]

    def test_list_sections_plot_not_found(self, db: Session) -> None:
        """存在しない Plot ID は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            section_service.list_sections(db, uuid.uuid4())


# ─── create_section ──────────────────────────────────────────────


class TestCreateSection:
    """create_section のテスト"""

    def test_create_section(self, db: Session, test_plot: Plot) -> None:
        """正常にセクションを作成できる。"""
        section = section_service.create_section(
            db, test_plot.id, "New Section", content={"type": "doc", "content": []}
        )
        assert section.title == "New Section"
        assert section.plot_id == test_plot.id
        assert section.content == {"type": "doc", "content": []}
        assert section.order_index == 0  # 最初のセクションなので 0

    def test_create_section_appends_to_end(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """order_index 省略時は末尾に追加される。"""
        new = section_service.create_section(db, test_plot.id, "Appended")
        # test_section が order_index=0 なので、新規は 1
        assert new.order_index == 1

    def test_create_section_with_order_index(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """order_index 指定時はその位置に挿入し後続をシフトする。"""
        new = section_service.create_section(
            db, test_plot.id, "Inserted", order_index=0
        )
        assert new.order_index == 0

        # 元の test_section は order_index が 1 にシフトされる
        db.refresh(test_section)
        assert test_section.order_index == 1

    def test_create_section_plot_not_found(self, db: Session) -> None:
        """存在しない Plot に作成しようとすると ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            section_service.create_section(db, uuid.uuid4(), "X")

    def test_create_section_plot_is_paused(self, db: Session, test_plot: Plot) -> None:
        """一時停止中の Plot にセクション作成は PermissionError (api.md: 403)。"""
        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="Plot is paused"):
            section_service.create_section(db, test_plot.id, "X")

    def test_create_section_without_content(self, db: Session, test_plot: Plot) -> None:
        """content 省略時は None で作成される。"""
        section = section_service.create_section(db, test_plot.id, "No Content")
        assert section.content is None


# ─── get_section ──────────────────────────────────────────────


class TestGetSection:
    """get_section のテスト"""

    def test_get_section(self, db: Session, test_section: Section) -> None:
        """存在するセクションを取得できる。"""
        result = section_service.get_section(db, test_section.id)
        assert result.id == test_section.id
        assert result.title == test_section.title

    def test_get_section_not_found(self, db: Session) -> None:
        """存在しないセクション ID は ValueError。"""
        with pytest.raises(ValueError, match="Section not found"):
            section_service.get_section(db, uuid.uuid4())


# ─── update_section ──────────────────────────────────────────────


class TestUpdateSection:
    """update_section のテスト"""

    def test_update_section_title(self, db: Session, test_section: Section) -> None:
        """セクションの title を更新できる。"""
        original_version = test_section.version
        updated = section_service.update_section(
            db, test_section.id, title="Updated Title"
        )
        assert updated.title == "Updated Title"
        assert updated.version == original_version + 1

    def test_update_section_content(self, db: Session, test_section: Section) -> None:
        """セクションの content を更新できる。"""
        new_content = {"type": "doc", "content": [{"type": "paragraph"}]}
        updated = section_service.update_section(
            db, test_section.id, content=new_content
        )
        assert updated.content == new_content

    def test_update_section_clear_content(
        self, db: Session, test_section: Section
    ) -> None:
        """content=None で明示的にクリアできる。"""
        updated = section_service.update_section(db, test_section.id, content=None)
        assert updated.content is None

    def test_update_section_not_found(self, db: Session) -> None:
        """存在しないセクションの更新は ValueError。"""
        with pytest.raises(ValueError, match="Section not found"):
            section_service.update_section(db, uuid.uuid4(), title="X")

    def test_update_section_plot_is_paused(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """一時停止中の Plot のセクション更新は PermissionError (api.md: 403)。"""
        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="Plot is paused"):
            section_service.update_section(db, test_section.id, title="X")

    def test_update_section_increments_version(
        self, db: Session, test_section: Section
    ) -> None:
        """更新ごとに version がインクリメントされる。"""
        v1 = test_section.version
        section_service.update_section(db, test_section.id, title="V2")
        db.refresh(test_section)
        assert test_section.version == v1 + 1


# ─── delete_section ──────────────────────────────────────────────


class TestDeleteSection:
    """delete_section のテスト"""

    def test_delete_section(self, db: Session, test_section: Section) -> None:
        """セクションを削除できる。"""
        section_id = test_section.id
        section_service.delete_section(db, section_id)

        with pytest.raises(ValueError, match="Section not found"):
            section_service.get_section(db, section_id)

    def test_delete_section_reorders_subsequent(
        self, db: Session, test_plot: Plot
    ) -> None:
        """削除後、後続セクションの order_index が詰められる。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")
        s1 = section_service.create_section(db, test_plot.id, "S1")
        s2 = section_service.create_section(db, test_plot.id, "S2")

        section_service.delete_section(db, s1.id)

        db.refresh(s2)
        assert s2.order_index == 1  # s2 は 2 → 1 に詰められる

    def test_delete_section_not_found(self, db: Session) -> None:
        """存在しないセクションの削除は ValueError。"""
        with pytest.raises(ValueError, match="Section not found"):
            section_service.delete_section(db, uuid.uuid4())

    def test_delete_section_plot_is_paused(
        self, db: Session, test_plot: Plot, test_section: Section
    ) -> None:
        """一時停止中の Plot のセクション削除は PermissionError (api.md: 403)。"""
        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="Plot is paused"):
            section_service.delete_section(db, test_section.id)


# ─── _check_plot_not_paused ──────────────────────────────────────


class TestCheckPlotNotPaused:
    """_check_plot_not_paused のテスト"""

    def test_not_paused_passes(self, db: Session, test_plot: Plot) -> None:
        """一時停止されていない Plot はエラーにならない。"""
        # 例外が発生しないことを確認
        section_service._check_plot_not_paused(db, test_plot.id)

    def test_paused_raises_permission_error(self, db: Session, test_plot: Plot) -> None:
        """一時停止中の Plot は PermissionError。"""
        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="Plot is paused"):
            section_service._check_plot_not_paused(db, test_plot.id)

    def test_plot_not_found_raises_value_error(self, db: Session) -> None:
        """存在しない Plot は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            section_service._check_plot_not_paused(db, uuid.uuid4())


# ─── reorder_section ──────────────────────────────────────────────


class TestReorderSection:
    """reorder_section のテスト"""

    def test_reorder_forward(self, db: Session, test_plot: Plot) -> None:
        """後方のセクションを前方に移動できる。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")
        s1 = section_service.create_section(db, test_plot.id, "S1")
        s2 = section_service.create_section(db, test_plot.id, "S2")

        # s2 (order=2) を先頭 (order=0) に移動
        result = section_service.reorder_section(db, s2.id, 0)
        assert result.order_index == 0

        db.refresh(s0)
        db.refresh(s1)
        assert s0.order_index == 1  # 0 → 1 にシフト
        assert s1.order_index == 2  # 1 → 2 にシフト

    def test_reorder_backward(self, db: Session, test_plot: Plot) -> None:
        """前方のセクションを後方に移動できる。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")
        s1 = section_service.create_section(db, test_plot.id, "S1")
        s2 = section_service.create_section(db, test_plot.id, "S2")

        # s0 (order=0) を末尾 (order=2) に移動
        result = section_service.reorder_section(db, s0.id, 2)
        assert result.order_index == 2

        db.refresh(s1)
        db.refresh(s2)
        assert s1.order_index == 0  # 1 → 0 にシフト
        assert s2.order_index == 1  # 2 → 1 にシフト

    def test_reorder_same_position(self, db: Session, test_plot: Plot) -> None:
        """同じ位置への移動は何もしない。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")
        result = section_service.reorder_section(db, s0.id, 0)
        assert result.order_index == 0

    def test_reorder_invalid_order(self, db: Session, test_plot: Plot) -> None:
        """範囲外の order は ValueError。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")

        with pytest.raises(ValueError, match="Invalid order"):
            section_service.reorder_section(db, s0.id, 5)

    def test_reorder_not_found(self, db: Session) -> None:
        """存在しないセクションの並び替えは ValueError。"""
        with pytest.raises(ValueError, match="Section not found"):
            section_service.reorder_section(db, uuid.uuid4(), 0)

    def test_reorder_plot_is_paused(self, db: Session, test_plot: Plot) -> None:
        """一時停止中の Plot のセクション並び替えは PermissionError (api.md: 403)。"""
        s0 = section_service.create_section(db, test_plot.id, "S0")

        test_plot.is_paused = True
        db.commit()

        with pytest.raises(PermissionError, match="Plot is paused"):
            section_service.reorder_section(db, s0.id, 0)
