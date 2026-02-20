"""moderation_service のユニットテスト。

サービス関数を直接呼び出し、DB レベルの振る舞いを検証する。

api.md 仕様:
- POST /admin/bans → ban_user
- DELETE /admin/bans → unban_user
- POST /plots/{plotId}/pause → pause_plot
- DELETE /plots/{plotId}/pause → resume_plot
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Plot, PlotBan, User
from app.services import moderation_service


# ─── ban_user ──────────────────────────────────────────────────


class TestBanUser:
    """ban_user のテスト"""

    def test_ban_user(self, db: Session, test_plot: Plot, other_user: User) -> None:
        """ユーザーを正常に BAN できる。"""
        ban = moderation_service.ban_user(
            db, test_plot.id, other_user.id, reason="spam"
        )
        assert ban.plot_id == test_plot.id
        assert ban.user_id == other_user.id
        assert ban.reason == "spam"

    def test_ban_user_without_reason(
        self, db: Session, test_plot: Plot, other_user: User
    ) -> None:
        """reason なしでも BAN できる。"""
        ban = moderation_service.ban_user(db, test_plot.id, other_user.id)
        assert ban.reason is None

    def test_ban_user_plot_not_found(self, db: Session, test_user: User) -> None:
        """存在しない Plot への BAN は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            moderation_service.ban_user(db, uuid.uuid4(), test_user.id)

    def test_ban_user_already_banned(
        self, db: Session, test_plot: Plot, other_user: User
    ) -> None:
        """既に BAN 済みのユーザーを再度 BAN すると ValueError。"""
        moderation_service.ban_user(db, test_plot.id, other_user.id)

        with pytest.raises(ValueError, match="User is already banned"):
            moderation_service.ban_user(db, test_plot.id, other_user.id)


# ─── unban_user ──────────────────────────────────────────────────


class TestUnbanUser:
    """unban_user のテスト"""

    def test_unban_user(self, db: Session, test_plot: Plot, other_user: User) -> None:
        """BAN を正常に解除できる。"""
        moderation_service.ban_user(db, test_plot.id, other_user.id)
        moderation_service.unban_user(db, test_plot.id, other_user.id)

        # BAN 解除後は is_user_banned が False を返す
        assert (
            moderation_service.is_user_banned(db, test_plot.id, other_user.id) is False
        )

    def test_unban_user_not_found(
        self, db: Session, test_plot: Plot, other_user: User
    ) -> None:
        """BAN されていないユーザーの解除は ValueError。"""
        with pytest.raises(ValueError, match="Ban not found"):
            moderation_service.unban_user(db, test_plot.id, other_user.id)


# ─── is_user_banned ──────────────────────────────────────────────


class TestIsUserBanned:
    """is_user_banned のテスト"""

    def test_is_user_banned_true(
        self, db: Session, test_plot: Plot, other_user: User
    ) -> None:
        """BAN 済みユーザーは True を返す。"""
        moderation_service.ban_user(db, test_plot.id, other_user.id)
        assert (
            moderation_service.is_user_banned(db, test_plot.id, other_user.id) is True
        )

    def test_is_user_banned_false(
        self, db: Session, test_plot: Plot, other_user: User
    ) -> None:
        """BAN されていないユーザーは False を返す。"""
        assert (
            moderation_service.is_user_banned(db, test_plot.id, other_user.id) is False
        )

    def test_is_user_banned_nonexistent_plot(
        self, db: Session, test_user: User
    ) -> None:
        """存在しない Plot でも False を返す（エラーにはならない）。"""
        assert (
            moderation_service.is_user_banned(db, uuid.uuid4(), test_user.id) is False
        )


# ─── pause_plot ──────────────────────────────────────────────────


class TestPausePlot:
    """pause_plot のテスト"""

    def test_pause_plot(self, db: Session, test_plot: Plot) -> None:
        """プロットを正常に一時停止できる。"""
        result = moderation_service.pause_plot(db, test_plot.id, reason="maintenance")
        assert result.is_paused is True
        assert result.pause_reason == "maintenance"

    def test_pause_plot_without_reason(self, db: Session, test_plot: Plot) -> None:
        """reason なしでも一時停止できる。"""
        result = moderation_service.pause_plot(db, test_plot.id)
        assert result.is_paused is True
        assert result.pause_reason is None

    def test_pause_plot_not_found(self, db: Session) -> None:
        """存在しない Plot の一時停止は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            moderation_service.pause_plot(db, uuid.uuid4())

    def test_pause_plot_already_paused(self, db: Session, test_plot: Plot) -> None:
        """既に一時停止中の Plot を再度一時停止すると ValueError。"""
        moderation_service.pause_plot(db, test_plot.id)

        with pytest.raises(ValueError, match="Plot is already paused"):
            moderation_service.pause_plot(db, test_plot.id)


# ─── resume_plot ──────────────────────────────────────────────────


class TestResumePlot:
    """resume_plot のテスト"""

    def test_resume_plot(self, db: Session, test_plot: Plot) -> None:
        """一時停止中のプロットを正常に再開できる。"""
        moderation_service.pause_plot(db, test_plot.id, reason="review")
        result = moderation_service.resume_plot(db, test_plot.id)
        assert result.is_paused is False
        assert result.pause_reason is None

    def test_resume_plot_not_found(self, db: Session) -> None:
        """存在しない Plot の再開は ValueError。"""
        with pytest.raises(ValueError, match="Plot not found"):
            moderation_service.resume_plot(db, uuid.uuid4())

    def test_resume_plot_not_paused(self, db: Session, test_plot: Plot) -> None:
        """一時停止されていない Plot の再開は ValueError。"""
        with pytest.raises(ValueError, match="Plot is not paused"):
            moderation_service.resume_plot(db, test_plot.id)
