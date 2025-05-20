import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


class TestHealthEndpoint:
    """Test health endpoint"""

    @pytest.mark.unit
    def test_root_health_check(self, client):
        """Test root health endpoint returns healthy status"""
        # Test the root health endpoint
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    @pytest.mark.unit
    def test_api_health_check(self, client):
        """Test API health endpoint returns healthy status"""
        # Test the API health endpoint
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        
        # Check components section
        assert "components" in data
        components = data["components"]
        assert len(components) == 2
        
        # Check database component
        db_component = next((c for c in components if c["component"] == "database"), None)
        assert db_component is not None
        assert db_component["status"] == "healthy"
        
        # Check API component
        api_component = next((c for c in components if c["component"] == "api"), None)
        assert api_component is not None
        assert api_component["status"] == "healthy"
        assert "timestamp" in api_component["details"]
        assert "environment" in api_component["details"]

    @pytest.mark.unit
    def test_health_check_database_failure(self, client, monkeypatch):
        """Test database failure handling in the API health endpoint"""
        # Mock the database execute method to raise an exception
        def mock_execute(*args, **kwargs):
            raise Exception("Database connection error")
        
        # Use monkeypatch to replace the execution method temporarily
        from sqlalchemy.orm import Session
        monkeypatch.setattr(Session, "execute", mock_execute)
        
        # Call API health endpoint, which should now return 500
        response = client.get("/api/v1/health")
        assert response.status_code == 500
        assert "Health check failed" in response.json()["detail"]