from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PersonBase(BaseModel):
    name: str
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None


class PersonInDB(PersonBase):
    id: int
    is_default: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PersonWithStats(PersonInDB):
    medication_count: int = 0
