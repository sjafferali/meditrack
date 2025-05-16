from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.models import Dose, Medication
from app.schemas import DoseInDB

router = APIRouter()


@router.post(
    "/medications/{medication_id}/dose",
    response_model=DoseInDB,
    status_code=status.HTTP_201_CREATED,
)
def record_dose(medication_id: int, db: Session = Depends(get_db)):
    """Record a dose for a medication"""
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


@router.get("/medications/{medication_id}/doses", response_model=List[DoseInDB])
def get_doses(
    medication_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """Get dose history for a medication"""
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


@router.get("/daily-summary", response_model=dict)
def get_daily_summary(db: Session = Depends(get_db)):
    """Get today's dose summary for all medications"""
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
