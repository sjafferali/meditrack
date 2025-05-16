from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str
    max_doses_per_day: int = Field(gt=0, le=20)
    instructions: Optional[str] = None


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(MedicationBase):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    max_doses_per_day: Optional[int] = Field(None, gt=0, le=20)
    instructions: Optional[str] = None


class MedicationInDB(MedicationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MedicationWithDoses(MedicationInDB):
    doses_taken_today: int = 0
    last_taken_at: Optional[datetime] = None
