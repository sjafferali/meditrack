import pytest


class TestMainApp:
    """Test main application endpoints"""

    @pytest.mark.unit
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    @pytest.mark.unit
    def test_root_endpoint(self, client):
        """Test root endpoint - in tests it returns 404 since no static files exist"""
        response = client.get("/")
        # In test environment without built frontend, root returns 404
        # This is expected behavior - in production it would serve the React app
        assert response.status_code == 404

    @pytest.mark.unit
    def test_openapi_schema(self, client):
        """Test OpenAPI schema is accessible"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "MediTrack"

    @pytest.mark.unit
    def test_docs_endpoint(self, client):
        """Test Swagger UI docs endpoint"""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger" in response.text.lower()

    @pytest.mark.unit
    def test_redoc_endpoint(self, client):
        """Test ReDoc endpoint"""
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "redoc" in response.text.lower()

    @pytest.mark.unit
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        # Use GET request with Origin header to test CORS
        response = client.get(
            "/api/v1/medications/", headers={"Origin": "http://localhost:3000"}
        )
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    @pytest.mark.unit
    def test_invalid_endpoint(self, client):
        """Test 404 for invalid endpoint"""
        response = client.get("/api/v1/invalid-endpoint")
        assert response.status_code == 404

    @pytest.mark.integration
    def test_api_versioning(self, client):
        """Test API versioning works correctly"""
        # v1 endpoints should work
        response = client.get("/api/v1/medications/")
        assert response.status_code == 200

        # Non-versioned endpoints should not work
        response = client.get("/medications/")
        assert response.status_code == 404
