"""Pydantic schemas – API リクエスト / レスポンス定義。

docs/api.md の Response Schemas セクションに準拠。
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


# ─── Auth / Internal ─────────────────────────────────────────
class CurrentUser(BaseModel):
    id: UUID  # Supabase JWT の sub クレーム（UUID 文字列）を型安全に保持
    email: str | None = None
    role: str | None = None


# ─── User ────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    email: str
    displayName: str
    avatarUrl: str | None = None
    createdAt: datetime


class UserProfileResponse(BaseModel):
    id: str
    displayName: str
    avatarUrl: str | None = None
    plotCount: int
    contributionCount: int
    createdAt: datetime


# ─── Plot ────────────────────────────────────────────────────
class PlotResponse(BaseModel):
    """api.md PlotResponse 準拠。

    - thumbnailUrl: Plot.thumbnail_url カラムの値を ORM 変換で返却する。
    - version: 楽観的ロック用バージョン番号。
    """

    id: str
    title: str
    description: str | None = None
    tags: list[str]
    ownerId: str
    starCount: int
    isStarred: bool
    isPaused: bool
    thumbnailUrl: str | None = None
    version: int
    createdAt: datetime
    updatedAt: datetime


class PlotListResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[PlotResponse]
    total: int
    limit: int
    offset: int


# ─── Section ─────────────────────────────────────
class SectionResponse(BaseModel):
    """api.md SectionResponse 準拠 (L586-598)。"""

    id: str
    plotId: str
    title: str
    content: dict | None = None
    orderIndex: int
    version: int
    createdAt: datetime
    updatedAt: datetime


class SectionListResponse(BaseModel):
    """api.md SectionListResponse 準拠 (L600-606)。"""

    items: list[SectionResponse]
    total: int


# ─── Admin ───────────────────────────────────────────────────
class BanRequest(BaseModel):
    plotId: str
    userId: str
    reason: str | None = None

    # UUID フォーマットをスキーマ層で早期検証する。
    # utils._get_plot_or_404 / _get_user_or_404 でも parse_uuid() を呼ぶため
    # 二重バリデーションになるが、defense-in-depth として意図的に残している。
    @field_validator("plotId", "userId")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")


class UnbanRequest(BaseModel):
    plotId: str
    userId: str

    # UUID フォーマットをスキーマ層で早期検証する（BanRequest と同様の意図）。
    @field_validator("plotId", "userId")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")


class PauseRequest(BaseModel):
    reason: str | None = None


# ─── Admin Response ──────────────────────────────────────────
class MessageResponse(BaseModel):
    """汎用メッセージレスポンス（admin 系エンドポイント共通）。"""

    detail: str
