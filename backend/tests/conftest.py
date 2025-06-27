from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies.database import get_db
from app.db.base import Base
from app.main import app
from app.models import Dose, Medication, Person

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the database dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a FastAPI test client with fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_person(db_session: Session) -> Person:
    """Create a sample person in the database"""
    person = Person(first_name="Test", last_name="User", is_default=True)
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)
    return person


@pytest.fixture
def sample_medication_data(sample_person: Person):
    """Sample medication data for testing"""
    return {
        "name": "Test Medication",
        "dosage": "100mg",
        "frequency": "Twice daily",
        "max_doses_per_day": 2,
        "instructions": "Take with food",
        "person_id": sample_person.id,
    }


@pytest.fixture
def sample_medication(db_session: Session, sample_medication_data) -> Medication:
    """Create a sample medication in the database"""
    medication = Medication(**sample_medication_data)
    db_session.add(medication)
    db_session.commit()
    db_session.refresh(medication)
    return medication


@pytest.fixture
def sample_dose(db_session: Session, sample_medication: Medication) -> Dose:
    """Create a sample dose for testing"""
    dose = Dose(medication_id=sample_medication.id)
    db_session.add(dose)
    db_session.commit()
    db_session.refresh(dose)
    return dose


@pytest.fixture
def multiple_medications(
    db_session: Session, sample_person: Person
) -> list[Medication]:
    """Create multiple medications for testing"""
    medications_data = [
        {
            "name": "Aspirin",
            "dosage": "100mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Take with water",
            "person_id": sample_person.id,
        },
        {
            "name": "Ibuprofen",
            "dosage": "200mg",
            "frequency": "Every 6 hours",
            "max_doses_per_day": 4,
            "instructions": "Take with food",
            "person_id": sample_person.id,
        },
        {
            "name": "Paracetamol",
            "dosage": "500mg",
            "frequency": "Every 4 hours",
            "max_doses_per_day": 6,
            "instructions": "Take as needed",
            "person_id": sample_person.id,
        },
    ]

    medications = []
    for data in medications_data:
        medication = Medication(**data)
        db_session.add(medication)
        medications.append(medication)

    db_session.commit()
    for med in medications:
        db_session.refresh(med)

    return medications


@pytest.fixture
def auth_headers():
    """Mock authentication headers (for future use)"""
    return {"Authorization": "Bearer mock-token"}
