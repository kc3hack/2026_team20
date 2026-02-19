"""Social endpoints: フォーク・スレッド・コメント。

docs/api.md の SNS セクション準拠:
- POST /plots/{plot_id}/fork          → フォーク作成（要認証）
- POST /threads                       → スレッド作成（要認証）
- GET  /threads/{thread_id}/comments  → コメント一覧取得
- POST /threads/{thread_id}/comments  → コメント投稿（要認証）
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.v1.deps import AuthUser, DbSession
from app.models import Comment, Fork, Plot, Section, Thread, User

router = APIRouter()


# ─── Request / Response Schemas ───────────────────────────────
class ForkRequest(BaseModel):
    title: str | None = None


class CreateThreadRequest(BaseModel):
    plotId: str  # noqa: N815 – api.md の命名に合わせる
    sectionId: str | None = None  # noqa: N815


class CreateCommentRequest(BaseModel):
    content: str
    parentCommentId: str | None = None  # noqa: N815


# ─── ヘルパー ──────────────────────────────────────────────────
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
    source = db.query(Plot).filter(Plot.id == plot_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found",
        )

    # 新しい Plot を作成
    new_title = body.title if body.title else f"{source.title} (fork)"
    new_plot = Plot(
        title=new_title,
        description=source.description,
        tags=list(source.tags) if source.tags else [],
        owner_id=current_user.id,
    )
    db.add(new_plot)
    db.flush()  # new_plot.id を確定させる

    # セクションを複製
    source_sections = (
        db.query(Section)
        .filter(Section.plot_id == plot_id)
        .order_by(Section.order_index)
        .all()
    )
    for section in source_sections:
        new_section = Section(
            plot_id=new_plot.id,
            title=section.title,
            content=section.content,
            order_index=section.order_index,
        )
        db.add(new_section)

    # Fork レコードを作成（追跡用）
    fork_record = Fork(
        source_plot_id=plot_id,
        new_plot_id=new_plot.id,
        user_id=current_user.id,
    )
    db.add(fork_record)

    db.commit()
    db.refresh(new_plot)

    return _serialize_plot(new_plot)


# ─── POST /threads ───────────────────────────────────────────
@router.post(
    "/threads",
    status_code=status.HTTP_201_CREATED,
)
def create_thread(body: CreateThreadRequest, db: DbSession, current_user: AuthUser):
    """スレッド作成。"""
    # Plot の存在確認
    plot = db.query(Plot).filter(Plot.id == body.plotId).first()
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found",
        )

    # sectionId が指定されている場合、存在確認
    section_id = None
    if body.sectionId:
        section = db.query(Section).filter(Section.id == body.sectionId).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found",
            )
        section_id = body.sectionId

    thread = Thread(
        plot_id=body.plotId,
        section_id=section_id,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

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
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )

    total = db.query(Comment).filter(Comment.thread_id == thread_id).count()

    comments = (
        db.query(Comment)
        .filter(Comment.thread_id == thread_id)
        .order_by(Comment.created_at)
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        items.append(_serialize_comment(comment, user))

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
    # api.md では 400 Bad Request を要求するため、Pydantic ではなく手動で検証
    if len(body.content) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content exceeds 5000 characters",
        )

    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )

    # 親コメントが指定されている場合、存在確認
    parent_id = None
    if body.parentCommentId:
        parent = (
            db.query(Comment)
            .filter(
                Comment.id == body.parentCommentId,
                Comment.thread_id == thread_id,
            )
            .first()
        )
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent comment not found",
            )
        parent_id = body.parentCommentId

    comment = Comment(
        thread_id=thread_id,
        user_id=current_user.id,
        content=body.content,
        parent_comment_id=parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    user = db.query(User).filter(User.id == comment.user_id).first()

    return _serialize_comment(comment, user)
