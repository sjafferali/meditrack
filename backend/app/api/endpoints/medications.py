from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.api.dependencies.database import get_db
from app.models import Medication, Dose
from app.schemas import (
    MedicationCreate,
    MedicationUpdate,
    MedicationInDB,
    MedicationWithDoses,
)

router = APIRouter()


@router.get("/", response_model=List[MedicationWithDoses])
def get_medications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all medications with today's dose information"""
    # Start of today
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    medications = db.query(Medication).offset(skip).limit(limit).all()

    result = []
    for medication in medications:
        # Count doses taken today
        doses_today = (
            db.query(Dose)
            .filter(
                and_(Dose.medication_id == medication.id, Dose.taken_at >= today_start)
            )
            .all()
        )

        # Get last dose time
        last_dose = (
            db.query(Dose)
            .filter(Dose.medication_id == medication.id)
            .order_by(Dose.taken_at.desc())
            .first()
        )

        med_dict = medication.__dict__.copy()
        med_dict["doses_taken_today"] = len(doses_today)
        med_dict["last_taken_at"] = last_dose.taken_at if last_dose else None

        result.append(MedicationWithDoses(**med_dict))

    return result


@router.post("/", response_model=MedicationInDB, status_code=status.HTTP_201_CREATED)
def create_medication(medication: MedicationCreate, db: Session = Depends(get_db)):
    """Create a new medication"""
    db_medication = Medication(**medication.model_dump())
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication


@router.get("/{medication_id}", response_model=MedicationWithDoses)
def get_medication(medication_id: int, db: Session = Depends(get_db)):
    """Get a specific medication by ID"""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Get today's dose information
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    doses_today = (
        db.query(Dose)
        .filter(and_(Dose.medication_id == medication.id, Dose.taken_at >= today_start))
        .all()
    )

    last_dose = (
        db.query(Dose)
        .filter(Dose.medication_id == medication.id)
        .order_by(Dose.taken_at.desc())
        .first()
    )

    med_dict = medication.__dict__.copy()
    med_dict["doses_taken_today"] = len(doses_today)
    med_dict["last_taken_at"] = last_dose.taken_at if last_dose else None

    return MedicationWithDoses(**med_dict)


@router.put("/{medication_id}", response_model=MedicationInDB)
def update_medication(
    medication_id: int,
    medication_update: MedicationUpdate,
    db: Session = Depends(get_db),
):
    """Update a medication"""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    update_data = medication_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)

    db.commit()
    db.refresh(medication)
    return medication


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(medication_id: int, db: Session = Depends(get_db)):
    """Delete a medication"""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    db.delete(medication)
    db.commit()
