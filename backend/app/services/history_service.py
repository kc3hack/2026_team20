"""History service - 2-layer storage business logic.

Phase 1 (Hot): Operation logs in hot_operations (72h TTL)
Phase 2 (Cold): Snapshots in cold_snapshots (permanent)
"""

import difflib
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from app.models import HotOperation, ColdSnapshot, Section, User


# TTL for hot operations (72 hours)
HOT_OPERATION_TTL_HOURS = 72


def record_operation(
    db: Session,
    section_id: UUID,
    user_id: UUID,
    operation_type: str,
    payload: dict | None = None,
) -> HotOperation:
    """Record an operation in hot_operations and create a cold snapshot.

    1. Increment section version (atomic SQL-level update)
    2. Save operation log (Phase 1 - hot, 72h)
    3. Save content snapshot (Phase 2 - cold, permanent)
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Validate user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Atomic version increment at SQL level (no row lock required)
    db.execute(
        sa_update(Section)
        .where(Section.id == section_id)
        .values(version=Section.version + 1)
    )
    db.flush()
    db.refresh(section)
    new_version = section.version

    # Phase 1: Record hot operation
    operation = HotOperation(
        section_id=section_id,
        operation_type=operation_type,
        payload=payload,
        user_id=user_id,
        version=new_version,
    )
    db.add(operation)

    # Phase 2: Create cold snapshot of current content
    snapshot = ColdSnapshot(
        section_id=section_id,
        content=section.content,
        version=new_version,
    )
    db.add(snapshot)

    db.commit()
    db.refresh(operation)
    return operation


def get_history(
    db: Session,
    section_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Get operation history for a section (72h window only).

    Returns list of history items with user info, and total count.
    Uses JOIN to avoid N+1 query problem.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

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

    # Batch-load user data: collect unique user_ids and query once
    user_ids = {op.user_id for op in operations}
    users = db.query(User).filter(User.id.in_(user_ids)).all()
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


def rollback_to_version(
    db: Session,
    section_id: UUID,
    version: int,
    user_id: UUID | None = None,
) -> Section:
    """Rollback a section to a specific version.

    Only allowed if version is within the 72h hot operation window.
    Version always increments forward (content is restored, not the version number).
    The rollback operation itself is recorded in history.
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # Check the operation at that version is within 72h
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)
    operation = (
        db.query(HotOperation)
        .filter(
            HotOperation.section_id == section_id,
            HotOperation.version == version,
            HotOperation.created_at >= cutoff,
        )
        .first()
    )

    if not operation:
        raise ValueError("Version not found or outside 72-hour rollback window")

    # Get the cold snapshot for the target version
    snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == version,
        )
        .first()
    )

    if not snapshot:
        raise ValueError("Snapshot not found for this version")

    # Restore content from snapshot, but increment version forward (never go backwards)
    db.execute(
        sa_update(Section)
        .where(Section.id == section_id)
        .values(version=Section.version + 1, content=snapshot.content)
    )
    db.flush()
    db.refresh(section)

    # Record the rollback as an operation so history is not broken
    rollback_op = HotOperation(
        section_id=section_id,
        operation_type="rollback",
        payload={"restored_version": version},
        user_id=user_id or operation.user_id,
        version=section.version,
    )
    db.add(rollback_op)

    rollback_snapshot = ColdSnapshot(
        section_id=section_id,
        content=section.content,
        version=section.version,
    )
    db.add(rollback_snapshot)

    db.commit()
    db.refresh(section)
    return section


def get_diff(
    db: Session,
    section_id: UUID,
    from_version: int,
    to_version: int,
) -> dict:
    """Compute diff between two snapshot versions.

    Uses difflib for line-level unified diff comparison.
    """
    from_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == from_version,
        )
        .first()
    )

    to_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == to_version,
        )
        .first()
    )

    if not from_snapshot or not to_snapshot:
        raise ValueError("Snapshot not found for one or both versions")

    # Extract text content from Tiptap JSON
    from_text = _extract_text(from_snapshot.content)
    to_text = _extract_text(to_snapshot.content)

    additions, deletions = _compute_diff(from_text, to_text)

    return {
        "from_version": from_version,
        "to_version": to_version,
        "additions": additions,
        "deletions": deletions,
    }


