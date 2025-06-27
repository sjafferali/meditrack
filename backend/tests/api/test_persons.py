from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.models import Person


class TestPersons:
    """Test person endpoints"""

    @pytest.fixture
    def sample_person_data(self):
        """Sample person data for testing"""
        return {
            "name": "John Doe",
            "date_of_birth": "1990-01-01",
            "notes": "Test notes",
        }

    @pytest.fixture
    def multiple_persons(
        self, db_session: Session, sample_person: Person
    ) -> list[Person]:
        """Create multiple persons for testing"""
        persons_data = [
            {
                "first_name": "Jane",
                "last_name": "Smith",
                "date_of_birth": date(1985, 5, 15),
                "notes": "Test person 2",
                "is_default": False,
            },
            {
                "first_name": "Bob",
                "last_name": "Johnson",
                "date_of_birth": date(1992, 10, 20),
                "notes": "Test person 3",
                "is_default": False,
            },
        ]

        persons = []
        for data in persons_data:
            person = Person(**data)
            db_session.add(person)
            persons.append(person)

        db_session.commit()
        for p in persons:
            db_session.refresh(p)

        return [sample_person] + persons

    @pytest.mark.unit
    def test_create_person_success(self, client, sample_person_data):
        """Test successful person creation"""
        # Delete existing default person (created by fixture)
        persons = client.get("/api/v1/persons/").json()
        if persons:
            for person in persons:
                client.delete(f"/api/v1/persons/{person['id']}")

        response = client.post("/api/v1/persons/", json=sample_person_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_person_data["name"]
        assert data["date_of_birth"] == sample_person_data["date_of_birth"]
        assert data["notes"] == sample_person_data["notes"]
        assert data["is_default"] is True  # First person should be default
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.unit
    def test_create_second_person_not_default(
        self, client, sample_person, sample_person_data
    ):
        """Test creating a second person isn't default"""
        new_person_data = {
            "name": "Jane Smith",
            "date_of_birth": "1985-05-15",
            "notes": "Second person",
        }
        response = client.post("/api/v1/persons/", json=new_person_data)
        assert response.status_code == 201
        data = response.json()
        assert data["is_default"] is False

    @pytest.mark.unit
    def test_create_person_validation_error(self, client):
        """Test person creation with invalid data"""
        invalid_data = {
            # Missing required 'name' field
            "date_of_birth": "1990-01-01",
            "notes": "Test notes",
        }
        response = client.post("/api/v1/persons/", json=invalid_data)
        assert response.status_code == 422

    @pytest.mark.unit
    def test_get_persons_empty(self, client):
        """Test getting persons when none exist (after deleting sample)"""
        # Delete the sample person
        persons = client.get("/api/v1/persons/").json()
        if persons:
            for person in persons:
                client.delete(f"/api/v1/persons/{person['id']}")

        response = client.get("/api/v1/persons/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.unit
    def test_get_persons_with_data(self, client, multiple_persons):
        """Test getting all persons"""
        response = client.get("/api/v1/persons/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("medication_count" in person for person in data)

    @pytest.mark.unit
    def test_get_persons_with_pagination(self, client, multiple_persons):
        """Test person pagination"""
        response = client.get("/api/v1/persons/?skip=1&limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    @pytest.mark.unit
    def test_get_person_by_id_success(self, client, sample_person):
        """Test getting a specific person"""
        response = client.get(f"/api/v1/persons/{sample_person.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_person.id
        assert data["name"] == sample_person.name
        assert "medication_count" in data

    @pytest.mark.unit
    def test_get_person_by_id_not_found(self, client):
        """Test getting non-existent person"""
        response = client.get("/api/v1/persons/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Person not found"

    @pytest.mark.unit
    def test_update_person_success(self, client, sample_person):
        """Test updating a person"""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "notes": "Updated notes",
        }
        response = client.put(f"/api/v1/persons/{sample_person.id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["notes"] == update_data["notes"]
        # Handle None case for date_of_birth
        if sample_person.date_of_birth:
            assert data["date_of_birth"] == sample_person.date_of_birth.isoformat()
        else:
            assert data["date_of_birth"] is None

    @pytest.mark.unit
    def test_update_person_not_found(self, client):
        """Test updating non-existent person"""
        update_data = {"name": "New Name"}
        response = client.put("/api/v1/persons/999", json=update_data)
        assert response.status_code == 404

    @pytest.mark.unit
    def test_delete_person_success(self, client, multiple_persons):
        """Test deleting a non-default person"""
        # Find a non-default person
        persons_response = client.get("/api/v1/persons/")
        persons = persons_response.json()
        non_default_person = next((p for p in persons if not p["is_default"]), None)
        assert non_default_person is not None

        response = client.delete(f"/api/v1/persons/{non_default_person['id']}")
        assert response.status_code == 204

        # Verify it's deleted
        get_response = client.get(f"/api/v1/persons/{non_default_person['id']}")
        assert get_response.status_code == 404

    @pytest.mark.unit
    def test_delete_default_person_fails(self, client, multiple_persons):
        """Test that deleting the default person fails"""
        # Find the default person
        persons_response = client.get("/api/v1/persons/")
        persons = persons_response.json()
        default_person = next((p for p in persons if p["is_default"]), None)
        assert default_person is not None

        response = client.delete(f"/api/v1/persons/{default_person['id']}")
        assert response.status_code == 400
        assert "Cannot delete the default person" in response.json()["detail"]

    @pytest.mark.unit
    def test_delete_last_person_fails(self, client, sample_person):
        """Test that deleting the last person fails"""
        response = client.delete(f"/api/v1/persons/{sample_person.id}")
        assert response.status_code == 400
        assert "Cannot delete the last person" in response.json()["detail"]

    @pytest.mark.unit
    def test_delete_person_not_found(self, client):
        """Test deleting non-existent person"""
        response = client.delete("/api/v1/persons/999")
        assert response.status_code == 404

    @pytest.mark.unit
    def test_set_default_person_success(self, client, multiple_persons):
        """Test setting a person as default"""
        # Find a non-default person
        persons_response = client.get("/api/v1/persons/")
        persons = persons_response.json()
        non_default_person = next((p for p in persons if not p["is_default"]), None)
        assert non_default_person is not None

        response = client.put(f"/api/v1/persons/{non_default_person['id']}/set-default")
        assert response.status_code == 200
        data = response.json()
        assert data["is_default"] is True

        # Verify the old default is no longer default
        persons_after = client.get("/api/v1/persons/").json()
        # Only one person should be default
        assert len([p for p in persons_after if p["is_default"]]) == 1
        # The new default should be our chosen person
        assert (
            next(
                (
                    p["is_default"]
                    for p in persons_after
                    if p["id"] == non_default_person["id"]
                ),
                False,
            )
            is True
        )

    @pytest.mark.unit
    def test_set_default_person_not_found(self, client):
        """Test setting non-existent person as default"""
        response = client.put("/api/v1/persons/999/set-default")
        assert response.status_code == 404

    @pytest.mark.integration
    def test_person_with_medications_count(
        self, client, sample_person, multiple_medications
    ):
        """Test person with medication count"""
        response = client.get(f"/api/v1/persons/{sample_person.id}")
        assert response.status_code == 200
        data = response.json()
        assert (
            data["medication_count"] == 3
        )  # Matches the number in multiple_medications fixture

    @pytest.mark.integration
    def test_person_lifecycle(self, client, sample_person_data):
        """Test complete person lifecycle"""
        # Create
        create_response = client.post("/api/v1/persons/", json=sample_person_data)
        assert create_response.status_code == 201
        person_id = create_response.json()["id"]

        # Read
        get_response = client.get(f"/api/v1/persons/{person_id}")
        assert get_response.status_code == 200

        # Update
        update_data = {"first_name": "Updated", "last_name": "Name"}
        update_response = client.put(f"/api/v1/persons/{person_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Updated Name"

        # Create second person so we can delete the first
        second_person_data = {
            "name": "Second Person",
            "notes": "This person allows us to delete the first",
        }
        second_response = client.post("/api/v1/persons/", json=second_person_data)
        assert second_response.status_code == 201

        # Set second person as default so we can delete the first
        default_response = client.put(
            f"/api/v1/persons/{second_response.json()['id']}/set-default"
        )
        assert default_response.status_code == 200

        # Delete
        delete_response = client.delete(f"/api/v1/persons/{person_id}")
        assert delete_response.status_code == 204

        # Verify deleted
        final_response = client.get(f"/api/v1/persons/{person_id}")
        assert final_response.status_code == 404
