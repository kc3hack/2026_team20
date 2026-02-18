import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Integer,
    ForeignKey,
    Boolean,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plots = relationship("Plot", back_populates="owner")


class Plot(Base):
    __tablename__ = "plots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=True)
    tags = Column(JSON, default=[])
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_paused = Column(Boolean, default=False)
    pause_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner = relationship("User", back_populates="plots")
    sections = relationship(
        "Section", back_populates="plot", cascade="all, delete-orphan"
    )
    stars = relationship("Star", back_populates="plot", cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(JSON, nullable=True)
    order_index = Column(Integer, default=0)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    plot = relationship("Plot", back_populates="sections")


class HotOperation(Base):
    __tablename__ = "hot_operations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    operation_type = Column(String(20), nullable=False)  # insert, delete, update
    payload = Column(JSON, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    version = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ColdSnapshot(Base):
    __tablename__ = "cold_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    content = Column(JSON, nullable=True)
    version = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Star(Base):
    __tablename__ = "stars"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plot = relationship("Plot", back_populates="stars")


class Fork(Base):
    __tablename__ = "forks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    new_plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Thread(Base):
    __tablename__ = "threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    comments = relationship(
        "Comment", back_populates="thread", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(String(5000), nullable=False)
    parent_comment_id = Column(
        UUID(as_uuid=True), ForeignKey("comments.id"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thread = relationship("Thread", back_populates="comments")


class PlotBan(Base):
    __tablename__ = "plot_bans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
