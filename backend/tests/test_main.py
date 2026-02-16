from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    """Health endpoint returns ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_docs_available():
    """Swagger docs endpoint is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_json():
    """OpenAPI spec is accessible."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "Plot Platform API"
