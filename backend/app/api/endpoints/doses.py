from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.models import Dose, Medication
from app.schemas import DoseInDB

router = APIRouter(
    tags=["doses"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/medications/{medication_id}/dose",
    response_model=DoseInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Record a dose",
    description="Record taking a medication dose",
    response_description="The recorded dose",
    responses={
        201: {"description": "Dose recorded successfully"},
        400: {"description": "Maximum daily doses already taken"},
        404: {"description": "Medication not found"},
    },
)
def record_dose(
    medication_id: int = Path(..., ge=1, description="The ID of the medication"),
    db: Session = Depends(get_db),
):
    """
    Record a dose for a medication.

    This endpoint will:
    - Check if the medication exists
    - Verify the daily dose limit hasn't been reached
    - Record the dose with the current timestamp
    - Return the created dose record

    Returns error if:
    - Medication doesn't exist (404)
    - Daily dose limit already reached (400)
    """
    # Check if medication exists
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Check if max doses for today already reached
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    doses_today = (
        db.query(Dose)
        .filter(and_(Dose.medication_id == medication_id, Dose.taken_at >= today_start))
        .count()
    )

    if doses_today >= medication.max_doses_per_day:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum doses ({medication.max_doses_per_day}) taken today",
        )

    # Create new dose
    db_dose = Dose(medication_id=medication_id)
    db.add(db_dose)
    db.commit()
    db.refresh(db_dose)

    return db_dose


@router.get(
    "/medications/{medication_id}/doses",
    response_model=List[DoseInDB],
    summary="Get dose history",
    description="Retrieve the dose history for a specific medication",
    response_description="List of doses for the medication",
)
def get_doses(
    medication_id: int = Path(..., ge=1, description="The ID of the medication"),
    skip: int = Query(0, ge=0, description="Number of doses to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of doses to return"
    ),
    db: Session = Depends(get_db),
):
    """
    Get dose history for a medication.

    - **medication_id**: The ID of the medication
    - **skip**: Number of doses to skip (for pagination)
    - **limit**: Maximum number of doses to return

    Doses are returned in descending order by timestamp (newest first).
    """
    # Check if medication exists
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    doses = (
        db.query(Dose)
        .filter(Dose.medication_id == medication_id)
        .order_by(Dose.taken_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return doses


@router.get(
    "/daily-summary",
    response_model=dict,
    summary="Get daily summary",
    description="Get a summary of all medications and doses taken today",
    response_description="Summary of today's medication doses",
)
def get_daily_summary(db: Session = Depends(get_db)):
    """
    Get today's dose summary for all medications.

    Returns a summary including:
    - Today's date
    - List of all medications with:
      - Medication ID and name
      - Number of doses taken today
      - Maximum doses allowed
      - Timestamps of all doses taken today
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    medications = db.query(Medication).all()
    summary: dict = {"date": today_start.date().isoformat(), "medications": []}

    for medication in medications:
        doses_today = (
            db.query(Dose)
            .filter(
                and_(Dose.medication_id == medication.id, Dose.taken_at >= today_start)
            )
            .all()
        )

        summary["medications"].append(
            {
                "medication_id": medication.id,
                "medication_name": medication.name,
                "doses_taken": len(doses_today),
                "max_doses": medication.max_doses_per_day,
                "dose_times": [dose.taken_at.isoformat() for dose in doses_today],
            }
        )

    return summary
