"""Sections endpoints: CRUD・並び替え。

docs/api.md の Sections セクション準拠:
- GET    /plots/{plot_id}/sections        → セクション一覧取得
- POST   /plots/{plot_id}/sections        → セクション作成（要認証）
- GET    /sections/{section_id}           → セクション詳細取得
- PUT    /sections/{section_id}           → セクション更新（要認証）
- DELETE /sections/{section_id}           → セクション削除（要認証）
- POST   /sections/{section_id}/reorder   → セクション並び替え（要認証）
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.v1.deps import AuthUser, DbSession
from app.api.v1.utils import section_to_response
from app.schemas import SectionListResponse, SectionResponse
from app.services import section_service

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────
class CreateSectionRequest(BaseModel):
    title: str
    content: dict | None = None
    orderIndex: int | None = None  # noqa: N815


class UpdateSectionRequest(BaseModel):
    title: str | None = None
    content: dict | None = ...  # sentinel: 未指定と明示的 null を区別


class ReorderSectionRequest(BaseModel):
    newOrder: int  # noqa: N815


# Section シリアライズは utils.section_to_response() に統一



# ─── エラーハンドリングヘルパー ────────────────────────────────


def _handle_service_error(e: Exception) -> None:
    """Service 層の例外を HTTPException に変換する。

    - ValueError("Section not found") / ValueError("Plot not found") → 404
    - ValueError("Section limit reached") → 400
    - ValueError("Invalid order") → 400
    - PermissionError("Plot is paused") → 403
    """
    msg = str(e)
    if isinstance(e, PermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg,
        )
    if "not found" in msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg,
        )
    # "Section limit reached", "Invalid order" 等
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=msg,
    )


# ─── GET /plots/{plot_id}/sections ────────────────────────────
@router.get("/plots/{plot_id}/sections", response_model=SectionListResponse)
def list_sections(plot_id: UUID, db: DbSession):
    """セクション一覧取得。"""
    try:
        sections, total = section_service.list_sections(db, plot_id)
    except ValueError as e:
        _handle_service_error(e)

    items = [section_to_response(s) for s in sections]
    return SectionListResponse(items=items, total=total)


# ─── POST /plots/{plot_id}/sections ───────────────────────────
@router.post(
    "/plots/{plot_id}/sections",
    status_code=status.HTTP_201_CREATED,
    response_model=SectionResponse,
)
def create_section(
    plot_id: UUID,
    body: CreateSectionRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """セクション作成（要認証）。"""
    try:
        section = section_service.create_section(
            db,
            plot_id=plot_id,
            title=body.title,
            content=body.content,
            order_index=body.orderIndex,
        )
    except (ValueError, PermissionError) as e:
        _handle_service_error(e)

    return section_to_response(section)


# ─── GET /sections/{section_id} ──────────────────────────────
@router.get("/sections/{section_id}", response_model=SectionResponse)
def get_section(section_id: UUID, db: DbSession):
    """セクション詳細取得。"""
    try:
        section = section_service.get_section(db, section_id)
    except ValueError as e:
        _handle_service_error(e)

    return section_to_response(section)


# ─── PUT /sections/{section_id} ──────────────────────────────
@router.put("/sections/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: UUID,
    body: UpdateSectionRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """セクション更新（要認証）。Plotが一時停止中は 403。"""
    try:
        section = section_service.update_section(
            db,
            section_id=section_id,
            title=body.title,
            content=body.content,
        )
    except (ValueError, PermissionError) as e:
        _handle_service_error(e)

    return section_to_response(section)


# ─── DELETE /sections/{section_id} ───────────────────────────
@router.delete(
    "/sections/{section_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_section(
    section_id: UUID,
    db: DbSession,
    current_user: AuthUser,
):
    """セクション削除（要認証）。Plotが一時停止中は 403。"""
    try:
        section_service.delete_section(db, section_id)
    except (ValueError, PermissionError) as e:
        _handle_service_error(e)


# ─── POST /sections/{section_id}/reorder ─────────────────────
@router.post("/sections/{section_id}/reorder", response_model=SectionResponse)
def reorder_section(
    section_id: UUID,
    body: ReorderSectionRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """セクション並び替え（要認証）。"""
    try:
        section = section_service.reorder_section(
            db,
            section_id=section_id,
            new_order=body.newOrder,
        )
    except (ValueError, PermissionError) as e:
        _handle_service_error(e)

    return section_to_response(section)
