"""Tests for Moderation/Admin API endpoints (BAN, pause, diff, restore)."""

import uuid
from datetime import datetime, timedelta, timezone


TIPTAP_V1 = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Version 1 content"}],
        }
    ],
}

TIPTAP_V2 = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Version 2 content"}],
        }
    ],
}

TIPTAP_V3 = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Version 3 content"}],
        }
    ],
}


def _create_plot(client, user_id):
    """Helper: create a plot and return its ID."""
    resp = client.post(
        "/api/v1/plots",
        json={"title": "Test Plot", "tags": ["test"]},
        headers={"X-Test-User-Id": str(user_id)},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_section(client, plot_id, user_id, title="Section 1", content=None):
    """Helper: create a section and return response data."""
    body = {"title": title}
    if content is not None:
        body["content"] = content
    resp = client.post(
        f"/api/v1/plots/{plot_id}/sections",
        json=body,
        headers={"X-Test-User-Id": str(user_id)},
    )
    assert resp.status_code == 201
    return resp.json()


def _post_operation(client, section_id, user_id, op_type="update", content=None):
    """Helper: post an operation log."""
    body = {
        "operationType": op_type,
        "position": 0,
        "content": content or "some text",
        "length": 5,
    }
    return client.post(
        f"/api/v1/sections/{section_id}/operations",
        json=body,
        headers={"X-Test-User-Id": str(user_id)},
    )


def _create_second_user(db_session):
    """Helper: create a second user for ban tests."""
    from app.models import User

    user = User(
        id=uuid.uuid4(),
        email="banned@example.com",
        display_name="Banned User",
        avatar_url=None,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ==============================
# BAN Tests
# ==============================


class TestBanUser:
    """POST /api/v1/admin/bans"""

    def test_ban_user_success(self, client, test_user_id, db_session):
        """Ban a user from a plot returns 201."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        response = client.post(
            "/api/v1/admin/bans",
            json={
                "plotId": plot_id,
                "userId": str(target_user.id),
                "reason": "Vandalism",
            },
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["plotId"] == plot_id
        assert data["userId"] == str(target_user.id)

    def test_ban_user_duplicate(self, client, test_user_id, db_session):
        """Banning same user twice returns 409."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        # First ban
        client.post(
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Second ban
        response = client.post(
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 409

    def test_ban_user_plot_not_found(self, client, test_user_id, db_session):
        """Ban on non-existent plot returns 404."""
        target_user = _create_second_user(db_session)
        fake_plot_id = str(uuid.uuid4())

        response = client.post(
            "/api/v1/admin/bans",
            json={"plotId": fake_plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_ban_user_unauthenticated(self, client, test_user_id, db_session):
        """Ban without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        response = client.post(
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
        )
        assert response.status_code == 401


class TestUnbanUser:
    """DELETE /api/v1/admin/bans"""

    def test_unban_user_success(self, client, test_user_id, db_session):
        """Unban a user returns 204."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        # Ban first
        client.post(
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Unban
        response = client.request(
            "DELETE",
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 204

    def test_unban_user_not_banned(self, client, test_user_id, db_session):
        """Unban a user who is not banned returns 404."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        response = client.request(
            "DELETE",
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_unban_unauthenticated(self, client, test_user_id, db_session):
        """Unban without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        target_user = _create_second_user(db_session)

        response = client.request(
            "DELETE",
            "/api/v1/admin/bans",
            json={"plotId": plot_id, "userId": str(target_user.id)},
        )
        assert response.status_code == 401


# ==============================
# Pause Tests
# ==============================


class TestPausePlot:
    """POST /api/v1/plots/{id}/pause"""

    def test_pause_plot_success(self, client, test_user_id):
        """Pause a plot returns 200 with isPaused=true."""
        plot_id = _create_plot(client, test_user_id)

        response = client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "Under review"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["isPaused"] is True

    def test_pause_already_paused(self, client, test_user_id):
        """Pausing an already paused plot returns 409."""
        plot_id = _create_plot(client, test_user_id)

        # First pause
        client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "First"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Second pause
        response = client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "Second"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 409

    def test_pause_plot_not_found(self, client, test_user_id):
        """Pause non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())

        response = client.post(
            f"/api/v1/plots/{fake_id}/pause",
            json={"reason": "Test"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_pause_unauthenticated(self, client, test_user_id):
        """Pause without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)

        response = client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "Test"},
        )
        assert response.status_code == 401


class TestResumePlot:
    """DELETE /api/v1/plots/{id}/pause"""

    def test_resume_plot_success(self, client, test_user_id):
        """Resume a paused plot returns 200 with isPaused=false."""
        plot_id = _create_plot(client, test_user_id)

        # Pause first
        client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "Review"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Resume
        response = client.delete(
            f"/api/v1/plots/{plot_id}/pause",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["isPaused"] is False

    def test_resume_not_paused(self, client, test_user_id):
        """Resume a plot that is not paused returns 409."""
        plot_id = _create_plot(client, test_user_id)

        response = client.delete(
            f"/api/v1/plots/{plot_id}/pause",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 409

    def test_resume_plot_not_found(self, client, test_user_id):
        """Resume non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())

        response = client.delete(
            f"/api/v1/plots/{fake_id}/pause",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_resume_unauthenticated(self, client, test_user_id):
        """Resume without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)

        # Pause
        client.post(
            f"/api/v1/plots/{plot_id}/pause",
            json={"reason": "Review"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        response = client.delete(f"/api/v1/plots/{plot_id}/pause")
        assert response.status_code == 401


# ==============================
# Diff (single version) Tests
# ==============================


class TestSectionDiff:
    """GET /api/v1/sections/{id}/diff/{version}"""

    def test_diff_success(self, client, test_user_id):
        """Diff for a version shows additions/deletions vs previous."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create operation at v2 (snapshot of TIPTAP_V1)
        resp1 = _post_operation(client, section["id"], test_user_id)
        v2 = resp1.json()["version"]

        # Update content and create operation at v3 (snapshot of TIPTAP_V2)
        client.put(
            f"/api/v1/sections/{section['id']}",
            json={"content": TIPTAP_V2},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        resp2 = _post_operation(client, section["id"], test_user_id)
        v3 = resp2.json()["version"]

        # Get diff for v3 (compares v3 vs v2)
        response = client.get(f"/api/v1/sections/{section['id']}/diff/{v3}")
        assert response.status_code == 200
        data = response.json()
        assert data["fromVersion"] == v2
        assert data["toVersion"] == v3
        assert isinstance(data["additions"], list)
        assert isinstance(data["deletions"], list)

    def test_diff_first_version(self, client, test_user_id):
        """Diff for the first version shows additions only (no previous)."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        resp = _post_operation(client, section["id"], test_user_id)
        v2 = resp.json()["version"]

        # v2 has no v1 snapshot, so from_version=1 (not found → empty text)
        response = client.get(f"/api/v1/sections/{section['id']}/diff/{v2}")
        assert response.status_code == 200
        data = response.json()
        assert data["toVersion"] == v2
        # Should have additions (since previous is empty)
        assert len(data["additions"]) > 0

    def test_diff_version_not_found(self, client, test_user_id):
        """Diff for non-existent version returns 404."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        response = client.get(f"/api/v1/sections/{section['id']}/diff/999")
        assert response.status_code == 404

    def test_diff_section_not_found(self, client):
        """Diff for non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/sections/{fake_id}/diff/1")
        assert response.status_code == 404


# ==============================
# Restore Tests
# ==============================


class TestRestoreSection:
    """POST /api/v1/sections/{id}/restore/{version}"""

    def test_restore_success(self, client, test_user_id):
        """Restore section to a version restores its content."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create operation (snapshot of TIPTAP_V1 at v2)
        resp = _post_operation(client, section["id"], test_user_id)
        v2 = resp.json()["version"]

        # Update to TIPTAP_V2
        client.put(
            f"/api/v1/sections/{section['id']}",
            json={"content": TIPTAP_V2},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Restore to v2
        response = client.post(
            f"/api/v1/sections/{section['id']}/restore/{v2}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == v2
        assert data["content"] == TIPTAP_V1

    def test_restore_outside_72h_window(self, client, test_user_id, db_session):
        """Restore to version older than 72h returns 400."""
        from app.models import ColdSnapshot, HotOperation

        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Insert old operation + snapshot (73 hours ago)
        old_time = datetime.now(timezone.utc) - timedelta(hours=73)
        section_uuid = uuid.UUID(section["id"])
        old_op = HotOperation(
            section_id=section_uuid,
            operation_type="update",
            payload={},
            user_id=test_user_id,
            version=50,
            created_at=old_time,
        )
        old_snapshot = ColdSnapshot(
            section_id=section_uuid,
            content=TIPTAP_V1,
            version=50,
        )
        db_session.add(old_op)
        db_session.add(old_snapshot)
        db_session.commit()

        response = client.post(
            f"/api/v1/sections/{section['id']}/restore/50",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 400
        assert "72-hour" in response.json()["detail"]

    def test_restore_version_not_found(self, client, test_user_id):
        """Restore to non-existent version returns 400."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        response = client.post(
            f"/api/v1/sections/{section['id']}/restore/999",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 400

    def test_restore_section_not_found(self, client, test_user_id):
        """Restore non-existent section returns 400."""
        fake_id = str(uuid.uuid4())

        response = client.post(
            f"/api/v1/sections/{fake_id}/restore/1",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 400

    def test_restore_unauthenticated(self, client, test_user_id):
        """Restore without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        _post_operation(client, section["id"], test_user_id)

        response = client.post(
            f"/api/v1/sections/{section['id']}/restore/2",
        )
        assert response.status_code == 401


# ==============================
# Moderation Service Unit Tests
# ==============================


class TestModerationServiceUnit:
    """Unit tests for moderation_service functions."""

    def test_is_user_banned_false(self, db_session, test_user_id):
        """is_user_banned returns False when user is not banned."""
        from app.models import Plot
        from app.services.moderation_service import is_user_banned

        plot = Plot(title="Test", owner_id=test_user_id)
        db_session.add(plot)
        db_session.commit()
        db_session.refresh(plot)

        result = is_user_banned(db_session, plot.id, test_user_id)
        assert result is False

    def test_is_user_banned_true(self, db_session, test_user_id):
        """is_user_banned returns True when user is banned."""
        from app.models import Plot, PlotBan
        from app.services.moderation_service import is_user_banned

        plot = Plot(title="Test", owner_id=test_user_id)
        db_session.add(plot)
        db_session.commit()
        db_session.refresh(plot)

        target_user = _create_second_user(db_session)
        ban = PlotBan(plot_id=plot.id, user_id=target_user.id, reason="spam")
        db_session.add(ban)
        db_session.commit()

        result = is_user_banned(db_session, plot.id, target_user.id)
        assert result is True

    def test_ban_and_unban_flow(self, db_session, test_user_id):
        """Full ban → check → unban → check flow."""
        from app.models import Plot
        from app.services.moderation_service import (
            ban_user,
            is_user_banned,
            unban_user,
        )

        plot = Plot(title="Flow Test", owner_id=test_user_id)
        db_session.add(plot)
        db_session.commit()
        db_session.refresh(plot)

        target_user = _create_second_user(db_session)

        # Ban
        ban_user(db_session, plot.id, target_user.id, reason="test")
        assert is_user_banned(db_session, plot.id, target_user.id) is True

        # Unban
        unban_user(db_session, plot.id, target_user.id)
        assert is_user_banned(db_session, plot.id, target_user.id) is False

    def test_pause_and_resume_flow(self, db_session, test_user_id):
        """Full pause → check → resume → check flow."""
        from app.models import Plot
        from app.services.moderation_service import pause_plot, resume_plot

        plot = Plot(title="Pause Test", owner_id=test_user_id)
        db_session.add(plot)
        db_session.commit()
        db_session.refresh(plot)

        # Pause
        paused = pause_plot(db_session, plot.id, reason="review")
        assert paused.is_paused is True
        assert paused.pause_reason == "review"

        # Resume
        resumed = resume_plot(db_session, plot.id)
        assert resumed.is_paused is False
        assert resumed.pause_reason is None
