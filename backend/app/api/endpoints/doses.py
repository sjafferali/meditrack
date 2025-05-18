from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import settings
from app.models import Dose, Medication
from app.schemas import DoseCreateWithTimezone, DoseInDB

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
    body: Optional[DoseCreateWithTimezone] = None,
    db: Session = Depends(get_db),
):
    """
    Record a dose for a medication.

    This endpoint will:
    - Check if the medication exists
    - Verify the daily dose limit hasn't been reached
    - Record the dose with the current timestamp
    - If timezone_offset is provided, adjust the timestamp to reflect user's local time
    - Return the created dose record

    Returns error if:
    - Medication doesn't exist (404)
    - Daily dose limit already reached (400)
    """
    # Check if medication exists
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Determine the current timestamp based on timezone offset
    if body and hasattr(body, "timezone_offset"):
        # Convert timezone offset from minutes to timedelta
        # Negative because JS returns offset in opposite direction
        tz_offset = timedelta(minutes=-body.timezone_offset)
        current_tz = timezone(tz_offset)
        now = datetime.now(current_tz)
    elif settings.TIMEZONE_OFFSET != 0:
        # Use environment variable timezone if set
        tz_offset = timedelta(minutes=-settings.TIMEZONE_OFFSET)
        current_tz = timezone(tz_offset)
        now = datetime.now(current_tz)
    else:
        now = datetime.now(timezone.utc)

    # Check if max doses for today already reached (in the user's timezone)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

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

    # Create new dose with timezone-aware timestamp
    db_dose = Dose(medication_id=medication_id, taken_at=now)
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
def get_daily_summary(
    timezone_offset: Optional[int] = Query(
        None, description="Timezone offset in minutes"
    ),
    db: Session = Depends(get_db),
):
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
    # Use timezone offset if provided
    if timezone_offset is not None:
        tz_offset = timedelta(minutes=-timezone_offset)
        current_tz = timezone(tz_offset)
        now = datetime.now(current_tz)
    elif settings.TIMEZONE_OFFSET != 0:
        # Use environment variable timezone if set
        tz_offset = timedelta(minutes=-settings.TIMEZONE_OFFSET)
        current_tz = timezone(tz_offset)
        now = datetime.now(current_tz)
    else:
        now = datetime.now(timezone.utc)

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

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


@router.get(
    "/daily-summary/{date}",
    response_model=dict,
    summary="Get summary for specific date",
    description="Get a summary of all medications and doses taken on a specific date",
    response_description="Summary of medication doses for the specified date",
)
def get_daily_summary_by_date(
    date: date = Path(..., description="The date to get summary for (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    Get dose summary for all medications on a specific date.

    Returns a summary including:
    - The specified date
    - List of all medications with:
      - Medication ID and name
      - Number of doses taken on that date
      - Maximum doses allowed
      - Timestamps of all doses taken on that date
    """
    start_of_day = datetime.combine(date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    end_of_day = datetime.combine(date, datetime.max.time()).replace(
        tzinfo=timezone.utc
    )

    medications = db.query(Medication).all()
    summary: dict = {"date": date.isoformat(), "medications": []}

    for medication in medications:
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

        summary["medications"].append(
            {
                "medication_id": medication.id,
                "medication_name": medication.name,
                "doses_taken": len(doses_on_date),
                "max_doses": medication.max_doses_per_day,
                "dose_times": [dose.taken_at.isoformat() for dose in doses_on_date],
            }
        )

    return summary


@router.get(
    "/medications/{medication_id}/doses/{date}",
    response_model=List[DoseInDB],
    summary="Get doses for specific date",
    description="Retrieve doses for a specific medication on a specific date",
    response_description="List of doses for the medication on the specified date",
)
def get_doses_by_date(
    medication_id: int = Path(..., ge=1, description="The ID of the medication"),
    date: date = Path(..., description="The date to get doses for (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    Get dose history for a medication on a specific date.

    - **medication_id**: The ID of the medication
    - **date**: The date to get doses for (YYYY-MM-DD format)
    """
    # Check if medication exists
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Create date range for the specified date
    start_of_day = datetime.combine(date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    end_of_day = datetime.combine(date, datetime.max.time()).replace(
        tzinfo=timezone.utc
    )

    doses = (
        db.query(Dose)
        .filter(
            and_(
                Dose.medication_id == medication_id,
                Dose.taken_at >= start_of_day,
                Dose.taken_at <= end_of_day,
            )
        )
        .order_by(Dose.taken_at.asc())
        .all()
    )

    return doses


@router.post(
    "/medications/{medication_id}/dose/{date}",
    response_model=DoseInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Record a dose for specific date",
    description="Record taking a medication dose on a specific date and time",
    response_description="The recorded dose",
    responses={
        201: {"description": "Dose recorded successfully"},
        400: {"description": "Maximum daily doses already taken or invalid date"},
        404: {"description": "Medication not found"},
    },
)
def record_dose_for_date(
    medication_id: int = Path(..., ge=1, description="The ID of the medication"),
    date: date = Path(..., description="The date to record dose for (YYYY-MM-DD)"),
    time: str = Query(..., description="Time in HH:MM format"),
    db: Session = Depends(get_db),
):
    """
    Record a dose for a medication on a specific date and time.

    This endpoint will:
    - Check if the medication exists
    - Verify the date is not in the future
    - Verify the daily dose limit hasn't been reached for that date
    - Record the dose with the specified timestamp

    - **medication_id**: The ID of the medication
    - **date**: The date to record dose for (YYYY-MM-DD format)
    - **time**: Time in HH:MM format
    """
    # Check if medication exists
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Check if date is not in the future
    if date > datetime.now(timezone.utc).date():
        raise HTTPException(
            status_code=400, detail="Cannot record doses for future dates"
        )

    # Parse time and create timestamp
    try:
        hour, minute = map(int, time.split(":"))
        dose_datetime = datetime.combine(
            date,
            datetime.min.time().replace(hour=hour, minute=minute, tzinfo=timezone.utc),
        )
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    # Check if max doses for that date already reached
    start_of_day = datetime.combine(date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    end_of_day = datetime.combine(date, datetime.max.time()).replace(
        tzinfo=timezone.utc
    )

    doses_on_date = (
        db.query(Dose)
        .filter(
            and_(
                Dose.medication_id == medication_id,
                Dose.taken_at >= start_of_day,
                Dose.taken_at <= end_of_day,
            )
        )
        .count()
    )

    if doses_on_date >= medication.max_doses_per_day:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum doses ({medication.max_doses_per_day}) taken for {date}",
        )

    # Create new dose
    db_dose = Dose(medication_id=medication_id, taken_at=dose_datetime)
    db.add(db_dose)
    db.commit()
    db.refresh(db_dose)

    return db_dose
