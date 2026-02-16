"""Tests for History API endpoints (2-layer storage)."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch


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


class TestCreateOperation:
    """POST /api/v1/sections/{id}/operations"""

    def test_create_operation_success(self, client, test_user_id):
        """Record an operation returns 201 with id and version."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        response = _post_operation(
            client, section["id"], test_user_id, op_type="insert"
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["version"] == 2  # section starts at v1, operation bumps to v2

    def test_create_operation_increments_version(self, client, test_user_id):
        """Multiple operations increment version sequentially."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        resp1 = _post_operation(client, section["id"], test_user_id)
        resp2 = _post_operation(client, section["id"], test_user_id)
        resp3 = _post_operation(client, section["id"], test_user_id)

        assert resp1.json()["version"] == 2
        assert resp2.json()["version"] == 3
        assert resp3.json()["version"] == 4

    def test_create_operation_section_not_found(self, client, test_user_id):
        """Operation on non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = _post_operation(client, fake_id, test_user_id)
        assert response.status_code == 404

    def test_create_operation_unauthenticated(self, client, test_user_id):
        """Operation without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        body = {
            "operationType": "update",
            "position": 0,
            "content": "text",
            "length": 4,
        }
        response = client.post(
            f"/api/v1/sections/{section['id']}/operations",
            json=body,
        )
        assert response.status_code == 401

    def test_create_operation_creates_snapshot(self, client, test_user_id, db_session):
        """Operation creates a cold snapshot for the version."""
        from app.models import ColdSnapshot

        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        _post_operation(client, section["id"], test_user_id)

        # Verify cold snapshot exists
        snapshots = (
            db_session.query(ColdSnapshot)
            .filter(ColdSnapshot.section_id == section["id"])
            .all()
        )
        assert len(snapshots) == 1
        assert snapshots[0].version == 2


class TestGetHistory:
    """GET /api/v1/sections/{id}/history"""

    def test_get_history_empty(self, client, test_user_id):
        """History for section with no operations returns empty list."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id)

        response = client.get(f"/api/v1/sections/{section['id']}/history")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_history_with_operations(self, client, test_user_id):
        """History returns recorded operations."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        _post_operation(client, section["id"], test_user_id, op_type="insert")
        _post_operation(client, section["id"], test_user_id, op_type="update")

        response = client.get(f"/api/v1/sections/{section['id']}/history")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

        # Most recent first
        assert data["items"][0]["operationType"] == "update"
        assert data["items"][1]["operationType"] == "insert"

    def test_get_history_includes_user(self, client, test_user_id):
        """History items include user info."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        _post_operation(client, section["id"], test_user_id)

        response = client.get(f"/api/v1/sections/{section['id']}/history")
        data = response.json()
        assert data["items"][0]["user"]["displayName"] == "Test User"

    def test_get_history_section_not_found(self, client):
        """History for non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/sections/{fake_id}/history")
        assert response.status_code == 404

    def test_get_history_pagination(self, client, test_user_id):
        """History supports limit/offset pagination."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create 5 operations
        for _ in range(5):
            _post_operation(client, section["id"], test_user_id)

        response = client.get(
            f"/api/v1/sections/{section['id']}/history?limit=2&offset=0"
        )
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5

        response = client.get(
            f"/api/v1/sections/{section['id']}/history?limit=2&offset=4"
        )
        data = response.json()
        assert len(data["items"]) == 1

    def test_get_history_excludes_expired(self, client, test_user_id, db_session):
        """Operations older than 72h are not returned in history."""
        from app.models import HotOperation

        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create a recent operation
        _post_operation(client, section["id"], test_user_id)

        # Manually insert an old operation (73 hours ago)
        old_time = datetime.now(timezone.utc) - timedelta(hours=73)
        old_op = HotOperation(
            section_id=section["id"],
            operation_type="insert",
            payload={"content": "old"},
            user_id=test_user_id,
            version=99,
            created_at=old_time,
        )
        db_session.add(old_op)
        db_session.commit()

        response = client.get(f"/api/v1/sections/{section['id']}/history")
        data = response.json()
        # Only the recent operation should be returned
        assert data["total"] == 1
        assert data["items"][0]["version"] == 2  # not 99


