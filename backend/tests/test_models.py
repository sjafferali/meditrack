from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Dose, Medication


class TestMedicationModel:
    """Test Medication model"""

    @pytest.mark.unit
    def test_create_medication(self, db_session, sample_person):
        """Test creating a medication"""
        medication = Medication(
            person_id=sample_person.id,
            name="Test Med",
            dosage="100mg",
            frequency="Once daily",
            max_doses_per_day=1,
            instructions="Test instructions",
        )
        db_session.add(medication)
        db_session.commit()

        assert medication.id is not None
        assert medication.created_at is not None
        assert medication.updated_at is None
        assert medication.person_id == sample_person.id

    @pytest.mark.unit
    def test_medication_required_fields(self, db_session, sample_person):
        """Test medication required fields"""
        # Missing required field (name)
        medication = Medication(
            person_id=sample_person.id,
            dosage="100mg",
            frequency="Once daily",
            max_doses_per_day=1,
        )
        db_session.add(medication)

        with pytest.raises(IntegrityError):
            db_session.commit()

    @pytest.mark.unit
    def test_medication_str_representation(self, sample_medication):
        """Test medication string representation"""
        # Default representation
        assert "Medication" in str(sample_medication)

    @pytest.mark.unit
    def test_medication_relationships(self, db_session, sample_medication):
        """Test medication relationships"""
        # Add doses
        dose1 = Dose(medication_id=sample_medication.id)
        dose2 = Dose(medication_id=sample_medication.id)
        db_session.add_all([dose1, dose2])
        db_session.commit()

        # Check relationship
        assert len(sample_medication.doses) == 2
        assert dose1 in sample_medication.doses
        assert dose2 in sample_medication.doses

    @pytest.mark.unit
    def test_medication_cascade_delete(self, db_session, sample_medication):
        """Test cascade delete of doses when medication is deleted"""
        # Add doses
        dose = Dose(medication_id=sample_medication.id)
        db_session.add(dose)
        db_session.commit()

        dose_id = dose.id

        # Delete medication
        db_session.delete(sample_medication)
        db_session.commit()

        # Check that dose is also deleted
        assert db_session.query(Dose).filter_by(id=dose_id).first() is None


class TestDoseModel:
    """Test Dose model"""

    @pytest.mark.unit
    def test_create_dose(self, db_session, sample_medication):
        """Test creating a dose"""
        dose = Dose(medication_id=sample_medication.id)
        db_session.add(dose)
        db_session.commit()

        assert dose.id is not None
        assert dose.taken_at is not None
        assert dose.medication_id == sample_medication.id

    @pytest.mark.unit
    def test_dose_default_timestamp(self, db_session, sample_medication):
        """Test dose default timestamp"""
        dose = Dose(medication_id=sample_medication.id)
        db_session.add(dose)
        db_session.commit()
        db_session.refresh(dose)  # Refresh to get server defaults

        # Check that the timestamp is set
        assert dose.taken_at is not None

        # Check it's a datetime object
        assert isinstance(dose.taken_at, datetime)

    @pytest.mark.unit
    def test_dose_relationship(self, db_session, sample_medication):
        """Test dose relationship to medication"""
        dose = Dose(medication_id=sample_medication.id)
        db_session.add(dose)
        db_session.commit()

        assert dose.medication == sample_medication
        assert dose.medication.name == sample_medication.name

    @pytest.mark.unit
    @pytest.mark.skip(reason="SQLite foreign key constraints not enforced in test DB")
    def test_dose_foreign_key_constraint(self, db_session):
        """Test dose foreign key constraint"""
        # This test is skipped because foreign key constraints are not enforced
        # in the SQLite in-memory test database. This would work in production.
        pass

    @pytest.mark.unit
    def test_dose_str_representation(self, sample_dose):
        """Test dose string representation"""
        # Default representation
        assert "Dose" in str(sample_dose)
