"""Tests for Plot CRUD API endpoints."""

import uuid


class TestCreatePlot:
    """POST /api/v1/plots"""

    def test_create_plot_success(self, client, test_user_id):
        """Create a plot with valid data returns 201."""
        response = client.post(
            "/api/v1/plots",
            json={
                "title": "New Plot",
                "description": "A test plot description",
                "tags": ["tag1", "tag2"],
            },
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Plot"
        assert data["description"] == "A test plot description"
        assert data["tags"] == ["tag1", "tag2"]
        assert "id" in data
        assert data["ownerId"] == str(test_user_id)
        assert data["starCount"] == 0
        assert data["isStarred"] is False
        assert data["isPaused"] is False
        assert data["editingUsers"] == []
        assert "createdAt" in data
        assert "updatedAt" in data

    def test_create_plot_minimal(self, client, test_user_id):
        """Create a plot with only title (minimum required fields)."""
        response = client.post(
            "/api/v1/plots",
            json={"title": "Minimal Plot"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Minimal Plot"
        assert data["description"] == ""
        assert data["tags"] == []

    def test_create_plot_title_too_long(self, client, test_user_id):
        """Title over 200 chars returns 422."""
        response = client.post(
            "/api/v1/plots",
            json={"title": "x" * 201},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422

    def test_create_plot_description_too_long(self, client, test_user_id):
        """Description over 2000 chars returns 422."""
        response = client.post(
            "/api/v1/plots",
            json={"title": "Valid", "description": "x" * 2001},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422

    def test_create_plot_missing_title(self, client, test_user_id):
        """Missing title returns 422."""
        response = client.post(
            "/api/v1/plots",
            json={"description": "No title"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422


class TestListPlots:
    """GET /api/v1/plots"""

    def test_list_plots_empty(self, client):
        """List plots returns empty list when no plots exist."""
        response = client.get("/api/v1/plots")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["limit"] == 20
        assert data["offset"] == 0

    def test_list_plots_with_data(self, client, test_user_id):
        """List plots returns created plots."""
        # Create a plot first
        client.post(
            "/api/v1/plots",
            json={"title": "Listed Plot", "tags": ["test"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        response = client.get("/api/v1/plots")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Listed Plot"

    def test_list_plots_pagination(self, client, test_user_id):
        """Pagination with limit and offset works."""
        # Create 3 plots
        for i in range(3):
            client.post(
                "/api/v1/plots",
                json={"title": f"Plot {i}"},
                headers={"X-Test-User-Id": str(test_user_id)},
            )

        response = client.get("/api/v1/plots?limit=2&offset=0")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["limit"] == 2
        assert data["offset"] == 0

        response = client.get("/api/v1/plots?limit=2&offset=2")
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 3

    def test_list_plots_limit_max_100(self, client):
        """Limit cannot exceed 100."""
        response = client.get("/api/v1/plots?limit=200")
        assert response.status_code == 422

    def test_list_plots_filter_by_tag(self, client, test_user_id):
        """Filter plots by tag."""
        client.post(
            "/api/v1/plots",
            json={"title": "Tagged Plot", "tags": ["python", "api"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        client.post(
            "/api/v1/plots",
            json={"title": "Other Plot", "tags": ["javascript"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )

        response = client.get("/api/v1/plots?tag=python")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Tagged Plot"


class TestGetPlot:
    """GET /api/v1/plots/{id}"""

    def test_get_plot_success(self, client, test_user_id):
        """Get existing plot returns 200."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Get Me", "description": "desc", "tags": ["t"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.get(f"/api/v1/plots/{plot_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == plot_id
        assert data["title"] == "Get Me"
        assert data["description"] == "desc"

    def test_get_plot_not_found(self, client):
        """Get non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/plots/{fake_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Plot not found"


class TestUpdatePlot:
    """PUT /api/v1/plots/{id}"""

    def test_update_plot_title(self, client, test_user_id):
        """Update plot title returns 200."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Original"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/plots/{plot_id}",
            json={"title": "Updated"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated"

    def test_update_plot_description(self, client, test_user_id):
        """Update plot description."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Plot", "description": "old"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/plots/{plot_id}",
            json={"description": "new description"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["description"] == "new description"

    def test_update_plot_tags(self, client, test_user_id):
        """Update plot tags."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Plot", "tags": ["old"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/plots/{plot_id}",
            json={"tags": ["new1", "new2"]},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 200
        assert response.json()["tags"] == ["new1", "new2"]

    def test_update_plot_not_found(self, client, test_user_id):
        """Update non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/plots/{fake_id}",
            json={"title": "Nope"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404

    def test_update_plot_title_too_long(self, client, test_user_id):
        """Update with title over 200 chars returns 422."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Valid"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/plots/{plot_id}",
            json={"title": "x" * 201},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 422


class TestDeletePlot:
    """DELETE /api/v1/plots/{id}"""

    def test_delete_plot_success(self, client, test_user_id):
        """Delete existing plot returns 204."""
        create_resp = client.post(
            "/api/v1/plots",
            json={"title": "Delete Me"},
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        plot_id = create_resp.json()["id"]

        response = client.delete(
            f"/api/v1/plots/{plot_id}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 204

        # Verify it's gone
        get_resp = client.get(f"/api/v1/plots/{plot_id}")
        assert get_resp.status_code == 404

    def test_delete_plot_not_found(self, client, test_user_id):
        """Delete non-existent plot returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.delete(
            f"/api/v1/plots/{fake_id}",
            headers={"X-Test-User-Id": str(test_user_id)},
        )
        assert response.status_code == 404