class TestRollback:
    """POST /api/v1/sections/{id}/rollback/{version}"""

    def test_rollback_success(self, client, test_user_id):
        """Rollback restores section content to target version."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Record operation (creates snapshot of v1 content at v2)
        resp = _post_operation(client, section["id"], test_user_id)
        version = resp.json()["version"]

        # Update section content to v2
        client.put(
            f"/api/v1/sections/{section['id']}",
            json={"content": TIPTAP_V2},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        # Rollback to the version with v1 snapshot
        response = client.post(
            f"/api/v1/sections/{section['id']}/rollback/{version}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        data = response.json()
        # Content should be the snapshot from when the operation was recorded
        assert data["version"] == version
        assert data["content"] == TIPTAP_V1

    def test_rollback_section_not_found(self, client, test_user_id):
        """Rollback non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/api/v1/sections/{fake_id}/rollback/1",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_rollback_version_not_found(self, client, test_user_id):
        """Rollback to non-existent version returns 400."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        _post_operation(client, section["id"], test_user_id)

        response = client.post(
            f"/api/v1/sections/{section['id']}/rollback/999",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 400

    def test_rollback_expired_version(self, client, test_user_id, db_session):
        """Rollback to version older than 72h returns 400."""
        from app.models import HotOperation, ColdSnapshot

        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create an old operation + snapshot (73 hours ago)
        old_time = datetime.now(timezone.utc) - timedelta(hours=73)
        old_op = HotOperation(
            section_id=section["id"],
            operation_type="update",
            payload={},
            user_id=test_user_id,
            version=50,
            created_at=old_time,
        )
        old_snapshot = ColdSnapshot(
            section_id=section["id"],
            content=TIPTAP_V1,
            version=50,
        )
        db_session.add(old_op)
        db_session.add(old_snapshot)
        db_session.commit()

        response = client.post(
            f"/api/v1/sections/{section['id']}/rollback/50",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 400
        assert "72-hour" in response.json()["detail"]

    def test_rollback_unauthenticated(self, client, test_user_id):
        """Rollback without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        _post_operation(client, section["id"], test_user_id)

        response = client.post(
            f"/api/v1/sections/{section['id']}/rollback/2",
        )
        assert response.status_code == 401


class TestDiff:
    """GET /api/v1/sections/{id}/diff/{from}/{to}"""

    def test_diff_success(self, client, test_user_id):
        """Diff between two versions returns additions and deletions."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)

        # Create first operation (snapshot at v2 with TIPTAP_V1 content)
        resp1 = _post_operation(client, section["id"], test_user_id)
        v1 = resp1.json()["version"]

        # Update content and create second operation
        client.put(
            f"/api/v1/sections/{section['id']}",
            json={"content": TIPTAP_V2},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        resp2 = _post_operation(client, section["id"], test_user_id)
        v2 = resp2.json()["version"]

        response = client.get(f"/api/v1/sections/{section['id']}/diff/{v1}/{v2}")
        assert response.status_code == 200
        data = response.json()
        assert data["fromVersion"] == v1
        assert data["toVersion"] == v2
        assert isinstance(data["additions"], list)
        assert isinstance(data["deletions"], list)

    def test_diff_same_version(self, client, test_user_id):
        """Diff between same version returns empty changes."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        resp = _post_operation(client, section["id"], test_user_id)
        v = resp.json()["version"]

        response = client.get(f"/api/v1/sections/{section['id']}/diff/{v}/{v}")
        assert response.status_code == 200
        data = response.json()
        assert data["additions"] == []
        assert data["deletions"] == []

    def test_diff_section_not_found(self, client):
        """Diff for non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/sections/{fake_id}/diff/1/2")
        assert response.status_code == 404

    def test_diff_version_not_found(self, client, test_user_id):
        """Diff with non-existent version returns 404."""
        plot_id = _create_plot(client, test_user_id)
        section = _create_section(client, plot_id, test_user_id, content=TIPTAP_V1)
        _post_operation(client, section["id"], test_user_id)

        response = client.get(f"/api/v1/sections/{section['id']}/diff/1/999")
        assert response.status_code == 404


class TestCleanupService:
    """Test TTL cleanup job for hot_operations."""

    def test_cleanup_deletes_expired(self, db_session, test_user_id):
        """Cleanup removes operations older than 72 hours."""
        from app.models import HotOperation, Section, Plot

        # Create section
        plot = Plot(
            title="Cleanup Plot",
            owner_id=test_user_id,
        )
        db_session.add(plot)
        db_session.commit()
        db_session.refresh(plot)

        section = Section(
            plot_id=plot.id,
            title="Cleanup Section",
            order_index=0,
        )
        db_session.add(section)
        db_session.commit()
        db_session.refresh(section)

        # Insert old operation (73 hours ago)
        old_time = datetime.now(timezone.utc) - timedelta(hours=73)
        old_op = HotOperation(
            section_id=section.id,
            operation_type="update",
            payload={},
            user_id=test_user_id,
            version=1,
            created_at=old_time,
        )
        db_session.add(old_op)

        # Insert recent operation
        recent_op = HotOperation(
            section_id=section.id,
            operation_type="insert",
            payload={},
            user_id=test_user_id,
            version=2,
        )
        db_session.add(recent_op)
        db_session.commit()

        from app.services.cleanup_service import cleanup_expired_operations

        deleted = cleanup_expired_operations(db_session)
        assert deleted == 1

        # Verify only recent operation remains
        remaining = (
            db_session.query(HotOperation)
            .filter(HotOperation.section_id == section.id)
            .all()
        )
        assert len(remaining) == 1
        assert remaining[0].version == 2

    def test_cleanup_no_expired(self, db_session, test_user_id):
        """Cleanup with no expired operations deletes nothing."""
        from app.services.cleanup_service import cleanup_expired_operations

        deleted = cleanup_expired_operations(db_session)
        assert deleted == 0
