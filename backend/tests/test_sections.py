"""Tests for Section CRUD API endpoints."""

import uuid


TIPTAP_CONTENT = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": "Hello World",
                    "marks": [{"type": "bold"}],
                }
            ],
        }
    ],
}

TIPTAP_CONTENT_UPDATED = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": "Updated content",
                }
            ],
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
    return resp


class TestCreateSection:
    """POST /api/v1/plots/{plot_id}/sections"""

    def test_create_section_success(self, client, test_user_id):
        """Create a section with valid data returns 201."""
        plot_id = _create_plot(client, test_user_id)

        response = _create_section(
            client, plot_id, test_user_id, title="Background", content=TIPTAP_CONTENT
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Background"
        assert data["content"] == TIPTAP_CONTENT
        assert data["plotId"] == plot_id
        assert data["orderIndex"] == 0
        assert data["version"] == 1
        assert "id" in data
        assert "createdAt" in data
        assert "updatedAt" in data

    def test_create_section_minimal(self, client, test_user_id):
        """Create a section with only title (no content)."""
        plot_id = _create_plot(client, test_user_id)

        response = _create_section(client, plot_id, test_user_id, title="Empty Section")
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Empty Section"
        assert data["content"] is None

    def test_create_section_auto_order_index(self, client, test_user_id):
        """Sections get auto-incrementing order_index."""
        plot_id = _create_plot(client, test_user_id)

        resp1 = _create_section(client, plot_id, test_user_id, title="First")
        resp2 = _create_section(client, plot_id, test_user_id, title="Second")
        resp3 = _create_section(client, plot_id, test_user_id, title="Third")

        assert resp1.json()["orderIndex"] == 0
        assert resp2.json()["orderIndex"] == 1
        assert resp3.json()["orderIndex"] == 2

    def test_create_section_title_too_long(self, client, test_user_id):
        """Title over 200 chars returns 422."""
        plot_id = _create_plot(client, test_user_id)

        response = _create_section(client, plot_id, test_user_id, title="x" * 201)
        assert response.status_code == 422

    def test_create_section_plot_not_found(self, client, test_user_id):
        """Creating section for non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())
        response = _create_section(client, fake_id, test_user_id, title="Orphan")
        assert response.status_code == 404
        assert response.json()["detail"] == "Plot not found"

    def test_create_section_missing_title(self, client, test_user_id):
        """Missing title returns 422."""
        plot_id = _create_plot(client, test_user_id)

        response = client.post(
            f"/api/v1/plots/{plot_id}/sections",
            json={"content": TIPTAP_CONTENT},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422

    def test_create_section_unauthenticated(self, client, test_user_id):
        """Creating section without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)

        response = client.post(
            f"/api/v1/plots/{plot_id}/sections",
            json={"title": "No Auth"},
        )
        assert response.status_code == 401

    def test_create_section_limit_255(self, client, test_user_id, db_session):
        """Cannot create more than 255 sections per plot."""
        from app.models import Section

        plot_id = _create_plot(client, test_user_id)

        # Bulk insert 255 sections directly in DB for speed
        for i in range(255):
            section = Section(
                plot_id=plot_id,
                title=f"Section {i}",
                order_index=i,
            )
            db_session.add(section)
        db_session.commit()

        # 256th should fail
        response = _create_section(client, plot_id, test_user_id, title="Over Limit")
        assert response.status_code == 400
        assert "255" in response.json()["detail"]


