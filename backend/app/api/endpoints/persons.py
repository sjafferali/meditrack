from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.models import Medication, Person
from app.schemas import PersonCreate, PersonInDB, PersonUpdate, PersonWithStats

router = APIRouter(
    tags=["persons"],
    responses={404: {"description": "Person not found"}},
)


@router.get(
    "/",
    response_model=List[PersonWithStats],
    summary="Get all persons",
    description="Retrieve a list of all persons with their medication counts",
    response_description="List of persons with statistics",
)
def get_persons(
    skip: int = Query(0, ge=0, description="Number of persons to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of persons to return"
    ),
    db: Session = Depends(get_db),
):
    """
    Get all persons with their medication counts.

    - **skip**: Number of persons to skip (for pagination)
    - **limit**: Maximum number of persons to return
    """
    persons = db.query(Person).offset(skip).limit(limit).all()

    result = []
    for person in persons:
        medication_count = (
            db.query(Medication).filter(Medication.person_id == person.id).count()
        )
        person_dict = person.__dict__.copy()
        person_dict["medication_count"] = medication_count
        result.append(PersonWithStats(**person_dict))

    return result


@router.post(
    "/",
    response_model=PersonInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Create a person",
    description="Add a new person to track medications for",
    response_description="The created person",
)
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    """
    Create a new person with the following information:

    - **name**: Person's name (required)
    - **date_of_birth**: Date of birth (optional)
    - **notes**: Additional notes (optional)
    """
    # Check if a default person already exists
    existing_default = db.query(Person).filter(Person.is_default).first()

    # If this is the first person, make them the default
    is_default = existing_default is None

    person_data = person.model_dump(exclude={"name"})
    db_person = Person(**person_data, is_default=is_default)
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person


@router.get(
    "/{person_id}",
    response_model=PersonWithStats,
    summary="Get a person",
    description="Get details of a specific person by ID with medication count",
    response_description="The requested person with statistics",
)
def get_person(
    person_id: int = Path(..., ge=1, description="The ID of the person to retrieve"),
    db: Session = Depends(get_db),
):
    """Get a specific person by ID with medication count."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    medication_count = (
        db.query(Medication).filter(Medication.person_id == person.id).count()
    )
    person_dict = person.__dict__.copy()
    person_dict["medication_count"] = medication_count

    return PersonWithStats(**person_dict)


@router.put(
    "/{person_id}",
    response_model=PersonInDB,
    summary="Update a person",
    description="Update an existing person's information",
    response_description="The updated person",
)
def update_person(
    *,
    person_id: int = Path(..., ge=1, description="The ID of the person to update"),
    person_update: PersonUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a person's information.

    All fields are optional - only provide the fields you want to update.
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    update_data = person_update.model_dump(exclude_unset=True, exclude={"name"})
    for field, value in update_data.items():
        setattr(person, field, value)

    db.commit()
    db.refresh(person)
    return person


@router.delete(
    "/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a person",
    description="Delete a person and all their medications and dose history",
    responses={
        204: {"description": "Person deleted successfully"},
        400: {"description": "Cannot delete the default person or last person"},
        404: {"description": "Person not found"},
    },
)
def delete_person(
    person_id: int = Path(..., ge=1, description="The ID of the person to delete"),
    db: Session = Depends(get_db),
):
    """
    Delete a person.

    **Warning**: This will also delete all medications and dose history for this person.
    Cannot delete the default person if other persons exist,
    or the last person in the system.
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Check if this is the last person
    person_count = db.query(Person).count()
    if person_count == 1:
        raise HTTPException(
            status_code=400, detail="Cannot delete the last person in the system"
        )

    # Check if this is the default person and other persons exist
    if person.is_default and person_count > 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the default person. "
            "Set another person as default first.",
        )

    db.delete(person)
    db.commit()


@router.put(
    "/{person_id}/set-default",
    response_model=PersonInDB,
    summary="Set default person",
    description="Set a person as the default person",
    response_description="The updated person",
)
def set_default_person(
    person_id: int = Path(
        ..., ge=1, description="The ID of the person to set as default"
    ),
    db: Session = Depends(get_db),
):
    """
    Set a person as the default person.
    This will unset any existing default person.
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Unset any existing default
    db.query(Person).filter(Person.is_default).update({"is_default": False})

    # Set this person as default
    person.is_default = True  # type: ignore[assignment]
    db.commit()
    db.refresh(person)

    return person
