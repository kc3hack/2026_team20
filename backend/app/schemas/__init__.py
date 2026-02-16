from datetime import datetime
from uuid import UUID
from typing import Any

from pydantic import BaseModel, Field


# --- User schemas ---


class UserBrief(BaseModel):
    id: UUID
    display_name: str = Field(alias="displayName")
    avatar_url: str | None = Field(None, alias="avatarUrl")

    model_config = {"populate_by_name": True}


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str = Field(alias="displayName")
    avatar_url: str | None = Field(None, alias="avatarUrl")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class UserProfileResponse(BaseModel):
    id: UUID
    display_name: str = Field(alias="displayName")
    avatar_url: str | None = Field(None, alias="avatarUrl")
    plot_count: int = Field(0, alias="plotCount")
    contribution_count: int = Field(0, alias="contributionCount")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


# --- Plot schemas ---


class EditingUser(BaseModel):
    id: UUID
    display_name: str = Field(alias="displayName")
    avatar_url: str | None = Field(None, alias="avatarUrl")
    section_id: UUID | None = Field(None, alias="sectionId")

    model_config = {"populate_by_name": True}


class CreatePlotRequest(BaseModel):
    title: str = Field(max_length=200)
    description: str = Field(default="", max_length=2000)
    tags: list[str] = Field(default_factory=list)


class UpdatePlotRequest(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=2000)
    tags: list[str] | None = None


class PlotResponse(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    tags: list[str] = []
    owner_id: UUID = Field(alias="ownerId")
    star_count: int = Field(0, alias="starCount")
    is_starred: bool = Field(False, alias="isStarred")
    is_paused: bool = Field(False, alias="isPaused")
    editing_users: list[EditingUser] = Field(default_factory=list, alias="editingUsers")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class PlotDetailResponse(PlotResponse):
    sections: list["SectionResponse"] = []
    owner: UserBrief | None = None


class PlotListResponse(BaseModel):
    items: list[PlotResponse]
    total: int
    limit: int
    offset: int


# --- Section schemas ---


class CreateSectionRequest(BaseModel):
    title: str = Field(max_length=200)
    content: dict[str, Any] | None = None


class UpdateSectionRequest(BaseModel):
    title: str | None = Field(None, max_length=200)
    content: dict[str, Any] | None = None


class SectionResponse(BaseModel):
    id: UUID
    plot_id: UUID = Field(alias="plotId")
    title: str
    content: dict[str, Any] | None = None
    order_index: int = Field(0, alias="orderIndex")
    version: int = 1
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class SectionListResponse(BaseModel):
    items: list[SectionResponse]
    total: int


class ReorderSectionRequest(BaseModel):
    new_order: int = Field(alias="newOrder")

    model_config = {"populate_by_name": True}


# --- History schemas ---


class CreateOperationRequest(BaseModel):
    operation_type: str = Field(alias="operationType")
    position: int | None = None
    content: str | None = None
    length: int | None = None

    model_config = {"populate_by_name": True}


class HistoryItem(BaseModel):
    id: UUID
    section_id: UUID = Field(alias="sectionId")
    operation_type: str = Field(alias="operationType")
    payload: dict[str, Any] | None = None
    user: UserBrief
    version: int
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class DiffChange(BaseModel):
    start: int
    end: int
    text: str


class DiffResponse(BaseModel):
    from_version: int = Field(alias="fromVersion")
    to_version: int = Field(alias="toVersion")
    additions: list[DiffChange] = []
    deletions: list[DiffChange] = []

    model_config = {"populate_by_name": True}


# --- Image schemas ---


class ImageUploadResponse(BaseModel):
    url: str
    filename: str
    width: int
    height: int


# --- Star schemas ---


class StarItem(BaseModel):
    user: UserBrief
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class StarListResponse(BaseModel):
    items: list[StarItem]
    total: int


# --- Thread / Comment schemas ---


class CreateThreadRequest(BaseModel):
    plot_id: UUID = Field(alias="plotId")
    section_id: UUID | None = Field(None, alias="sectionId")

    model_config = {"populate_by_name": True}


class ThreadResponse(BaseModel):
    id: UUID
    plot_id: UUID = Field(alias="plotId")
    section_id: UUID | None = Field(None, alias="sectionId")
    comment_count: int = Field(0, alias="commentCount")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class CreateCommentRequest(BaseModel):
    content: str = Field(max_length=5000)
    parent_comment_id: UUID | None = Field(None, alias="parentCommentId")

    model_config = {"populate_by_name": True}


class CommentResponse(BaseModel):
    id: UUID
    thread_id: UUID = Field(alias="threadId")
    content: str
    parent_comment_id: UUID | None = Field(None, alias="parentCommentId")
    user: UserBrief
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    total: int


# --- Search schemas ---


class SearchResponse(BaseModel):
    items: list[PlotResponse]
    total: int
    query: str


# --- Admin schemas ---


class BanRequest(BaseModel):
    plot_id: UUID = Field(alias="plotId")
    user_id: UUID = Field(alias="userId")
    reason: str | None = None

    model_config = {"populate_by_name": True}


class UnbanRequest(BaseModel):
    plot_id: UUID = Field(alias="plotId")
    user_id: UUID = Field(alias="userId")

    model_config = {"populate_by_name": True}


class PauseRequest(BaseModel):
    reason: str | None = None


# Forward reference resolution
PlotDetailResponse.model_rebuild()
