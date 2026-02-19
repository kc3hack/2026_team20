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

    - thumbnailUrl: モデルに thumbnail_url カラムが追加され次第、
      ORM 変換で値を渡す。現時点では常に None。
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
    # TODO: editingUsers は WebSocket 接続管理の実装後に
    #       リアルタイムの編集中ユーザー一覧を返す。
    #       現時点では空リストをハードコードしている。
    editingUsers: list[str]
    createdAt: datetime
    updatedAt: datetime


class PlotListResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[PlotResponse]
    total: int
    limit: int
    offset: int


# ─── Admin ───────────────────────────────────────────────────
class BanRequest(BaseModel):
    plotId: str
    userId: str
    reason: str | None = None

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
