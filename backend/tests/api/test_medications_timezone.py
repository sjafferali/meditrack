from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Dose, Medication


def test_medication_dose_count_with_timezone(client: TestClient, db_session: Session):
    """Test that dose counts work correctly with timezone offset"""
    # Create a medication
    medication = Medication(
        name="Test Med", dosage="10mg", frequency="Daily", max_doses_per_day=4
    )
    db_session.add(medication)
    db_session.commit()
    db_session.refresh(medication)

    # Create doses in different timezones
    # User is in PST (-480 minutes from UTC)
    user_timezone_offset = -480
    tz_offset = timedelta(minutes=-user_timezone_offset)
    user_tz = timezone(tz_offset)

    # Create a dose at 11 PM PST (which would be 7 AM UTC next day)
    dose_time_pst = datetime.now(user_tz).replace(
        hour=23, minute=0, second=0, microsecond=0
    )
    dose1 = Dose(medication_id=medication.id, taken_at=dose_time_pst)
    db_session.add(dose1)

    # Create another dose at 1 AM PST (same day in PST, but next day in UTC)
    dose_time_pst_early = dose_time_pst.replace(hour=1)
    dose2 = Dose(medication_id=medication.id, taken_at=dose_time_pst_early)
    db_session.add(dose2)
    db_session.commit()

    # Get medications without timezone offset (should use UTC)
    response = client.get("/api/v1/medications/")
    assert response.status_code == 200
    data = response.json()

    # Without timezone, it might split the doses across different days

    # Get medications with timezone offset (should group correctly)
    response = client.get(
        "/api/v1/medications/", params={"timezone_offset": user_timezone_offset}
    )
    assert response.status_code == 200
    data = response.json()

    # With timezone offset, doses should be correctly counted for the same day
    assert len(data) == 1
    med_data = data[0]
    assert med_data["doses_taken_today"] == 2  # Both doses on same day in PST


def test_record_dose_and_get_medications_timezone_consistency(
    client: TestClient, db_session: Session
):
    """Test that recording doses and getting medications use
    consistent timezone logic"""
    # Create a medication
    medication = Medication(
        name="Test Med", dosage="10mg", frequency="Daily", max_doses_per_day=4
    )
    db_session.add(medication)
    db_session.commit()
    db_session.refresh(medication)

    # Record a dose with timezone offset
    timezone_offset = 300  # EST
    response = client.post(
        f"/api/v1/doses/medications/{medication.id}/dose",
        json={"timezone_offset": timezone_offset},
    )
    assert response.status_code == 201

    # Get medications with same timezone offset
    response = client.get(
        "/api/v1/medications/", params={"timezone_offset": timezone_offset}
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["doses_taken_today"] == 1  # Should show the dose we just recorded

    # Get medications without timezone offset (might show different count)
    response = client.get("/api/v1/medications/")
    assert response.status_code == 200
    response.json()  # Ensure the response is valid JSON

    # Depending on the time of day, this might be different
    # But the important thing is consistency when using the same timezone offset