def _extract_text(content: dict | None) -> str:
    """Extract plain text from Tiptap JSON content.

    Recursively walks the Tiptap document tree and extracts text nodes.
    Falls back to json.dumps if the structure is unrecognized.
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
        # Tiptap text nodes have a "text" field
        if "text" in node:
            texts.append(node["text"])
        # Recurse into "content" array (Tiptap block structure)
        if "content" in node:
            _walk(node["content"])

    _walk(content)

    if texts:
        return "\n".join(texts)
    # Fallback: serialize as JSON for non-Tiptap content
    return json.dumps(content, ensure_ascii=False, sort_keys=True)


def _compute_diff(from_text: str, to_text: str) -> tuple[list[dict], list[dict]]:
    """Compute line-level diff between two strings using difflib.

    Returns (additions, deletions) where each item has line number and text.
    """
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
                deletions.append({"start": idx, "end": idx + 1, "text": from_lines[idx].rstrip("\n")})
        if tag in ("insert", "replace"):
            for idx in range(j1, j2):
                additions.append({"start": idx, "end": idx + 1, "text": to_lines[idx].rstrip("\n")})

    return additions, deletions
"""履歴サービス - 2層ストレージのビジネスロジック。

フェーズ1（ホット）: hot_operationsの操作ログ（72時間のTTL）
フェーズ2（コールド）: cold_snapshotsのスナップショット（永続的）
"""

import difflib
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from app.models import ColdSnapshot, HotOperation, Section, User

# ホット操作のTTL（72時間）
HOT_OPERATION_TTL_HOURS = 72


def record_operation(
    db: Session,
    section_id: UUID,
    user_id: UUID,
    operation_type: str,
    payload: dict | None = None,
) -> HotOperation:
    """hot_operationsに操作を記録し、コールドスナップショットを作成する。

    1. セクションのバージョンをインクリメント（アトミックなSQLレベル更新）
    2. 操作ログを保存（フェーズ1 - ホット、72時間）
    3. コンテンツスナップショットを保存（フェーズ2 - コールド、永続的）
    """
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise ValueError("Section not found")

    # ユーザーの存在を検証
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

    # フェーズ1: ホット操作を記録
    operation = HotOperation(
        section_id=section_id,
        operation_type=operation_type,
        payload=payload,
        user_id=user_id,
        version=new_version,
    )
    db.add(operation)

    # フェーズ2: 現在のコンテンツのコールドスナップショットを作成
    snapshot = ColdSnapshot(
        section_id=section_id,
        content=section.content,
        version=new_version,
    )
    db.add(snapshot)

    try:
        db.add(operation)
        db.add(snapshot)
        db.commit()
        db.refresh(operation)
        return operation
    except SQLAlchemyError as e:
        db.rollback()
        raise


def get_history(
    db: Session,
    section_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """セクションの操作履歴を取得する（72時間のウィンドウのみ）。

    ユーザー情報を含む履歴項目のリストと総数を返す。
    N+1クエリ問題を回避するためにJOINを使用。
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)

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

    # ユーザーデータを一括読み込み: 一意のuser_idを収集して一度だけクエリ
    user_ids = {op.user_id for op in operations}
    users = db.query(User).filter(User.id.in_(user_ids)).all()
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


