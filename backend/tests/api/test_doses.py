import pytest
from datetime import datetime, timezone

from app.models import Medication, Dose


class TestDoses:
    def test_record_dose(self, client):
        # Create a medication first
        medication_data = {
            "name": "Test Med",
            "dosage": "100mg",
            "frequency": "Twice daily",
            "max_doses_per_day": 2,
            "instructions": "Take with meals"
        }
        med_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = med_response.json()["id"]
        
        # Record a dose
        response = client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        assert response.status_code == 201
        data = response.json()
        assert data["medication_id"] == medication_id
        assert "taken_at" in data
        assert "id" in data

    def test_record_dose_medication_not_found(self, client):
        response = client.post("/api/v1/doses/medications/999/dose")
        assert response.status_code == 404
        assert response.json()["detail"] == "Medication not found"

    def test_record_dose_max_reached(self, client):
        # Create a medication with max 1 dose per day
        medication_data = {
            "name": "Limited Med",
            "dosage": "50mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Maximum one per day"
        }
        med_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = med_response.json()["id"]
        
        # Record first dose - should succeed
        response1 = client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        assert response1.status_code == 201
        
        # Try to record second dose - should fail
        response2 = client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        assert response2.status_code == 400
        assert "Maximum doses (1) already taken today" in response2.json()["detail"]

    def test_get_doses(self, client):
        # Create a medication
        medication_data = {
            "name": "Test Med",
            "dosage": "100mg",
            "frequency": "Three times daily",
            "max_doses_per_day": 3,
            "instructions": "Regular intervals"
        }
        med_response = client.post("/api/v1/medications/", json=medication_data)
        medication_id = med_response.json()["id"]
        
        # Record multiple doses
        client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        client.post(f"/api/v1/doses/medications/{medication_id}/dose")
        
        # Get dose history
        response = client.get(f"/api/v1/doses/medications/{medication_id}/doses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        # Should be ordered by taken_at desc
        assert data[0]["taken_at"] >= data[1]["taken_at"]

    def test_get_daily_summary(self, client):
        # Create medications
        med1_data = {
            "name": "Morning Med",
            "dosage": "100mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Take in morning"
        }
        med1_response = client.post("/api/v1/medications/", json=med1_data)
        med1_id = med1_response.json()["id"]
        
        med2_data = {
            "name": "Afternoon Med",
            "dosage": "200mg",
            "frequency": "Twice daily",
            "max_doses_per_day": 2,
            "instructions": "Take with lunch and dinner"
        }
        med2_response = client.post("/api/v1/medications/", json=med2_data)
        med2_id = med2_response.json()["id"]
        
        # Record doses
        client.post(f"/api/v1/doses/medications/{med1_id}/dose")
        client.post(f"/api/v1/doses/medications/{med2_id}/dose")
        
        # Get daily summary
        response = client.get("/api/v1/doses/daily-summary")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "medications" in data
        assert len(data["medications"]) == 2
        
        # Check the data for each medication
        med1_summary = next(m for m in data["medications"] if m["medication_id"] == med1_id)
        assert med1_summary["medication_name"] == "Morning Med"
        assert med1_summary["doses_taken"] == 1
        assert med1_summary["max_doses"] == 1
        assert len(med1_summary["dose_times"]) == 1
        
        med2_summary = next(m for m in data["medications"] if m["medication_id"] == med2_id)
        assert med2_summary["medication_name"] == "Afternoon Med"
        assert med2_summary["doses_taken"] == 1
        assert med2_summary["max_doses"] == 2
        assert len(med2_summary["dose_times"]) == 1