class TestGetSection:
    """GET /api/v1/sections/{id}"""

    def test_get_section_success(self, client, test_user_id):
        """Get existing section returns 200."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(
            client, plot_id, test_user_id, title="Get Me", content=TIPTAP_CONTENT
        )
        section_id = create_resp.json()["id"]

        response = client.get(f"/api/v1/sections/{section_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == section_id
        assert data["title"] == "Get Me"
        assert data["content"] == TIPTAP_CONTENT
        assert data["plotId"] == plot_id

    def test_get_section_not_found(self, client):
        """Get non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/sections/{fake_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Section not found"


class TestListSections:
    """GET /api/v1/plots/{plot_id}/sections"""

    def test_list_sections_empty(self, client, test_user_id):
        """List sections for plot with no sections."""
        plot_id = _create_plot(client, test_user_id)

        response = client.get(f"/api/v1/plots/{plot_id}/sections")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_sections_ordered(self, client, test_user_id):
        """Sections are returned ordered by order_index."""
        plot_id = _create_plot(client, test_user_id)
        _create_section(client, plot_id, test_user_id, title="First")
        _create_section(client, plot_id, test_user_id, title="Second")
        _create_section(client, plot_id, test_user_id, title="Third")

        response = client.get(f"/api/v1/plots/{plot_id}/sections")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert data["items"][0]["title"] == "First"
        assert data["items"][1]["title"] == "Second"
        assert data["items"][2]["title"] == "Third"
        assert data["items"][0]["orderIndex"] == 0
        assert data["items"][1]["orderIndex"] == 1
        assert data["items"][2]["orderIndex"] == 2

    def test_list_sections_plot_not_found(self, client):
        """List sections for non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/plots/{fake_id}/sections")
        assert response.status_code == 404


class TestUpdateSection:
    """PUT /api/v1/sections/{id}"""

    def test_update_section_title(self, client, test_user_id):
        """Update section title returns 200."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="Original")
        section_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"title": "Updated Title"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_update_section_content(self, client, test_user_id):
        """Update section content (Tiptap JSON) increments version."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(
            client, plot_id, test_user_id, title="Content Test", content=TIPTAP_CONTENT
        )
        section_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"content": TIPTAP_CONTENT_UPDATED},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == TIPTAP_CONTENT_UPDATED
        assert data["version"] == 2  # version incremented on content change

    def test_update_section_title_only_no_version_bump(self, client, test_user_id):
        """Update only title does NOT increment version."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="V1")
        section_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"title": "V1 Renamed"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["version"] == 1  # unchanged

    def test_update_section_not_found(self, client, test_user_id):
        """Update non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/sections/{fake_id}",
            json={"title": "Nope"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_update_section_paused_plot(self, client, test_user_id, db_session):
        """Update section on paused plot returns 403."""
        from app.models import Plot

        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="Paused")
        section_id = create_resp.json()["id"]

        # Pause the plot directly in DB
        plot = db_session.query(Plot).filter(Plot.id == plot_id).first()
        plot.is_paused = True
        db_session.commit()

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"title": "Should Fail"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "This plot is paused"

    def test_update_section_title_too_long(self, client, test_user_id):
        """Title over 200 chars returns 422."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="Valid")
        section_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"title": "x" * 201},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422

    def test_update_section_unauthenticated(self, client, test_user_id):
        """Update without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="Auth Test")
        section_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/sections/{section_id}",
            json={"title": "No Auth"},
        )
        assert response.status_code == 401


class TestDeleteSection:
    """DELETE /api/v1/sections/{id}"""

    def test_delete_section_success(self, client, test_user_id):
        """Delete existing section returns 204."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(client, plot_id, test_user_id, title="Delete Me")
        section_id = create_resp.json()["id"]

        response = client.delete(
            f"/api/v1/sections/{section_id}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 204

        # Verify it's gone
        get_resp = client.get(f"/api/v1/sections/{section_id}")
        assert get_resp.status_code == 404

    def test_delete_section_not_found(self, client, test_user_id):
        """Delete non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.delete(
            f"/api/v1/sections/{fake_id}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_delete_section_paused_plot(self, client, test_user_id, db_session):
        """Delete section on paused plot returns 403."""
        from app.models import Plot

        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(
            client, plot_id, test_user_id, title="Paused Delete"
        )
        section_id = create_resp.json()["id"]

        # Pause the plot
        plot = db_session.query(Plot).filter(Plot.id == plot_id).first()
        plot.is_paused = True
        db_session.commit()

        response = client.delete(
            f"/api/v1/sections/{section_id}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 403

    def test_delete_section_unauthenticated(self, client, test_user_id):
        """Delete without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        create_resp = _create_section(
            client, plot_id, test_user_id, title="Auth Delete"
        )
        section_id = create_resp.json()["id"]

        response = client.delete(f"/api/v1/sections/{section_id}")
        assert response.status_code == 401


class TestReorderSection:
    """POST /api/v1/sections/{id}/reorder"""

    def test_reorder_section_move_down(self, client, test_user_id):
        """Move first section to last position."""
        plot_id = _create_plot(client, test_user_id)
        s1 = _create_section(client, plot_id, test_user_id, title="A").json()
        s2 = _create_section(client, plot_id, test_user_id, title="B").json()
        s3 = _create_section(client, plot_id, test_user_id, title="C").json()

        # Move A (index 0) to index 2
        response = client.post(
            f"/api/v1/sections/{s1['id']}/reorder",
            json={"newOrder": 2},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["orderIndex"] == 2

        # Verify new order: B(0), C(1), A(2)
        list_resp = client.get(f"/api/v1/plots/{plot_id}/sections")
        items = list_resp.json()["items"]
        assert items[0]["title"] == "B"
        assert items[1]["title"] == "C"
        assert items[2]["title"] == "A"

    def test_reorder_section_move_up(self, client, test_user_id):
        """Move last section to first position."""
        plot_id = _create_plot(client, test_user_id)
        s1 = _create_section(client, plot_id, test_user_id, title="A").json()
        s2 = _create_section(client, plot_id, test_user_id, title="B").json()
        s3 = _create_section(client, plot_id, test_user_id, title="C").json()

        # Move C (index 2) to index 0
        response = client.post(
            f"/api/v1/sections/{s3['id']}/reorder",
            json={"newOrder": 0},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["orderIndex"] == 0

        # Verify new order: C(0), A(1), B(2)
        list_resp = client.get(f"/api/v1/plots/{plot_id}/sections")
        items = list_resp.json()["items"]
        assert items[0]["title"] == "C"
        assert items[1]["title"] == "A"
        assert items[2]["title"] == "B"

    def test_reorder_section_same_position(self, client, test_user_id):
        """Reorder to same position is a no-op."""
        plot_id = _create_plot(client, test_user_id)
        s1 = _create_section(client, plot_id, test_user_id, title="A").json()

        response = client.post(
            f"/api/v1/sections/{s1['id']}/reorder",
            json={"newOrder": 0},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["orderIndex"] == 0

    def test_reorder_section_not_found(self, client, test_user_id):
        """Reorder non-existent section returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/api/v1/sections/{fake_id}/reorder",
            json={"newOrder": 0},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_reorder_section_unauthenticated(self, client, test_user_id):
        """Reorder without auth returns 401."""
        plot_id = _create_plot(client, test_user_id)
        s1 = _create_section(client, plot_id, test_user_id, title="A").json()

        response = client.post(
            f"/api/v1/sections/{s1['id']}/reorder",
            json={"newOrder": 0},
        )
        assert response.status_code == 401


class TestSectionTiptapContent:
    """Test Tiptap JSON content handling."""

    def test_tiptap_json_roundtrip(self, client, test_user_id):
        """Tiptap JSON content is stored and retrieved exactly."""
        plot_id = _create_plot(client, test_user_id)
        complex_content = {
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": {"level": 2},
                    "content": [{"type": "text", "text": "Project Goals"}],
                },
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "This is "},
                        {
                            "type": "text",
                            "text": "bold",
                            "marks": [{"type": "bold"}],
                        },
                        {"type": "text", "text": " and "},
                        {
                            "type": "text",
                            "text": "italic",
                            "marks": [{"type": "italic"}],
                        },
                    ],
                },
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Item 1"}],
                                }
                            ],
                        },
                    ],
                },
            ],
        }

        create_resp = _create_section(
            client, plot_id, test_user_id, title="Rich Content", content=complex_content
        )
        section_id = create_resp.json()["id"]

        get_resp = client.get(f"/api/v1/sections/{section_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["content"] == complex_content

    def test_empty_doc_content(self, client, test_user_id):
        """Empty Tiptap doc is stored correctly."""
        plot_id = _create_plot(client, test_user_id)
        empty_doc = {"type": "doc", "content": []}

        create_resp = _create_section(
            client, plot_id, test_user_id, title="Empty Doc", content=empty_doc
        )
        section_id = create_resp.json()["id"]

        get_resp = client.get(f"/api/v1/sections/{section_id}")
        assert get_resp.json()["content"] == empty_doc
