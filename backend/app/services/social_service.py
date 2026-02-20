"""ソーシャルサービス - フォーク・スレッド・コメントのロジック。

endpoint 層から呼び出され、DB 操作のみを担当する。
失敗時は ValueError を raise し、endpoint 側で HTTPException に変換する。
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Comment, Fork, Plot, Section, Thread, User


# ─── フォーク ──────────────────────────────────────────────────


def fork_plot(
    db: Session,
    plot_id: UUID,
    user_id: UUID,
    title: str | None = None,
) -> Plot:
    """Plot をフォークする。Plot + 全 Sections を複製し、Fork 追跡レコードを作成する。

    元の Plot が見つからない場合は ValueError を raise する。
    """
    source = db.query(Plot).filter(Plot.id == plot_id).first()
    if not source:
        raise ValueError("Plot not found")

    new_title = title if title else f"{source.title} (fork)"
    new_plot = Plot(
        title=new_title,
        description=source.description,
        tags=list(source.tags) if source.tags else [],
        owner_id=user_id,
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

    # Fork 追跡レコードを作成
    fork_record = Fork(
        source_plot_id=plot_id,
        new_plot_id=new_plot.id,
        user_id=user_id,
    )
    db.add(fork_record)

    db.commit()
    db.refresh(new_plot)

    return new_plot


# ─── スレッド ──────────────────────────────────────────────────


def create_thread(
    db: Session,
    plot_id: UUID,
    section_id: UUID | None = None,
) -> Thread:
    """スレッドを作成する。

    Plot / Section が見つからない場合は ValueError を raise する。
    """
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise ValueError("Plot not found")

    resolved_section_id = None
    if section_id:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise ValueError("Section not found")
        resolved_section_id = section_id

    thread = Thread(
        plot_id=plot_id,
        section_id=resolved_section_id,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

    return thread


# ─── コメント ──────────────────────────────────────────────────


def list_comments(
    db: Session,
    thread_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[tuple[Comment, User | None]], int]:
    """コメント一覧を取得する。

    戻り値は ((Comment, User|None) のリスト, total件数) のタプル。
    Thread が見つからない場合は ValueError を raise する。
    """
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise ValueError("Thread not found")

    total = db.query(Comment).filter(Comment.thread_id == thread_id).count()

    comments = (
        db.query(Comment)
        .filter(Comment.thread_id == thread_id)
        .order_by(Comment.created_at)
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[tuple[Comment, User | None]] = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        items.append((comment, user))

    return items, total


def create_comment(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    content: str,
    parent_comment_id: UUID | None = None,
) -> tuple[Comment, User | None]:
    """コメントを投稿する。

    戻り値は (Comment, User|None) のタプル。
    - 本文が 5000 文字を超える場合: ValueError("Content exceeds 5000 characters")
    - Thread が見つからない場合: ValueError("Thread not found")
    - 親コメントが見つからない場合: ValueError("Parent comment not found")
    """
    # api.md では 400 Bad Request を要求するため、service 側でバリデーション
    if len(content) > 5000:
        raise ValueError("Content exceeds 5000 characters")

    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise ValueError("Thread not found")

    # 親コメントの存在確認
    resolved_parent_id = None
    if parent_comment_id:
        parent = (
            db.query(Comment)
            .filter(
                Comment.id == parent_comment_id,
                Comment.thread_id == thread_id,
            )
            .first()
        )
        if not parent:
            raise ValueError("Parent comment not found")
        resolved_parent_id = parent_comment_id

    comment = Comment(
        thread_id=thread_id,
        user_id=user_id,
        content=content,
        parent_comment_id=resolved_parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    user = db.query(User).filter(User.id == comment.user_id).first()

    return comment, user
