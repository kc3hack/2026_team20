"""History API endpoints - 2-layer storage (hot operations + cold snapshots).

設計変更（renew-api.md準拠）:
- セクション単位ロールバック（POST /sections/{sectionId}/rollback/{version}）は廃止
- Plot全体ロールバック（POST /plots/{plotId}/rollback/{snapshotId}）を新設
- スナップショット一覧・詳細、ロールバック監査ログを新設
- 維持: 操作ログ保存、履歴一覧取得、差分取得
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.v1.deps import AuthUser, DbSession
from app.models import Plot, Section
from app.services import history_service
from app.services.history_service import ConflictError

router = APIRouter()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Schemas（history エンドポイント専用）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class UserBrief(BaseModel):
    id: str
    displayName: str
    avatarUrl: str | None = None


class CreateOperationRequest(BaseModel):
    operationType: str
    position: int | None = None
    content: str | None = None
    length: int | None = None


class CreateOperationResponse(BaseModel):
    id: str
    version: int


class HistoryItem(BaseModel):
    id: str
    sectionId: str
    operationType: str
    payload: dict | None = None
    user: UserBrief
    version: int
    createdAt: datetime


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class DiffResponse(BaseModel):
    fromVersion: int
    toVersion: int
    additions: list[dict]
    deletions: list[dict]


class SectionResponse(BaseModel):
    id: str
    plotId: str
    title: str
    content: dict | None = None
    orderIndex: int
    version: int
    createdAt: datetime
    updatedAt: datetime


class PlotDetailResponse(BaseModel):
    """api.md PlotDetailResponse 準拠。ロールバック結果として返す。"""

    id: str
    title: str
    description: str | None = None
    tags: list[str]
    ownerId: str
    starCount: int
    isStarred: bool
    isPaused: bool
    version: int
    thumbnailUrl: str | None = None
    createdAt: datetime
    updatedAt: datetime
    sections: list[SectionResponse]
    owner: UserBrief | None = None


class RollbackRequest(BaseModel):
    expectedVersion: int | None = None
    reason: str | None = None


class SnapshotResponse(BaseModel):
    id: str
    plotId: str
    version: int
    createdAt: datetime


class SnapshotListResponse(BaseModel):
    items: list[SnapshotResponse]
    total: int


class SnapshotDetailResponse(BaseModel):
    id: str
    plotId: str
    version: int
    content: dict | None = None
    createdAt: datetime


class RollbackLogResponse(BaseModel):
    id: str
    plotId: str
    snapshotId: str | None = None
    snapshotVersion: int
    user: UserBrief
    reason: str | None = None
    createdAt: datetime


class RollbackLogListResponse(BaseModel):
    items: list[RollbackLogResponse]
    total: int


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ヘルパー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _build_plot_detail_response(plot: Plot, db: DbSession) -> PlotDetailResponse:
    """PlotモデルからPlotDetailResponseを構築する。"""
    owner_brief = None
    if plot.owner:
        owner_brief = UserBrief(
            id=str(plot.owner.id),
            displayName=plot.owner.display_name,
            avatarUrl=plot.owner.avatar_url,
        )

    sections = (
        db.query(Section)
        .filter(Section.plot_id == plot.id)
        .order_by(Section.order_index)
        .all()
    )

    section_responses = [
        SectionResponse(
            id=str(s.id),
            plotId=str(s.plot_id),
            title=s.title,
            content=s.content,
            orderIndex=s.order_index,
            version=s.version,
            createdAt=s.created_at,
            updatedAt=s.updated_at,
        )
        for s in sections
    ]

    # starCount: starsリレーションが読み込まれていれば実数、なければ0
    star_count = len(plot.stars) if plot.stars else 0
    # Known limitation: isStarred is always False in rollback response.
    # Why: Rollback is a system-level operation and the requesting user's
    # star status is not relevant to the rollback result. To resolve this,
    # the caller's user_id would need to be passed through and checked
    # against the stars table, which is not worth the complexity here.

    return PlotDetailResponse(
        id=str(plot.id),
        title=plot.title,
        description=plot.description,
        tags=plot.tags or [],
        ownerId=str(plot.owner_id),
        starCount=star_count,
        isStarred=False,
        isPaused=plot.is_paused,
        version=plot.version,
        thumbnailUrl=plot.thumbnail_url,
        createdAt=plot.created_at,
        updatedAt=plot.updated_at,
        sections=section_responses,
        owner=owner_brief,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  維持エンドポイント: 操作ログ保存
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post(
    "/sections/{section_id}/operations",
    status_code=201,
    response_model=CreateOperationResponse,
)
def create_operation(
    section_id: UUID,
    body: CreateOperationRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """Record an operation log for a section (Phase 1: hot, 72h TTL)."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    payload = {
        "position": body.position,
        "content": body.content,
        "length": body.length,
    }

    try:
        operation = history_service.record_operation(
            db=db,
            section_id=section_id,
            user_id=current_user.id,
            operation_type=body.operationType,
            payload=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"id": str(operation.id), "version": operation.version}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  維持エンドポイント: 履歴一覧取得（72時間）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get(
    "/sections/{section_id}/history",
    response_model=HistoryListResponse,
)
def get_history(
    section_id: UUID,
    db: DbSession,
    limit: int = Query(default=50, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """Get operation history for a section (72h window only)."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    items, total = history_service.get_history(
        db=db,
        section_id=section_id,
        limit=limit,
        offset=offset,
    )

    history_items = []
    for item in items:
        user_data = item.get("user")
        user_brief = (
            UserBrief(
                id=str(user_data["id"]),
                displayName=user_data["displayName"],
                avatarUrl=user_data.get("avatarUrl"),
            )
            if user_data
            else UserBrief(
                id="00000000-0000-0000-0000-000000000000",
                displayName="Unknown",
                avatarUrl=None,
            )
        )

        history_items.append(
            HistoryItem(
                id=str(item["id"]),
                sectionId=str(item["section_id"]),
                operationType=item["operation_type"],
                payload=item["payload"],
                user=user_brief,
                version=item["version"],
                createdAt=item["created_at"],
            )
        )

    return HistoryListResponse(items=history_items, total=total)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  維持エンドポイント: 差分取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get(
    "/sections/{section_id}/diff/{from_version}/{to_version}",
    response_model=DiffResponse,
)
def get_diff(
    section_id: UUID,
    from_version: int,
    to_version: int,
    db: DbSession,
):
    """Get diff between two snapshot versions."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    try:
        diff = history_service.get_diff(
            db=db,
            section_id=section_id,
            from_version=from_version,
            to_version=to_version,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return DiffResponse(
        fromVersion=diff["from_version"],
        toVersion=diff["to_version"],
        additions=diff["additions"],
        deletions=diff["deletions"],
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  新設エンドポイント: スナップショット一覧
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get(
    "/plots/{plot_id}/snapshots",
    response_model=SnapshotListResponse,
)
def list_snapshots(
    plot_id: UUID,
    db: DbSession,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """Get snapshot list for a plot."""
    # Plotの存在確認
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    snapshots, total = history_service.get_plot_snapshots(
        db=db,
        plot_id=plot_id,
        limit=limit,
        offset=offset,
    )

    items = [
        SnapshotResponse(
            id=str(s.id),
            plotId=str(s.plot_id),
            version=s.version,
            createdAt=s.created_at,
        )
        for s in snapshots
    ]

    return SnapshotListResponse(items=items, total=total)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  新設エンドポイント: スナップショット詳細（プレビュー用）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get(
    "/plots/{plot_id}/snapshots/{snapshot_id}",
    response_model=SnapshotDetailResponse,
)
def get_snapshot_detail(
    plot_id: UUID,
    snapshot_id: UUID,
    db: DbSession,
):
    """Get snapshot detail for preview before rollback."""
    try:
        snapshot = history_service.get_snapshot_detail(
            db=db,
            plot_id=plot_id,
            snapshot_id=snapshot_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return SnapshotDetailResponse(
        id=str(snapshot.id),
        plotId=str(snapshot.plot_id),
        version=snapshot.version,
        content=snapshot.content,
        createdAt=snapshot.created_at,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  新設エンドポイント: Plot全体ロールバック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post(
    "/plots/{plot_id}/rollback/{snapshot_id}",
    response_model=PlotDetailResponse,
)
def rollback_plot(
    plot_id: UUID,
    snapshot_id: UUID,
    db: DbSession,
    current_user: AuthUser,
    body: RollbackRequest | None = None,
):
    """Rollback a plot to a specific snapshot (plot-level, optimistic locking).

    処理フロー:
    1. expectedVersionが指定されている場合、plots.versionと比較
    2. 不一致の場合は409 Conflictを返却
    3. 一致する場合、スナップショットの内容でPlot全体を上書き
    4. plots.versionをインクリメント
    5. rollback_logsテーブルに監査ログを記録
    """
    expected_version = body.expectedVersion if body else None
    reason = body.reason if body else None

    try:
        plot = history_service.rollback_plot_to_snapshot(
            db=db,
            plot_id=plot_id,
            snapshot_id=snapshot_id,
            user_id=current_user.id,
            expected_version=expected_version,
            reason=reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return _build_plot_detail_response(plot, db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  新設エンドポイント: ロールバック監査ログ一覧
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get(
    "/plots/{plot_id}/rollback-logs",
    response_model=RollbackLogListResponse,
)
def list_rollback_logs(
    plot_id: UUID,
    db: DbSession,
    current_user: AuthUser,
    limit: int = Query(default=20, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """Get rollback audit logs for a plot (owner or admin only)."""
    # Plotの存在確認
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    # 所有者チェック（api.md: Plot所有者または管理者のみ）
    # 管理者チェックはroleベースで行う（将来的にrole=='admin'の判定を追加可能）
    is_owner = str(plot.owner_id) == str(current_user.id)
    is_admin = getattr(current_user, "role", None) == "admin"
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only the plot owner or an admin can view rollback logs",
        )

    items, total = history_service.get_rollback_logs(
        db=db,
        plot_id=plot_id,
        limit=limit,
        offset=offset,
    )

    log_items = []
    for item in items:
        user_data = item.get("user")
        user_brief = (
            UserBrief(
                id=str(user_data["id"]),
                displayName=user_data["displayName"],
                avatarUrl=user_data.get("avatarUrl"),
            )
            if user_data
            else UserBrief(
                id="00000000-0000-0000-0000-000000000000",
                displayName="Unknown",
                avatarUrl=None,
            )
        )

        log_items.append(
            RollbackLogResponse(
                id=str(item["id"]),
                plotId=str(item["plot_id"]),
                snapshotId=str(item["snapshot_id"]) if item["snapshot_id"] else None,
                snapshotVersion=item["snapshot_version"],
                user=user_brief,
                reason=item["reason"],
                createdAt=item["created_at"],
            )
        )

    return RollbackLogListResponse(items=log_items, total=total)
