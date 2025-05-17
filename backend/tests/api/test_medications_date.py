"""Test medication endpoints with date parameters"""

from datetime import date, datetime, timedelta, timezone

import pytest

from app.models import Dose


class TestMedicationsWithDate:
    """Test medication endpoints with date filtering functionality"""

    @pytest.mark.unit
    def test_get_medications_with_date(self, client, sample_medication, db_session):
        """Test getting medications with dose information for specific date"""
        # Create doses on different dates
        dose1 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        dose2 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 16, 9, 0, 0, tzinfo=timezone.utc),
        )
        db_session.add_all([dose1, dose2])
        db_session.commit()

        # Get medications for Jan 15
        response = client.get("/api/v1/medications/?date=2023-01-15")
        assert response.status_code == 200

        data = response.json()
        assert len(data) > 0

        medication = data[0]
        assert medication["doses_taken_today"] == 1
        assert medication["last_taken_at"] is not None

    @pytest.mark.unit
    def test_get_medications_without_date_uses_today(
        self, client, sample_medication, db_session
    ):
        """Test that omitting date parameter uses today's date"""
        # Create a dose for today
        dose = Dose(
            medication_id=sample_medication.id, taken_at=datetime.now(timezone.utc)
        )
        db_session.add(dose)
        db_session.commit()

        response = client.get("/api/v1/medications/")
        assert response.status_code == 200

        data = response.json()
        medication = data[0]
        assert medication["doses_taken_today"] == 1

    @pytest.mark.unit
    def test_get_single_medication_with_date(
        self, client, sample_medication, db_session
    ):
        """Test getting single medication with dose info for specific date"""
        # Create doses on different dates
        dose1 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        dose2 = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 21, 0, 0, tzinfo=timezone.utc),
        )
        db_session.add_all([dose1, dose2])
        db_session.commit()

        response = client.get(
            f"/api/v1/medications/{sample_medication.id}?date=2023-01-15"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["doses_taken_today"] == 2
        assert data["last_taken_at"] is not None

    @pytest.mark.unit
    def test_get_medication_no_doses_on_date(self, client, sample_medication):
        """Test getting medication for date with no doses"""
        response = client.get(
            f"/api/v1/medications/{sample_medication.id}?date=2023-01-15"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["doses_taken_today"] == 0
        assert data["last_taken_at"] is None

    @pytest.mark.unit
    def test_date_filtering_respects_boundaries(
        self, client, sample_medication, db_session
    ):
        """Test that date filtering respects day boundaries"""
        # Create doses at the edge of day boundaries
        dose_late = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 15, 23, 59, 59, tzinfo=timezone.utc),
        )
        dose_early = Dose(
            medication_id=sample_medication.id,
            taken_at=datetime(2023, 1, 16, 0, 0, 1, tzinfo=timezone.utc),
        )
        db_session.add_all([dose_late, dose_early])
        db_session.commit()

        # Get Jan 15
        response = client.get("/api/v1/medications/?date=2023-01-15")
        data = response.json()
        medication = data[0]
        assert medication["doses_taken_today"] == 1

        # Get Jan 16
        response = client.get("/api/v1/medications/?date=2023-01-16")
        data = response.json()
        medication = data[0]
        assert medication["doses_taken_today"] == 1

    @pytest.mark.integration
    def test_date_consistency_across_endpoints(
        self, client, sample_medication, db_session
    ):
        """Test that date filtering is consistent across different endpoints"""
        test_date = date(2023, 1, 15)

        # Create some doses on the test date
        for hour in [8, 12, 20]:
            dose = Dose(
                medication_id=sample_medication.id,
                taken_at=datetime.combine(test_date, datetime.min.time()).replace(
                    hour=hour, tzinfo=timezone.utc
                ),
            )
            db_session.add(dose)
        db_session.commit()

        # Check medications endpoint
        response = client.get(f"/api/v1/medications/?date={test_date}")
        med_data = response.json()[0]

        # Check single medication endpoint
        response = client.get(
            f"/api/v1/medications/{sample_medication.id}?date={test_date}"
        )
        single_med_data = response.json()

        # Check doses endpoint for the date
        response = client.get(
            f"/api/v1/doses/medications/{sample_medication.id}/doses/{test_date}"
        )
        doses_data = response.json()

        # Check daily summary
        response = client.get(f"/api/v1/doses/daily-summary/{test_date}")
        summary_data = response.json()
        med_summary = next(
            m
            for m in summary_data["medications"]
            if m["medication_id"] == sample_medication.id
        )

        # All endpoints should report 3 doses
        assert med_data["doses_taken_today"] == 3
        assert single_med_data["doses_taken_today"] == 3
        assert len(doses_data) == 3
        assert med_summary["doses_taken"] == 3
