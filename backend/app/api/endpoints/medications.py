from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.models import Dose, Medication
from app.schemas import (
    MedicationCreate,
    MedicationInDB,
    MedicationUpdate,
    MedicationWithDoses,
)

router = APIRouter(
    tags=["medications"],
    responses={404: {"description": "Medication not found"}},
)


@router.get(
    "/",
    response_model=List[MedicationWithDoses],
    summary="Get all medications",
    description="Retrieve a list of all medications with their dose information for today or a specific date",
    response_description="List of medications with dose count and last taken time for the specified date",
)
def get_medications(
    skip: int = Query(0, ge=0, description="Number of medications to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of medications to return"
    ),
    date: Optional[date] = Query(
        None, description="The date to get dose information for (YYYY-MM-DD)"
    ),
    db: Session = Depends(get_db),
):
    """
    Get all medications with dose information for today or a specific date.

    - **skip**: Number of medications to skip (for pagination)
    - **limit**: Maximum number of medications to return
    - **date**: Optional date to get dose information for (defaults to today)
    """
    # Determine the date to query for
    if date is None:
        query_date = datetime.now(timezone.utc).date()
    else:
        query_date = date

    # Create date range for the query
    start_of_day = datetime.combine(query_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    end_of_day = datetime.combine(query_date, datetime.max.time()).replace(
        tzinfo=timezone.utc
    )

    medications = db.query(Medication).offset(skip).limit(limit).all()

    result = []
    for medication in medications:
        # Count doses taken on the specified date
        doses_on_date = (
            db.query(Dose)
            .filter(
                and_(
                    Dose.medication_id == medication.id,
                    Dose.taken_at >= start_of_day,
                    Dose.taken_at <= end_of_day,
                )
            )
            .all()
        )

        # Get last dose time for the specified date
        last_dose = (
            db.query(Dose)
            .filter(
                and_(
                    Dose.medication_id == medication.id,
                    Dose.taken_at >= start_of_day,
                    Dose.taken_at <= end_of_day,
                )
            )
            .order_by(Dose.taken_at.desc())
            .first()
        )

        med_dict = medication.__dict__.copy()
        med_dict["doses_taken_today"] = len(doses_on_date)
        med_dict["last_taken_at"] = last_dose.taken_at if last_dose else None

        result.append(MedicationWithDoses(**med_dict))

    return result


@router.post(
    "/",
    response_model=MedicationInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Create a medication",
    description="Add a new medication to track",
    response_description="The created medication",
)
def create_medication(medication: MedicationCreate, db: Session = Depends(get_db)):
    """
    Create a new medication with the following information:

    - **name**: Medication name (required)
    - **dosage**: Dosage amount and unit (required)
    - **frequency**: How often to take the medication (required)
    - **max_doses_per_day**: Maximum doses allowed per day (1-20)
    - **instructions**: Special instructions (optional)
    """
    db_medication = Medication(**medication.model_dump())
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication


@router.get(
    "/{medication_id}",
    response_model=MedicationWithDoses,
    summary="Get a medication",
    description="Get details of a specific medication by ID with dose information for today or a specific date",
    response_description="The requested medication with dose information",
)
def get_medication(
    medication_id: int = Path(
        ..., ge=1, description="The ID of the medication to retrieve"
    ),
    date: Optional[date] = Query(
        None, description="The date to get dose information for (YYYY-MM-DD)"
    ),
    db: Session = Depends(get_db),
):
    """Get a specific medication by ID with dose information for today or a specific date."""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Determine the date to query for
    if date is None:
        query_date = datetime.now(timezone.utc).date()
    else:
        query_date = date

    # Create date range for the query
    start_of_day = datetime.combine(query_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    end_of_day = datetime.combine(query_date, datetime.max.time()).replace(
        tzinfo=timezone.utc
    )

    doses_on_date = (
        db.query(Dose)
        .filter(
            and_(
                Dose.medication_id == medication.id,
                Dose.taken_at >= start_of_day,
                Dose.taken_at <= end_of_day,
            )
        )
        .all()
    )

    last_dose = (
        db.query(Dose)
        .filter(
            and_(
                Dose.medication_id == medication.id,
                Dose.taken_at >= start_of_day,
                Dose.taken_at <= end_of_day,
            )
        )
        .order_by(Dose.taken_at.desc())
        .first()
    )

    med_dict = medication.__dict__.copy()
    med_dict["doses_taken_today"] = len(doses_on_date)
    med_dict["last_taken_at"] = last_dose.taken_at if last_dose else None

    return MedicationWithDoses(**med_dict)


@router.put(
    "/{medication_id}",
    response_model=MedicationInDB,
    summary="Update a medication",
    description="Update an existing medication's information",
    response_description="The updated medication",
)
def update_medication(
    *,
    medication_id: int = Path(
        ..., ge=1, description="The ID of the medication to update"
    ),
    medication_update: MedicationUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a medication's information.

    All fields are optional - only provide the fields you want to update.
    """
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    update_data = medication_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)

    db.commit()
    db.refresh(medication)
    return medication


@router.delete(
    "/{medication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a medication",
    description="Delete a medication and all its dose history",
    responses={
        204: {"description": "Medication deleted successfully"},
        404: {"description": "Medication not found"},
    },
)
def delete_medication(
    medication_id: int = Path(
        ..., ge=1, description="The ID of the medication to delete"
    ),
    db: Session = Depends(get_db),
):
    """
    Delete a medication.

    **Warning**: This will also delete all dose history for this medication.
    """
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    db.delete(medication)
    db.commit()
