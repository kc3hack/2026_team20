import uuid as _uuid_mod
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plots: Mapped[list["Plot"]] = relationship("Plot", back_populates="owner")


class Plot(Base):
    __tablename__ = "plots"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    tags: Mapped[Any] = mapped_column(JSON, default=list)
    owner_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_paused: Mapped[bool] = mapped_column(Boolean, default=False)
    pause_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Version for optimistic locking. Starts at 0 ("no rollbacks yet").
    # In contrast, Section.version starts at 1 ("initial content version").
    # This is intentional: Plot.version counts rollback operations,
    # while Section.version counts content edits.
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User | None"] = relationship("User", back_populates="plots")
    sections: Mapped[list["Section"]] = relationship(
        "Section", back_populates="plot", cascade="all, delete-orphan"
    )
    stars: Mapped[list["Star"]] = relationship(
        "Star", back_populates="plot", cascade="all, delete-orphan"
    )
    cold_snapshots: Mapped[list["ColdSnapshot"]] = relationship(
        "ColdSnapshot", back_populates="plot", cascade="all, delete-orphan"
    )
    rollback_logs: Mapped[list["RollbackLog"]] = relationship(
        "RollbackLog", back_populates="plot", cascade="all, delete-orphan"
    )


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[Any] = mapped_column(JSON, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    plot: Mapped["Plot"] = relationship("Plot", back_populates="sections")


class HotOperation(Base):
    __tablename__ = "hot_operations"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    section_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    operation_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # insert, delete, update
    payload: Mapped[Any] = mapped_column(JSON, nullable=True)
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")


class ColdSnapshot(Base):
    __tablename__ = "cold_snapshots"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[Any] = mapped_column(JSON, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plot: Mapped["Plot"] = relationship("Plot", back_populates="cold_snapshots")
    rollback_logs: Mapped[list["RollbackLog"]] = relationship(
        "RollbackLog", back_populates="snapshot"
    )


class RollbackLog(Base):
    __tablename__ = "rollback_logs"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[_uuid_mod.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cold_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    snapshot_version: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # Denormalized: preserves version info after snapshot pruning
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plot: Mapped["Plot"] = relationship("Plot", back_populates="rollback_logs")
    snapshot: Mapped["ColdSnapshot | None"] = relationship(
        "ColdSnapshot", back_populates="rollback_logs"
    )
    user: Mapped["User"] = relationship("User")


class Star(Base):
    __tablename__ = "stars"
    __table_args__ = (UniqueConstraint("plot_id", "user_id", name="uq_star_plot_user"),)

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plot: Mapped["Plot"] = relationship("Plot", back_populates="stars")
    user: Mapped["User"] = relationship("User")


class Fork(Base):
    __tablename__ = "forks"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    source_plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    new_plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[_uuid_mod.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="thread", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    thread_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Required: comments are always fetched by thread_id
    )
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(String(5000), nullable=False)
    parent_comment_id: Mapped[_uuid_mod.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    thread: Mapped["Thread"] = relationship("Thread", back_populates="comments")
    user: Mapped["User"] = relationship("User")


class PlotBan(Base):
    __tablename__ = "plot_bans"
    __table_args__ = (
        UniqueConstraint("plot_id", "user_id", name="uq_plotban_plot_user"),
    )

    id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid_mod.uuid4
    )
    plot_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[_uuid_mod.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
