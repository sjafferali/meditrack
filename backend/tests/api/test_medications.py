import pytest
from sqlalchemy.orm import Session

from app.models import Medication


class TestMedications:
    def test_create_medication(self, client):
        medication_data = {
            "name": "Aspirin",
            "dosage": "100mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Take with water"
        }
        response = client.post("/api/v1/medications/", json=medication_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == medication_data["name"]
        assert data["dosage"] == medication_data["dosage"]
        assert data["frequency"] == medication_data["frequency"]
        assert data["max_doses_per_day"] == medication_data["max_doses_per_day"]
        assert data["instructions"] == medication_data["instructions"]
        assert "id" in data
        assert "created_at" in data

    def test_get_medications(self, client):
        # Create a medication first
        medication_data = {
            "name": "Ibuprofen",
            "dosage": "200mg",
            "frequency": "Every 6 hours",
            "max_doses_per_day": 4,
            "instructions": "Take with food"
        }
        client.post("/api/v1/medications/", json=medication_data)
        
        response = client.get("/api/v1/medications/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == medication_data["name"]
        assert "doses_taken_today" in data[0]
        assert "last_taken_at" in data[0]

    def test_get_medication_by_id(self, client):
        # Create a medication
        medication_data = {
            "name": "Paracetamol",
            "dosage": "500mg",
            "frequency": "Every 4 hours",
            "max_doses_per_day": 6,
            "instructions": "Take as needed for pain"
        }
        create_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = create_response.json()["id"]
        
        response = client.get(f"/api/v1/medications/{medication_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == medication_id
        assert data["name"] == medication_data["name"]
        assert "doses_taken_today" in data
        assert "last_taken_at" in data

    def test_get_medication_not_found(self, client):
        response = client.get("/api/v1/medications/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Medication not found"

    def test_update_medication(self, client):
        # Create a medication
        medication_data = {
            "name": "Amoxicillin",
            "dosage": "250mg",
            "frequency": "Every 8 hours",
            "max_doses_per_day": 3,
            "instructions": "Complete full course"
        }
        create_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = create_response.json()["id"]
        
        # Update the medication
        update_data = {
            "dosage": "500mg",
            "max_doses_per_day": 4
        }
        response = client.put(f"/api/v1/medications/{medication_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["dosage"] == update_data["dosage"]
        assert data["max_doses_per_day"] == update_data["max_doses_per_day"]
        assert data["name"] == medication_data["name"]  # Unchanged

    def test_delete_medication(self, client):
        # Create a medication
        medication_data = {
            "name": "Test Medication",
            "dosage": "10mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Test"
        }
        create_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = create_response.json()["id"]
        
        # Delete the medication
        response = client.delete(f"/api/v1/medications/{medication_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(f"/api/v1/medications/{medication_id}")
        assert get_response.status_code == 404

    def test_create_medication_validation(self, client):
        # Test with invalid max_doses_per_day
        medication_data = {
            "name": "Invalid Med",
            "dosage": "100mg",
            "frequency": "Once daily",
            "max_doses_per_day": 25,  # Too high
            "instructions": "Test"
        }
        response = client.post("/api/v1/medications/", json=medication_data)
        assert response.status_code == 422  # Validation error