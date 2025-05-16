from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models import Dose, Medication


class TestDoses:
    """Test dose tracking endpoints"""

    @pytest.mark.unit
    def test_record_dose_success(self, client, sample_medication):
        """Test successfully recording a dose"""
        response = client.post(f"/api/v1/doses/medications/{sample_medication.id}/dose")
        assert response.status_code == 201
        data = response.json()
        assert data["medication_id"] == sample_medication.id
        assert "taken_at" in data
        assert "id" in data

    @pytest.mark.unit
    def test_record_dose_medication_not_found(self, client):
        """Test recording dose for non-existent medication"""
        response = client.post("/api/v1/doses/medications/999/dose")
        assert response.status_code == 404
        assert response.json()["detail"] == "Medication not found"

    @pytest.mark.unit
    def test_record_dose_max_reached(self, client, sample_medication):
        """Test recording dose when daily limit reached"""
        # Record doses up to the limit
        for _ in range(sample_medication.max_doses_per_day):
            response = client.post(
                f"/api/v1/doses/medications/{sample_medication.id}/dose"
            )
            assert response.status_code == 201

        # Try to record one more dose
        response = client.post(f"/api/v1/doses/medications/{sample_medication.id}/dose")
        assert response.status_code == 400
        assert (
            f"Maximum doses ({sample_medication.max_doses_per_day}) already taken today"
            in response.json()["detail"]
        )

    @pytest.mark.unit
    def test_get_doses_empty(self, client, sample_medication):
        """Test getting doses when none exist"""
        response = client.get(f"/api/v1/doses/medications/{sample_medication.id}/doses")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.unit
    def test_get_doses_with_data(self, client, sample_medication):
        """Test getting dose history"""
        # Record multiple doses
        for _ in range(2):
            client.post(f"/api/v1/doses/medications/{sample_medication.id}/dose")

        response = client.get(f"/api/v1/doses/medications/{sample_medication.id}/doses")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # Should be ordered by taken_at desc
        assert data[0]["taken_at"] >= data[1]["taken_at"]

    @pytest.mark.unit
    def test_get_doses_medication_not_found(self, client):
        """Test getting doses for non-existent medication"""
        response = client.get("/api/v1/doses/medications/999/doses")
        assert response.status_code == 404

    @pytest.mark.unit
    def test_get_doses_pagination(self, client, sample_medication, db_session):
        """Test dose history pagination"""
        # Record 5 doses on different days to avoid limit
        for i in range(5):
            dose = Dose(
                medication_id=sample_medication.id,
                taken_at=datetime.now(timezone.utc) - timedelta(days=i),
            )
            db_session.add(dose)
        db_session.commit()

        response = client.get(
            f"/api/v1/doses/medications/{sample_medication.id}/doses?skip=1&limit=2"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.unit
    def test_get_daily_summary_empty(self, client):
        """Test daily summary with no medications"""
        response = client.get("/api/v1/doses/daily-summary")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert data["medications"] == []

    @pytest.mark.unit
    def test_get_daily_summary_with_data(self, client, multiple_medications):
        """Test daily summary with multiple medications and doses"""
        # Record doses for first two medications
        client.post(f"/api/v1/doses/medications/{multiple_medications[0].id}/dose")
        client.post(f"/api/v1/doses/medications/{multiple_medications[1].id}/dose")
        client.post(f"/api/v1/doses/medications/{multiple_medications[1].id}/dose")

        response = client.get("/api/v1/doses/daily-summary")
        assert response.status_code == 200
        data = response.json()

        assert "date" in data
        assert len(data["medications"]) == 3

        # Check medication summaries
        for med_summary in data["medications"]:
            if med_summary["medication_id"] == multiple_medications[0].id:
                assert med_summary["doses_taken"] == 1
                assert med_summary["max_doses"] == 1
            elif med_summary["medication_id"] == multiple_medications[1].id:
                assert med_summary["doses_taken"] == 2
                assert med_summary["max_doses"] == 4
            else:
                assert med_summary["doses_taken"] == 0
                assert med_summary["max_doses"] == 6

    @pytest.mark.integration
    def test_dose_tracking_workflow(self, client, sample_medication):
        """Test complete dose tracking workflow"""
        # Check initial state
        summary_response = client.get("/api/v1/doses/daily-summary")
        assert summary_response.status_code == 200
        initial_summary = summary_response.json()
        medication_summary = next(
            m
            for m in initial_summary["medications"]
            if m["medication_id"] == sample_medication.id
        )
        assert medication_summary["doses_taken"] == 0

        # Record a dose
        dose_response = client.post(
            f"/api/v1/doses/medications/{sample_medication.id}/dose"
        )
        assert dose_response.status_code == 201

        # Check updated summary
        updated_response = client.get("/api/v1/doses/daily-summary")
        updated_summary = updated_response.json()
        medication_summary = next(
            m
            for m in updated_summary["medications"]
            if m["medication_id"] == sample_medication.id
        )
        assert medication_summary["doses_taken"] == 1
        assert len(medication_summary["dose_times"]) == 1

    @pytest.mark.integration
    def test_cross_day_dose_reset(self, client, sample_medication, db_session):
        """Test that dose counts reset across days"""
        # Record dose yesterday
        yesterday_dose = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db_session.add(yesterday_dose)
        db_session.commit()

        # Record dose today
        client.post(f"/api/v1/doses/medications/{sample_medication.id}/dose")

        # Check that yesterday's dose doesn't count toward today's limit
        response = client.get(f"/api/v1/medications/{sample_medication.id}")
        data = response.json()
        assert data["doses_taken_today"] == 1  # Only today's dose counts

        # Can still take another dose today
        response = client.post(f"/api/v1/doses/medications/{sample_medication.id}/dose")
        assert response.status_code == 201

    @pytest.mark.slow
    @pytest.mark.skip(reason="Concurrent testing with TestClient is problematic")
    def test_concurrent_dose_recording(self, client, sample_medication):
        """Test concurrent dose recording doesn't exceed limits"""
        # Skip this test as TestClient doesn't handle concurrent requests well
        # This would be better tested with a real HTTP client in integration tests
        pass
