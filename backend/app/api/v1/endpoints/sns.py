"""SNS endpoints: stars, forks, threads, comments, search, ranking."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, and_
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.models import Plot, Section, User, Star, Fork, Thread, Comment
from app.schemas import (
    StarListResponse,
    StarItem,
    ThreadResponse,
    CommentListResponse,
    CommentResponse,
    SearchResponse,
    PlotResponse,
    PlotListResponse,
    CreateThreadRequest,
    CreateCommentRequest,
)

router = APIRouter()


# ==================== Stars ====================


@router.get("/plots/{plot_id}/stars", response_model=StarListResponse)
async def list_stars(plot_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get list of users who starred a plot."""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(404, "Plot not found")

    stars = (
        db.execute(
            select(Star).where(Star.plot_id == plot_id).order_by(desc(Star.created_at))
        )
        .scalars()
        .all()
    )

    items = []
    for star in stars:
        user = db.get(User, star.user_id)
        if user:
            items.append(
                StarItem(
                    id=star.id,
                    userId=user.id,
                    displayName=user.display_name,
                    avatarUrl=user.avatar_url,
                    createdAt=star.created_at,
                )
            )

    return StarListResponse(items=items, total=len(items))


@router.post("/plots/{plot_id}/stars", status_code=201)
async def add_star(plot_id: uuid.UUID, db: Session = Depends(get_db)):
    """Add a star to a plot."""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(404, "Plot not found")

    # TODO: Get user from auth
    # For now, use a placeholder user
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Check if already starred
    existing = db.execute(
        select(Star).where(Star.plot_id == plot_id, Star.user_id == user_id)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(409, "Already starred")

    star = Star(plot_id=plot_id, user_id=user_id)
    db.add(star)
    db.commit()

    return {"status": "ok"}


@router.delete("/plots/{plot_id}/stars", status_code=204)
async def remove_star(plot_id: uuid.UUID, db: Session = Depends(get_db)):
    """Remove a star from a plot."""
    # TODO: Get user from auth
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    star = db.execute(
        select(Star).where(Star.plot_id == plot_id, Star.user_id == user_id)
    ).scalar_one_or_none()

    if not star:
        raise HTTPException(404, "Star not found")

    db.delete(star)
    db.commit()

    return None


# ==================== Forks ====================


@router.post("/plots/{plot_id}/fork", response_model=PlotResponse, status_code=201)
async def fork_plot(plot_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fork a plot."""
    source_plot = db.get(Plot, plot_id)
    if not source_plot:
        raise HTTPException(404, "Source plot not found")

    # TODO: Get user from auth
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Create new plot
    new_plot = Plot(
        title=source_plot.title,
        description=source_plot.description,
        owner_id=user_id,
        tags=source_plot.tags,
    )
    db.add(new_plot)
    db.flush()

    # Copy sections
    sections = (
        db.execute(
            select(Section)
            .where(Section.plot_id == plot_id)
            .order_by(Section.order_index)
        )
        .scalars()
        .all()
    )

    for section in sections:
        new_section = Section(
            plot_id=new_plot.id,
            title=section.title,
            content=section.content,
            order_index=section.order_index,
        )
        db.add(new_section)

    # Record fork
    fork = Fork(
        source_plot_id=plot_id,
        new_plot_id=new_plot.id,
        user_id=user_id,
    )
    db.add(fork)
    db.commit()

    return PlotResponse(
        id=new_plot.id,
        title=new_plot.title,
        description=new_plot.description,
        ownerId=new_plot.owner_id,
        tags=new_plot.tags or [],
        starCount=0,
        isStarred=False,
        isPaused=False,
        editingUsers=[],
        createdAt=new_plot.created_at,
        updatedAt=new_plot.updated_at,
    )


# ==================== Threads & Comments ====================


@router.post("/threads", response_model=ThreadResponse, status_code=201)
async def create_thread(request: CreateThreadRequest, db: Session = Depends(get_db)):
    """Create a new thread."""
    plot = db.get(Plot, request.plotId)
    if not plot:
        raise HTTPException(404, "Plot not found")

    if request.sectionId:
        section = db.get(Section, request.sectionId)
        if not section:
            raise HTTPException(404, "Section not found")

    thread = Thread(
        plot_id=request.plotId,
        section_id=request.sectionId,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

    return ThreadResponse(
        id=thread.id,
        plotId=thread.plot_id,
        sectionId=thread.section_id,
        commentCount=0,
        createdAt=thread.created_at,
    )


@router.get("/threads/{thread_id}/comments", response_model=CommentListResponse)
async def list_comments(
    thread_id: uuid.UUID,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    """List comments in a thread."""
    thread = db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")

    comments = (
        db.execute(
            select(Comment)
            .where(Comment.thread_id == thread_id)
            .order_by(Comment.created_at)
            .offset(offset)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    total = db.execute(
        select(func.count(Comment.id)).where(Comment.thread_id == thread_id)
    ).scalar()

    items = []
    for comment in comments:
        user = db.get(User, comment.user_id)
        items.append(
            CommentResponse(
                id=comment.id,
                threadId=comment.thread_id,
                userId=comment.user_id,
                displayName=user.display_name if user else "Unknown",
                avatarUrl=user.avatar_url if user else None,
                content=comment.content,
                parentCommentId=comment.parent_comment_id,
                createdAt=comment.created_at,
            )
        )

    return CommentListResponse(items=items, total=total)


@router.post(
    "/threads/{thread_id}/comments", response_model=CommentResponse, status_code=201
)
async def create_comment(
    thread_id: uuid.UUID,
    request: CreateCommentRequest,
    db: Session = Depends(get_db),
):
    """Post a comment to a thread."""
    thread = db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")

    if len(request.content) > 5000:
        raise HTTPException(400, "Content exceeds 5000 characters")

    # TODO: Get user from auth
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    if request.parentCommentId:
        parent = db.get(Comment, request.parentCommentId)
        if not parent or parent.thread_id != thread_id:
            raise HTTPException(404, "Parent comment not found")

    comment = Comment(
        thread_id=thread_id,
        user_id=user_id,
        content=request.content,
        parent_comment_id=request.parentCommentId,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    user = db.get(User, user_id)

    return CommentResponse(
        id=comment.id,
        threadId=comment.thread_id,
        userId=comment.user_id,
        displayName=user.display_name if user else "Unknown",
        avatarUrl=user.avatar_url if user else None,
        content=comment.content,
        parentCommentId=comment.parent_comment_id,
        createdAt=comment.created_at,
    )


# ==================== Ranking ====================


@router.get("/plots/trending", response_model=PlotListResponse)
async def list_trending(
    limit: int = Query(default=5, le=100),
    db: Session = Depends(get_db),
):
    """List trending plots (star growth in last 72 hours)."""
    seventy_two_hours_ago = datetime.utcnow() - timedelta(hours=72)

    # Count stars in last 72 hours per plot
    trending = db.execute(
        select(Plot, func.count(Star.id).label("star_count"))
        .outerjoin(
            Star,
            and_(Star.plot_id == Plot.id, Star.created_at >= seventy_two_hours_ago),
        )
        .group_by(Plot.id)
        .order_by(desc("star_count"), desc(Plot.updated_at))
        .limit(limit)
    ).all()

    items = []
    for plot, _ in trending:
        star_count = (
            db.execute(
                select(func.count(Star.id)).where(Star.plot_id == plot.id)
            ).scalar()
            or 0
        )

        items.append(
            PlotResponse(
                id=plot.id,
                title=plot.title,
                description=plot.description,
                ownerId=plot.owner_id,
                tags=plot.tags or [],
                starCount=star_count,
                isStarred=False,
                isPaused=plot.is_paused or False,
                editingUsers=[],
                createdAt=plot.created_at,
                updatedAt=plot.updated_at,
            )
        )

    return PlotListResponse(items=items, total=len(items))


@router.get("/plots/popular", response_model=PlotListResponse)
async def list_popular(
    limit: int = Query(default=5, le=100),
    db: Session = Depends(get_db),
):
    """List popular plots (total star count all time)."""
    popular = db.execute(
        select(Plot, func.count(Star.id).label("star_count"))
        .outerjoin(Star, Star.plot_id == Plot.id)
        .group_by(Plot.id)
        .order_by(desc("star_count"), desc(Plot.updated_at))
        .limit(limit)
    ).all()

    items = []
    for plot, star_count in popular:
        items.append(
            PlotResponse(
                id=plot.id,
                title=plot.title,
                description=plot.description,
                ownerId=plot.owner_id,
                tags=plot.tags or [],
                starCount=star_count or 0,
                isStarred=False,
                isPaused=plot.is_paused or False,
                editingUsers=[],
                createdAt=plot.created_at,
                updatedAt=plot.updated_at,
            )
        )

    return PlotListResponse(items=items, total=len(items))


@router.get("/plots/new", response_model=PlotListResponse)
async def list_new(
    limit: int = Query(default=5, le=100),
    db: Session = Depends(get_db),
):
    """List newest plots."""
    plots = (
        db.execute(select(Plot).order_by(desc(Plot.created_at)).limit(limit))
        .scalars()
        .all()
    )

    items = []
    for plot in plots:
        star_count = (
            db.execute(
                select(func.count(Star.id)).where(Star.plot_id == plot.id)
            ).scalar()
            or 0
        )

        items.append(
            PlotResponse(
                id=plot.id,
                title=plot.title,
                description=plot.description,
                ownerId=plot.owner_id,
                tags=plot.tags or [],
                starCount=star_count,
                isStarred=False,
                isPaused=plot.is_paused or False,
                editingUsers=[],
                createdAt=plot.created_at,
                updatedAt=plot.updated_at,
            )
        )

    return PlotListResponse(items=items, total=len(items))


# ==================== Search ====================


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(min_length=1),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    """Search plots by title and description."""
    search_pattern = f"%{q}%"

    plots = (
        db.execute(
            select(Plot)
            .where(
                (Plot.title.ilike(search_pattern))
                | (Plot.description.ilike(search_pattern))
            )
            .order_by(desc(Plot.updated_at))
            .offset(offset)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    total = db.execute(
        select(func.count(Plot.id)).where(
            (Plot.title.ilike(search_pattern))
            | (Plot.description.ilike(search_pattern))
        )
    ).scalar()

    items = []
    for plot in plots:
        star_count = (
            db.execute(
                select(func.count(Star.id)).where(Star.plot_id == plot.id)
            ).scalar()
            or 0
        )

        items.append(
            PlotResponse(
                id=plot.id,
                title=plot.title,
                description=plot.description,
                ownerId=plot.owner_id,
                tags=plot.tags or [],
                starCount=star_count,
                isStarred=False,
                isPaused=plot.is_paused or False,
                editingUsers=[],
                createdAt=plot.created_at,
                updatedAt=plot.updated_at,
            )
        )

    return SearchResponse(items=items, total=total, query=q)
