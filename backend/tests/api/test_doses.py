from datetime import datetime, timedelta, timezone

import pytest

from app.models import Dose


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
            f"Maximum doses ({sample_medication.max_doses_per_day}) taken today"
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
        # Verify all required fields are present
        for dose in data:
            assert "id" in dose
            assert "medication_id" in dose
            assert "taken_at" in dose
            assert dose["medication_id"] == sample_medication.id

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

    @pytest.mark.unit
    def test_dose_timestamp_format(self, client, sample_medication, db_session):
        """Test that dose timestamps are properly formatted"""
        # Create a dose with a specific timestamp
        dose = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        )
        db_session.add(dose)
        db_session.commit()
        
        response = client.get(f"/api/v1/doses/medications/{sample_medication.id}/doses")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        assert "taken_at" in data[0]
        # Verify the timestamp is properly formatted as ISO 8601
        assert "T" in data[0]["taken_at"]
        # The timestamp should be in ISO format (may or may not have timezone)
        # Should be able to parse it - just catch any parsing error
        try:
            datetime.fromisoformat(data[0]["taken_at"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"Timestamp {data[0]['taken_at']} is not in valid ISO format")

    @pytest.mark.unit
    def test_get_doses_by_date(self, client, sample_medication, db_session):
        """Test getting doses for a specific date"""
        # Create doses on different dates
        dose1 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        )
        dose2 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 21, 0, 0, tzinfo=timezone.utc)
        )
        dose3 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 16, 9, 0, 0, tzinfo=timezone.utc)
        )
        db_session.add_all([dose1, dose2, dose3])
        db_session.commit()
        
        response = client.get(f"/api/v1/doses/medications/{sample_medication.id}/doses/2023-01-15")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2  # Only doses from Jan 15
        
        # Verify doses are ordered by time ascending
        assert data[0]["taken_at"] < data[1]["taken_at"]

    @pytest.mark.unit
    def test_get_doses_by_date_no_doses(self, client, sample_medication):
        """Test getting doses for a date with no doses"""
        response = client.get(f"/api/v1/doses/medications/{sample_medication.id}/doses/2023-01-15")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.unit
    def test_get_doses_by_date_medication_not_found(self, client):
        """Test getting doses for non-existent medication"""
        response = client.get("/api/v1/doses/medications/999/doses/2023-01-15")
        assert response.status_code == 404

    @pytest.mark.unit
    def test_record_dose_for_date(self, client, sample_medication):
        """Test recording a dose for a specific date and time"""
        response = client.post(
            f"/api/v1/doses/medications/{sample_medication.id}/dose/2023-01-15?time=14:30"
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["medication_id"] == sample_medication.id
        assert "2023-01-15" in data["taken_at"]
        assert "14:30" in data["taken_at"]

    @pytest.mark.unit
    def test_record_dose_for_future_date(self, client, sample_medication):
        """Test that recording dose for future date is rejected"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=1)).date()
        response = client.post(
            f"/api/v1/doses/medications/{sample_medication.id}/dose/{future_date}?time=14:30"
        )
        assert response.status_code == 400
        assert "Cannot record doses for future dates" in response.json()["detail"]

    @pytest.mark.unit
    def test_record_dose_invalid_time_format(self, client, sample_medication):
        """Test recording dose with invalid time format"""
        response = client.post(
            f"/api/v1/doses/medications/{sample_medication.id}/dose/2023-01-15?time=invalid"
        )
        assert response.status_code == 400
        assert "Invalid time format" in response.json()["detail"]

    @pytest.mark.unit
    def test_record_dose_for_date_max_reached(self, client, sample_medication, db_session):
        """Test recording dose when max doses reached for that date"""
        # Create doses up to the maximum for the specific date
        test_date = datetime(2023, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
        for i in range(sample_medication.max_doses_per_day):
            dose = Dose(
                medication_id=sample_medication.id,
                taken_at=test_date.replace(hour=i+8)
            )
            db_session.add(dose)
        db_session.commit()
        
        # Try to record one more dose
        response = client.post(
            f"/api/v1/doses/medications/{sample_medication.id}/dose/2023-01-15?time=20:00"
        )
        assert response.status_code == 400
        assert "Maximum doses" in response.json()["detail"]

    @pytest.mark.unit
    def test_get_daily_summary_by_date(self, client, sample_medication, db_session):
        """Test getting daily summary for a specific date"""
        # Create doses on the specific date
        dose = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        )
        db_session.add(dose)
        db_session.commit()
        
        response = client.get("/api/v1/doses/daily-summary/2023-01-15")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2023-01-15"
        assert len(data["medications"]) > 0
        
        # Find our medication in the summary
        med_summary = next(
            m for m in data["medications"] 
            if m["medication_id"] == sample_medication.id
        )
        assert med_summary["doses_taken"] == 1
        assert len(med_summary["dose_times"]) == 1