def rollback_to_version(
    db: Session,
    section_id: UUID,
    version: int,
    user_id: UUID | None = None,
) -> Section:
    """セクションを特定のバージョンにロールバックする。

    バージョンが72時間のホット操作ウィンドウ内にある場合のみ許可される。
    バージョンは常に前方にインクリメントされる（コンテンツが復元され、バージョン番号は復元されない）。
    ロールバック操作自体が履歴に記録される。
    """
    section = (
        db.query(Section)
        .filter(Section.id == section_id)
        .with_for_update()
        .first()
    )
    if not section:
        raise ValueError("Section not found")

    # そのバージョンの操作が72時間以内であることを確認
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOT_OPERATION_TTL_HOURS)
    operation = (
        db.query(HotOperation)
        .filter(
            HotOperation.section_id == section_id,
            HotOperation.version == version,
            HotOperation.created_at >= cutoff,
        )
        .first()
    )

    if not operation:
        raise ValueError("Version not found or outside 72-hour rollback window")

    # 対象バージョンのコールドスナップショットを取得
    snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == version,
        )
        .first()
    )

    if not snapshot:
        raise ValueError("Snapshot not found for this version")

    # スナップショットからコンテンツを復元するが、バージョンは前方にインクリメント（決して後戻りしない）
    db.execute(
        sa_update(Section)
        .where(Section.id == section_id)
        .values(version=Section.version + 1, content=snapshot.content)
    )
    db.flush()
    db.refresh(section)

    # 履歴が壊れないようにロールバックを操作として記録
    rollback_op = HotOperation(
        section_id=section_id,
        operation_type="rollback",
        payload={"restored_version": version},
        user_id=user_id or operation.user_id,
        version=section.version,
    )
    db.add(rollback_op)

    rollback_snapshot = ColdSnapshot(
        section_id=section_id,
        content=section.content,
        version=section.version,
    )
    db.add(rollback_snapshot)

    try:
        section = db.query(Section).filter(...).with_for_update().first()
        # ... 検証処理 ...
        db.execute(sa_update(Section).where(...))
        db.flush()
        db.add(rollback_op)
        db.add(rollback_snapshot)
        db.commit()
        db.refresh(section)
        return section
    except SQLAlchemyError as e:
        db.rollback()
        raise


def get_diff(
    db: Session,
    section_id: UUID,
    from_version: int,
    to_version: int,
) -> dict:
    """2つのスナップショットバージョン間の差分を計算する。

    行レベルの統一差分比較にdifflibを使用。
    """
    from_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == from_version,
        )
        .first()
    )

    to_snapshot = (
        db.query(ColdSnapshot)
        .filter(
            ColdSnapshot.section_id == section_id,
            ColdSnapshot.version == to_version,
        )
        .first()
    )

    if not from_snapshot or not to_snapshot:
        raise ValueError("Snapshot not found for one or both versions")

    # Tiptap JSONからテキストコンテンツを抽出
    from_text = extract_text(from_snapshot.content)
    to_text = extract_text(to_snapshot.content)

    additions, deletions = compute_diff(from_text, to_text)

    return {
        "from_version": from_version,
        "to_version": to_version,
        "additions": additions,
        "deletions": deletions,
    }


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
        # Tiptapのテキストノードは"text"フィールドを持つ
        if "text" in node:
            texts.append(node["text"])
        # "content"配列に再帰（Tiptapブロック構造）
        if "content" in node:
            _walk(node["content"])

    _walk(content)

    if texts:
        return "\n".join(texts)
    # フォールバック: Tiptap以外のコンテンツはJSONとしてシリアライズ
    return json.dumps(content, ensure_ascii=False, sort_keys=True)


def compute_diff(from_text: str, to_text: str) -> tuple[list[dict], list[dict]]:
    """difflibを使用して2つの文字列間の行レベル差分を計算する。

    各項目が行番号とテキストを持つ(追加, 削除)のタプルを返す。
    """
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
                deletions.append({"start": idx, "end": idx + 1, "text": from_lines[idx].rstrip("\n")})
        if tag in ("insert", "replace"):
            for idx in range(j1, j2):
                additions.append({"start": idx, "end": idx + 1, "text": to_lines[idx].rstrip("\n")})

    return additions, deletions
