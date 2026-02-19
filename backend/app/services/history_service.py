"""履歴サービス - 2層ストレージのビジネスロジック。

フェーズ1（ホット）: hot_operationsの操作ログ（72時間のTTL）
フェーズ2（コールド）: cold_snapshotsのスナップショット（5分間隔バッチで作成）

設計変更（renew-api.md準拠）:
- ColdSnapshotはPlot全体単位（plot_id）。バッチジョブが作成するため、
  record_operationではHotOperationのみを記録する。
- セクション単位ロールバックは廃止。Plot全体ロールバックに統一。
- ロールバック操作はrollback_logsテーブルに監査ログとして記録。
"""

import difflib
import json
import uuid as _uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import update as sa_update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import (
    ColdSnapshot,
    HotOperation,
    Plot,
    RollbackLog,
    Section,
    User,
)

# ホット操作のTTL（72時間）
HOT_OPERATION_TTL_HOURS = 72


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  record_operation: HotOperationの記録のみ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def record_operation(
    db: Session,
    section_id: UUID,
    user_id: UUID,
    operation_type: str,
    payload: dict | None = None,
) -> HotOperation:
    """hot_operationsに操作を記録する。

    ColdSnapshot作成はバッチジョブ（snapshot_scheduler）が担当するため、
    ここではHotOperationの記録のみを行う。

    1. セクションのバージョンをインクリメント（アトミックなSQLレベル更新）
    2. 操作ログを保存（フェーズ1 - ホット、72時間TTL）
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # SQLレベルでのアトミックなバージョンインクリメント（行ロック不要）
    stmt = (
        sa_update(Section)
        .where(Section.id == section_id)
        .values(version=Section.version + 1)
        .returning(Section.version)
    )
    result = db.execute(stmt)
    new_version = result.scalar_one()

    # HotOperation記録のみ（ColdSnapshotはバッチジョブが作成する）
    operation = HotOperation(
        section_id=section_id,
        operation_type=operation_type,
        payload=payload,
        user_id=user_id,
        version=new_version,
    )
    db.add(operation)

    try:
        db.commit()
        db.refresh(operation)
        return operation
    except SQLAlchemyError:
        db.rollback()
        raise


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  get_history: 操作ログ取得（72時間ウィンドウ）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def get_history(
    db: Session,
    section_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """セクションの操作履歴を取得する（72時間のウィンドウのみ）。

    ユーザー情報を含む履歴項目のリストと総数を返す。
    N+1クエリ問題を回避するためにバッチでユーザーを取得。
    """
    cutoff = datetime.now(UTC) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

    query = (
        db.query(HotOperation)
        .filter(
            HotOperation.section_id == section_id,
            HotOperation.created_at >= cutoff,
        )
        .order_by(HotOperation.created_at.desc())
    )

    total = query.count()
    operations = query.offset(offset).limit(limit).all()

    # ユーザーデータを一括読み込み
    user_ids = {op.user_id for op in operations}
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}

    items = []
    for op in operations:
        user = user_map.get(op.user_id)
        items.append(
            {
                "id": op.id,
                "section_id": op.section_id,
                "operation_type": op.operation_type,
                "payload": op.payload,
                "user": {
                    "id": user.id,
                    "displayName": user.display_name,
                    "avatarUrl": user.avatar_url,
                }
                if user
                else None,
                "version": op.version,
                "created_at": op.created_at,
            }
        )

    return items, total


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  rollback_plot_to_snapshot: Plot全体ロールバック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def rollback_plot_to_snapshot(
    db: Session,
    plot_id: UUID,
    snapshot_id: UUID,
    user_id: UUID,
    expected_version: int | None = None,
    reason: str | None = None,
) -> Plot:
    """スナップショットからPlot全体（メタデータ + 全セクション）を復元する。

    完全上書き方式:
    1. expectedVersionが指定されている場合、plots.versionと比較（楽観的ロック）
    2. 不一致の場合は409 Conflictに相当する例外を送出
    3. 一致する場合、スナップショットの内容でPlot全体を上書き
    4. 現在の全セクションを削除し、スナップショットのセクション構成で再作成（新規UUID）
    5. plots.versionをインクリメント
    6. rollback_logsテーブルに監査ログを記録
    """
    # Plot取得（行ロック: 同時ロールバック防止）
    plot = db.query(Plot).filter(Plot.id == plot_id).with_for_update().first()
    if not plot:
        raise ValueError("Plot not found")

    # Plotが一時停止中なら拒否
    if plot.is_paused:
        raise PermissionError("This plot is paused")

    # スナップショット取得
    snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.id == snapshot_id,
            ColdSnapshot.plot_id == plot_id,
        )
        .first()
    )
    if not snapshot:
        raise ValueError("Snapshot not found")

    # 楽観的ロック: expectedVersionが指定されている場合のみチェック
    if expected_version is not None and plot.version != expected_version:
        raise ConflictError(
            f"Version conflict: expected {expected_version}, "
            f"but current is {plot.version}"
        )

    # スナップショットのcontent JSONを解析
    snapshot_content = snapshot.content or {}
    plot_meta = snapshot_content.get("plot", {})
    snapshot_sections = snapshot_content.get("sections", [])

    # Plot メタデータを復元
    if plot_meta.get("title"):
        plot.title = plot_meta["title"]
    if "description" in plot_meta:
        plot.description = plot_meta["description"]
    if "tags" in plot_meta:
        plot.tags = plot_meta["tags"]

    # 完全上書き方式: 現在の全セクションを削除
    db.query(Section).filter(Section.plot_id == plot_id).delete(
        synchronize_session="fetch"
    )

    # スナップショットのセクションを新規UUIDで再作成
    for sec_data in snapshot_sections:
        new_section = Section(
            id=_uuid.uuid4(),
            plot_id=plot_id,
            title=sec_data.get("title", ""),
            content=sec_data.get("content"),
            order_index=sec_data.get("orderIndex", 0),
            version=sec_data.get("version", 1),
        )
        db.add(new_section)

    # Plotバージョンをインクリメント
    plot.version = plot.version + 1

    # 監査ログを記録
    rollback_log = RollbackLog(
        plot_id=plot_id,
        snapshot_id=snapshot_id,
        snapshot_version=snapshot.version,
        user_id=user_id,
        reason=reason,
    )
    db.add(rollback_log)

    try:
        db.commit()
        db.refresh(plot)
        return plot
    except SQLAlchemyError:
        db.rollback()
        raise


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  get_plot_snapshots: スナップショット一覧取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def get_plot_snapshots(
    db: Session,
    plot_id: UUID,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ColdSnapshot], int]:
    """PlotのColdSnapshot一覧を取得する（新しい順）。"""
    query = (
        db.query(ColdSnapshot)
        .filter(ColdSnapshot.plot_id == plot_id)
        .order_by(ColdSnapshot.created_at.desc())
    )

    total = query.count()
    snapshots = query.offset(offset).limit(limit).all()

    return snapshots, total


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  get_snapshot_detail: スナップショット詳細取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def get_snapshot_detail(
    db: Session,
    plot_id: UUID,
    snapshot_id: UUID,
) -> ColdSnapshot:
    """スナップショットの詳細を取得する（復元前のプレビュー用）。"""
    snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.id == snapshot_id,
            ColdSnapshot.plot_id == plot_id,
        )
        .first()
    )
    if not snapshot:
        raise ValueError("Snapshot not found")

    return snapshot


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  get_rollback_logs: ロールバック監査ログ一覧取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def get_rollback_logs(
    db: Session,
    plot_id: UUID,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """PlotのRollbackLog一覧を取得する（新しい順）。

    ユーザー情報を含むログ項目のリストと総数を返す。
    """
    query = (
        db.query(RollbackLog)
        .filter(RollbackLog.plot_id == plot_id)
        .order_by(RollbackLog.created_at.desc())
    )

    total = query.count()
    logs = query.offset(offset).limit(limit).all()

    # ユーザーデータを一括読み込み
    user_ids = {log.user_id for log in logs}
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}

    items = []
    for log in logs:
        user = user_map.get(log.user_id)
        items.append(
            {
                "id": log.id,
                "plot_id": log.plot_id,
                "snapshot_id": log.snapshot_id,
                "snapshot_version": log.snapshot_version,
                "user": {
                    "id": user.id,
                    "displayName": user.display_name,
                    "avatarUrl": user.avatar_url,
                }
                if user
                else None,
                "reason": log.reason,
                "created_at": log.created_at,
            }
        )

    return items, total


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  get_diff: 差分取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def get_diff(
    db: Session,
    section_id: UUID,
    from_version: int,
    to_version: int,
) -> dict:
    """2つのスナップショットバージョン間の差分を計算する。

    ColdSnapshotがPlot単位になったため、section_idが属するplot_idを使って
    Plotスナップショットからセクションのコンテンツを抽出して比較する。
    """
    # まずセクションのplot_idを取得
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    plot_id = section.plot_id

    # ColdSnapshotはplot_id単位なので、バージョンで検索
    from_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.plot_id == plot_id,
            ColdSnapshot.version == from_version,
        )
        .first()
    )

    to_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.plot_id == plot_id,
            ColdSnapshot.version == to_version,
        )
        .first()
    )

    if not from_snapshot or not to_snapshot:
        raise ValueError("Snapshot not found for one or both versions")

    # スナップショットから該当セクションのコンテンツを抽出
    from_content = _extract_section_content(from_snapshot.content, section_id)
    to_content = _extract_section_content(to_snapshot.content, section_id)

    from_text = extract_text(from_content)
    to_text = extract_text(to_content)

    additions, deletions = compute_diff(from_text, to_text)

    return {
        "from_version": from_version,
        "to_version": to_version,
        "additions": additions,
        "deletions": deletions,
    }


def _extract_section_content(
    snapshot_content: dict | None, section_id: UUID
) -> dict | None:
    """PlotスナップショットのJSONから指定セクションのcontentを抽出する。

    スナップショット内のsectionsはロールバック前のIDを持つため、
    IDが一致しない場合（ロールバック後のセクションなど）はNoneを返す。
    """
    if not snapshot_content:
        return None

    sections = snapshot_content.get("sections", [])
    section_id_str = str(section_id)
    for sec in sections:
        if str(sec.get("id", "")) == section_id_str:
            return sec.get("content")

    return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  テキスト抽出・差分計算ユーティリティ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def extract_text(content: dict | None) -> str:
    """Tiptap JSONコンテンツからプレーンテキストを抽出する。

    Tiptapドキュメントツリーを再帰的に走査してテキストノードを抽出する。
    構造が認識できない場合はjson.dumpsにフォールバックする。
    """
    if not content:
        return ""

    texts: list[str] = []

    def _walk(node: dict | list) -> None:
        if isinstance(node, list):
            for item in node:
                _walk(item)
            return
        if not isinstance(node, dict):
            return
        if "text" in node:
            texts.append(node["text"])
        if "content" in node:
            _walk(node["content"])

    _walk(content)

    if texts:
        return "\n".join(texts)
    return json.dumps(content, ensure_ascii=False, sort_keys=True)


def compute_diff(from_text: str, to_text: str) -> tuple[list[dict], list[dict]]:
    """difflibを使用して2つの文字列間の行レベル差分を計算する。"""
    additions: list[dict] = []
    deletions: list[dict] = []

    if from_text == to_text:
        return additions, deletions

    from_lines = from_text.splitlines(keepends=True)
    to_lines = to_text.splitlines(keepends=True)

    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
        None, from_lines, to_lines
    ).get_opcodes():
        if tag in ("delete", "replace"):
            for idx in range(i1, i2):
                deletions.append(
                    {"start": idx, "end": idx + 1, "text": from_lines[idx].rstrip("\n")}
                )
        if tag in ("insert", "replace"):
            for idx in range(j1, j2):
                additions.append(
                    {"start": idx, "end": idx + 1, "text": to_lines[idx].rstrip("\n")}
                )

    return additions, deletions


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  カスタム例外
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ConflictError(Exception):
    """楽観的ロックのバージョン不一致時に送出する例外。

    エンドポイント層で409 Conflictに変換される。
    """

    pass


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TTL cleanup: 72時間超過のHotOperationを削除
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def delete_expired_hot_operations(db: Session) -> int:
    """Delete hot_operations older than 72 hours.

    スケジューラから定期的に呼び出されることを想定。
    HotOperationのTTL（72時間）を超過したレコードを一括削除する。

    Returns:
        Number of deleted records.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

    result = (
        db.query(HotOperation)
        .filter(HotOperation.created_at < cutoff)
        .delete(synchronize_session="fetch")
    )

    db.commit()
    return result
