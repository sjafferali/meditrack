from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from app.models import Medication


class TestMedications:
    """Test medication endpoints"""

    @pytest.mark.unit
    def test_create_medication_success(self, client, sample_medication_data):
        """Test successful medication creation"""
        response = client.post("/api/v1/medications/", json=sample_medication_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_medication_data["name"]
        assert data["dosage"] == sample_medication_data["dosage"]
        assert data["frequency"] == sample_medication_data["frequency"]
        assert data["max_doses_per_day"] == sample_medication_data["max_doses_per_day"]
        assert data["instructions"] == sample_medication_data["instructions"]
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.unit
    def test_create_medication_validation_error(self, client):
        """Test medication creation with invalid data"""
        invalid_data = {
            "name": "Test Med",
            "dosage": "100mg",
            "frequency": "Daily",
            "max_doses_per_day": 25,  # Too high (max is 20)
            "instructions": "Test",
        }
        response = client.post("/api/v1/medications/", json=invalid_data)
        assert response.status_code == 422

    @pytest.mark.unit
    def test_create_medication_missing_required_field(self, client):
        """Test medication creation with missing required field"""
        incomplete_data = {
            "name": "Test Med",
            "dosage": "100mg",
            # Missing frequency and max_doses_per_day
        }
        response = client.post("/api/v1/medications/", json=incomplete_data)
        assert response.status_code == 422

    @pytest.mark.unit
    def test_get_medications_empty(self, client):
        """Test getting medications when none exist"""
        response = client.get("/api/v1/medications/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.unit
    def test_get_medications_with_data(self, client, multiple_medications):
        """Test getting all medications"""
        response = client.get("/api/v1/medications/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("doses_taken_today" in med for med in data)
        assert all("last_taken_at" in med for med in data)

    @pytest.mark.unit
    def test_get_medications_with_pagination(self, client, multiple_medications):
        """Test medication pagination"""
        response = client.get("/api/v1/medications/?skip=1&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.unit
    def test_get_medication_by_id_success(self, client, sample_medication):
        """Test getting a specific medication"""
        response = client.get(f"/api/v1/medications/{sample_medication.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_medication.id
        assert data["name"] == sample_medication.name
        assert "doses_taken_today" in data
        assert "last_taken_at" in data

    @pytest.mark.unit
    def test_get_medication_by_id_not_found(self, client):
        """Test getting non-existent medication"""
        response = client.get("/api/v1/medications/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Medication not found"

    @pytest.mark.unit
    def test_update_medication_success(self, client, sample_medication):
        """Test updating a medication"""
        update_data = {"dosage": "200mg", "max_doses_per_day": 3}
        response = client.put(
            f"/api/v1/medications/{sample_medication.id}", json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dosage"] == update_data["dosage"]
        assert data["max_doses_per_day"] == update_data["max_doses_per_day"]
        assert data["name"] == sample_medication.name  # Unchanged

    @pytest.mark.unit
    def test_update_medication_not_found(self, client):
        """Test updating non-existent medication"""
        update_data = {"dosage": "200mg"}
        response = client.put("/api/v1/medications/999", json=update_data)
        assert response.status_code == 404

    @pytest.mark.unit
    def test_update_medication_validation_error(self, client, sample_medication):
        """Test updating medication with invalid data"""
        update_data = {"max_doses_per_day": 30}  # Too high
        response = client.put(
            f"/api/v1/medications/{sample_medication.id}", json=update_data
        )
        assert response.status_code == 422

    @pytest.mark.unit
    def test_delete_medication_success(self, client, sample_medication):
        """Test deleting a medication"""
        response = client.delete(f"/api/v1/medications/{sample_medication.id}")
        assert response.status_code == 204

        # Verify it's deleted
        get_response = client.get(f"/api/v1/medications/{sample_medication.id}")
        assert get_response.status_code == 404

    @pytest.mark.unit
    def test_delete_medication_not_found(self, client):
        """Test deleting non-existent medication"""
        response = client.delete("/api/v1/medications/999")
        assert response.status_code == 404

    @pytest.mark.integration
    def test_medication_with_doses_information(
        self, client, sample_medication, sample_dose
    ):
        """Test medication with dose information"""
        # Get medication with dose taken today
        response = client.get(f"/api/v1/medications/{sample_medication.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["doses_taken_today"] == 1
        assert data["last_taken_at"] is not None

    @pytest.mark.integration
    def test_medication_lifecycle(self, client, sample_medication_data):
        """Test complete medication lifecycle"""
        # Create
        create_response = client.post(
            "/api/v1/medications/", json=sample_medication_data
        )
        assert create_response.status_code == 201
        med_id = create_response.json()["id"]

        # Read
        get_response = client.get(f"/api/v1/medications/{med_id}")
        assert get_response.status_code == 200

        # Update
        update_data = {"dosage": "150mg"}
        update_response = client.put(f"/api/v1/medications/{med_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["dosage"] == "150mg"

        # Delete
        delete_response = client.delete(f"/api/v1/medications/{med_id}")
        assert delete_response.status_code == 204

        # Verify deleted
        final_response = client.get(f"/api/v1/medications/{med_id}")
        assert final_response.status_code == 404
