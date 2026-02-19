"""Social endpoints: フォーク・スレッド・コメント。

docs/api.md の SNS セクション準拠:
- POST /plots/{plot_id}/fork          → フォーク作成（要認証）
- POST /threads                       → スレッド作成（要認証）
- GET  /threads/{thread_id}/comments  → コメント一覧取得
- POST /threads/{thread_id}/comments  → コメント投稿（要認証）
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.api.v1.deps import AuthUser, DbSession
from app.models import Comment, Plot, Thread, User
from app.services import social_service

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────
class ForkRequest(BaseModel):
    title: str | None = None


class CreateThreadRequest(BaseModel):
    plotId: str  # noqa: N815 – api.md の命名に合わせる
    sectionId: str | None = None  # noqa: N815


class CreateCommentRequest(BaseModel):
    content: str
    parentCommentId: str | None = None  # noqa: N815


# ─── シリアライズヘルパー ──────────────────────────────────────
def _serialize_user_brief(user: User | None) -> dict | None:
    if user is None:
        return None
    return {
        "id": str(user.id),
        "displayName": user.display_name,
        "avatarUrl": user.avatar_url,
    }


def _serialize_plot(plot: Plot, star_count: int = 0) -> dict:
    """Plot を PlotResponse 形式に変換。"""
    return {
        "id": str(plot.id),
        "title": plot.title,
        "description": plot.description,
        "tags": plot.tags or [],
        "ownerId": str(plot.owner_id),
        "version": plot.version or 0,
        "starCount": star_count,
        "isStarred": False,
        "isPaused": plot.is_paused,
        "createdAt": plot.created_at.isoformat() if plot.created_at else None,
        "updatedAt": plot.updated_at.isoformat() if plot.updated_at else None,
    }


def _serialize_thread(thread: Thread) -> dict:
    return {
        "id": str(thread.id),
        "plotId": str(thread.plot_id),
        "sectionId": str(thread.section_id) if thread.section_id else None,
        "commentCount": len(thread.comments) if thread.comments else 0,
        "createdAt": thread.created_at.isoformat() if thread.created_at else None,
    }


def _serialize_comment(comment: Comment, user: User | None) -> dict:
    return {
        "id": str(comment.id),
        "threadId": str(comment.thread_id),
        "content": comment.content,
        "parentCommentId": str(comment.parent_comment_id) if comment.parent_comment_id else None,
        "user": _serialize_user_brief(user),
        "createdAt": comment.created_at.isoformat() if comment.created_at else None,
    }


# ─── POST /plots/{plot_id}/fork ──────────────────────────────
@router.post(
    "/plots/{plot_id}/fork",
    status_code=status.HTTP_201_CREATED,
)
def fork_plot(plot_id: UUID, body: ForkRequest, db: DbSession, current_user: AuthUser):
    """Plotをフォーク。Plot + 全 Sections を複製する。"""
    try:
        new_plot = social_service.fork_plot(db, plot_id, current_user.id, body.title)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return _serialize_plot(new_plot)


# ─── POST /threads ───────────────────────────────────────────
@router.post(
    "/threads",
    status_code=status.HTTP_201_CREATED,
)
def create_thread(body: CreateThreadRequest, db: DbSession, current_user: AuthUser):
    """スレッド作成。"""
    try:
        thread = social_service.create_thread(db, body.plotId, body.sectionId)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return _serialize_thread(thread)


# ─── GET /threads/{thread_id}/comments ────────────────────────
@router.get("/threads/{thread_id}/comments")
def list_comments(
    thread_id: UUID,
    db: DbSession,
    limit: int = Query(default=50, le=50),
    offset: int = Query(default=0, ge=0),
):
    """コメント一覧取得。"""
    try:
        comment_user_pairs, total = social_service.list_comments(
            db, thread_id, limit, offset
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    items = [_serialize_comment(c, u) for c, u in comment_user_pairs]
    return {"items": items, "total": total}


# ─── POST /threads/{thread_id}/comments ──────────────────────
@router.post(
    "/threads/{thread_id}/comments",
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    thread_id: UUID,
    body: CreateCommentRequest,
    db: DbSession,
    current_user: AuthUser,
):
    """コメント投稿。本文 5000 文字制限は api.md に合わせて 400 で返す。"""
    try:
        comment, user = social_service.create_comment(
            db, thread_id, current_user.id, body.content, body.parentCommentId
        )
    except ValueError as e:
        # "Content exceeds 5000 characters" → 400
        # "Thread not found" / "Parent comment not found" → 404
        if "5000" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return _serialize_comment(comment, user)
