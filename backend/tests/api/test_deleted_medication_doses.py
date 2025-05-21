import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.dose import Dose


class TestDeletedMedicationDoses:
    def test_delete_medication_preserves_doses(self, client, db_session):
        """Test that deleting a medication preserves its dose history."""
        # Create test person
        person_response = client.post(
            "/api/v1/persons/",
            json={"name": "Test Person", "is_default": True},
        )
        assert person_response.status_code == 201
        person_id = person_response.json()["id"]
        
        # Create test medication
        medication_response = client.post(
            "/api/v1/medications/",
            json={
                "name": "Test Medication",
                "dosage": "10mg",
                "frequency": "Once daily",
                "max_doses_per_day": 2,
                "person_id": person_id,
            },
        )
        assert medication_response.status_code == 201
        medication = medication_response.json()
        medication_id = medication["id"]
        
        # Record a dose
        dose_response = client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        assert dose_response.status_code == 201
        dose = dose_response.json()
        
        # Verify dose exists
        get_doses_response = client.get(f"/api/v1/doses/medications/{medication_id}/doses")
        assert get_doses_response.status_code == 200
        doses = get_doses_response.json()
        assert len(doses) == 1
        assert doses[0]["id"] == dose["id"]
        
        # Verify the dose was created before deletion
        get_doses_response = client.get(f"/api/v1/doses/medications/{medication_id}/doses")
        assert get_doses_response.status_code == 200
        doses_before = get_doses_response.json()
        assert len(doses_before) == 1
        dose_id = doses_before[0]["id"]
        
        # Delete the medication
        delete_response = client.delete(f"/api/v1/medications/{medication_id}")
        assert delete_response.status_code == 204
        
        # Verify medication is gone
        get_medication_response = client.get(f"/api/v1/medications/{medication_id}")
        assert get_medication_response.status_code == 404
        
        # Directly check the dose in the database
        # This is a more direct test than using the API
        dose = db_session.query(Dose).filter_by(id=dose_id).first()
        assert dose is not None, "Dose should still exist after medication deletion"
        assert dose.medication_id is None, "Medication ID should be null"
        assert dose.medication_name == "Test Medication", "Medication name should be preserved"
    
    def test_delete_medication_without_doses(self, client, db_session):
        """Test deleting a medication that has no dose history."""
        # Create test person
        person_response = client.post(
            "/api/v1/persons/",
            json={"name": "Test Person 2", "is_default": False},
        )
        assert person_response.status_code == 201
        person_id = person_response.json()["id"]
        
        # Create test medication
        medication_response = client.post(
            "/api/v1/medications/",
            json={
                "name": "Unused Medication",
                "dosage": "5mg",
                "frequency": "As needed",
                "max_doses_per_day": 3,
                "person_id": person_id,
            },
        )
        assert medication_response.status_code == 201
        medication_id = medication_response.json()["id"]
        
        # Delete the medication without recording any doses
        delete_response = client.delete(f"/api/v1/medications/{medication_id}")
        assert delete_response.status_code == 204
        
        # Verify medication is gone
        get_medication_response = client.get(f"/api/v1/medications/{medication_id}")
        assert get_medication_response.status_code == 404
        
        # Check the API endpoint for deleted medication doses returns 404
        get_deleted_doses_response = client.get("/api/v1/doses/deleted-medications/by-name/Unused Medication/doses")
        assert get_deleted_doses_response.status_code == 404