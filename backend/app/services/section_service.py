"""セクションサービス - CRUD・並び替えロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
失敗時は ValueError / PermissionError を raise し、
endpoint 側で HTTPException に変換する。

権限チェックの方針:
- update / delete 時は Plot の is_paused を確認し、
  一時停止中であれば PermissionError("Plot is paused") を raise する。
  api.md では 403 Forbidden を返す仕様。
"""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Plot, Section

# api.md: セクション数が上限（255個）に達している場合は 400 Bad Request
MAX_SECTIONS_PER_PLOT = 255


# ─── ヘルパー ──────────────────────────────────────────────────


def _get_section_or_raise(db: Session, section_id: UUID) -> Section:
    """Section を取得する。存在しない場合は ValueError を raise する。"""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")
    return section


def _check_plot_not_paused(db: Session, plot_id: UUID) -> None:
    """Plot が一時停止中でないことを確認する。

    一時停止中の場合は PermissionError を raise する。
    Plot が存在しない場合は ValueError を raise する。
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")
    if plot.is_paused:
        raise PermissionError("Plot is paused")


# ─── 一覧取得 ──────────────────────────────────────────────────


def list_sections(db: Session, plot_id: UUID) -> tuple[list[Section], int]:
    """指定 Plot のセクション一覧を order_index 昇順で取得する。

    戻り値は (Section リスト, total件数) のタプル。
    Plot が存在しない場合は ValueError を raise する。
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    query = (
        db.query(Section)
        .filter(Section.plot_id == plot_id)
        .order_by(Section.order_index)
    )

    total = query.count()
    sections = query.all()

    return sections, total


# ─── 作成 ──────────────────────────────────────────────────────


def create_section(
    db: Session,
    plot_id: UUID,
    title: str,
    content: dict | None = None,
    order_index: int | None = None,
) -> Section:
    """セクションを作成する。

    - Plot が存在しない場合: ValueError("Plot not found")
    - セクション数が上限に達している場合: ValueError("Section limit reached")

    order_index:
        - None (省略): 末尾に追加 (max + 1)
        - 指定あり: その位置に挿入し、後続のセクションを +1 シフトする
          (0未満なら0、現在数以上なら末尾に補正)
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    # Pause チェック (api.md: 403 Forbidden)
    if plot.is_paused:
        raise PermissionError("Plot is paused")

    # 上限チェック (api.md: 400 Bad Request)
    current_count = db.query(Section).filter(Section.plot_id == plot_id).count()
    if current_count >= MAX_SECTIONS_PER_PLOT:
        raise ValueError("Section limit reached")

    # 挿入位置の決定
    if order_index is None:
        # 末尾に追加: 既存の最大 order_index + 1
        max_order = (
            db.query(Section.order_index)
            .filter(Section.plot_id == plot_id)
            .order_by(Section.order_index.desc())
            .first()
        )
        target_order = (max_order[0] + 1) if max_order else 0
    else:
        # 指定位置に挿入
        # 0未満は0に、最大値超えは末尾に補正
        target_order = max(0, min(order_index, current_count))

        # 後続セクションをシフト: [target_order, end] を +1
        # reorder_section の前方移動と同様
        subsequent = (
            db.query(Section)
            .filter(
                Section.plot_id == plot_id,
                Section.order_index >= target_order,
            )
            .all()
        )
        for s in subsequent:
            s.order_index += 1

    section = Section(
        plot_id=plot_id,
        title=title,
        content=content,
        order_index=target_order,
    )
    db.add(section)

    # セクション変更を Plot.updated_at に反映（スナップショットスケジューラ連携）
    plot.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(section)
    return section


# ─── 詳細取得 ──────────────────────────────────────────────────


def get_section(db: Session, section_id: UUID) -> Section:
    """セクション詳細を取得する。

    存在しない場合は ValueError("Section not found") を raise する。
    """
    return _get_section_or_raise(db, section_id)


# ─── 更新 ──────────────────────────────────────────────────────


def update_section(
    db: Session,
    section_id: UUID,
    title: str | None = None,
    content: dict | None = ...,  # sentinel: None は「削除」、... は「未指定」
) -> Section:
    """セクションを更新する。

    - Section が見つからない場合: ValueError("Section not found")
    - Plot が一時停止中の場合: PermissionError("Plot is paused")

    更新時に version をインクリメントする。
    """
    section = _get_section_or_raise(db, section_id)
    _check_plot_not_paused(db, section.plot_id)

    if title is not None:
        section.title = title
    # content: ... は未指定、None は明示的にクリア
    if content is not ...:
        section.content = content

    section.version = section.version + 1

    # セクション変更を Plot.updated_at に反映（スナップショットスケジューラ連携）
    plot = db.query(Plot).filter(Plot.id == section.plot_id).first()
    if plot:
        plot.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(section)
    return section


# ─── 削除 ──────────────────────────────────────────────────────


def delete_section(db: Session, section_id: UUID) -> None:
    """セクションを削除する。

    - Section が見つからない場合: ValueError("Section not found")
    - Plot が一時停止中の場合: PermissionError("Plot is paused")

    削除後、同一 Plot 内の後続セクションの order_index を詰める。
    """
    section = _get_section_or_raise(db, section_id)
    _check_plot_not_paused(db, section.plot_id)

    plot_id = section.plot_id
    deleted_order = section.order_index

    db.delete(section)

    # 後続セクションの order_index を詰める
    subsequent = (
        db.query(Section)
        .filter(
            Section.plot_id == plot_id,
            Section.order_index > deleted_order,
        )
        .order_by(Section.order_index)
        .all()
    )
    for s in subsequent:
        s.order_index -= 1

    # セクション変更を Plot.updated_at に反映（スナップショットスケジューラ連携）
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if plot:
        plot.updated_at = datetime.now(UTC)

    db.commit()


# ─── 並び替え ──────────────────────────────────────────────────


def reorder_section(db: Session, section_id: UUID, new_order: int) -> Section:
    """セクションを指定位置に移動し、他のセクションの order_index をシフトする。

    - Section が見つからない場合: ValueError("Section not found")
    - new_order が範囲外の場合: ValueError("Invalid order")

    移動アルゴリズム:
    1. 現在の order_index と new_order が同じなら何もしない
    2. 前方移動（old > new）: [new, old) の範囲を +1 にシフト
    3. 後方移動（old < new）: (old, new] の範囲を -1 にシフト
    4. 対象セクションの order_index を new_order に設定
    """
    section = _get_section_or_raise(db, section_id)
    plot_id = section.plot_id

    # Pause チェック
    _check_plot_not_paused(db, plot_id)

    old_order = section.order_index

    # 同一 Plot 内のセクション数を取得して範囲チェック
    section_count = db.query(Section).filter(Section.plot_id == plot_id).count()
    if new_order < 0 or new_order >= section_count:
        raise ValueError("Invalid order")

    if old_order == new_order:
        return section

    if old_order > new_order:
        # 前方移動: [new_order, old_order) を +1
        targets = (
            db.query(Section)
            .filter(
                Section.plot_id == plot_id,
                Section.order_index >= new_order,
                Section.order_index < old_order,
            )
            .all()
        )
        for s in targets:
            s.order_index += 1
    else:
        # 後方移動: (old_order, new_order] を -1
        targets = (
            db.query(Section)
            .filter(
                Section.plot_id == plot_id,
                Section.order_index > old_order,
                Section.order_index <= new_order,
            )
            .all()
        )
        for s in targets:
            s.order_index -= 1

    section.order_index = new_order

    # セクション変更を Plot.updated_at に反映（スナップショットスケジューラ連携）
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if plot:
        plot.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(section)
    return section
