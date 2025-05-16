from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DoseBase(BaseModel):
    medication_id: int


class DoseCreate(DoseBase):
    pass


class DoseInDB(DoseBase):
    id: int
    taken_at: datetime

    model_config = ConfigDict(from_attributes=True)
