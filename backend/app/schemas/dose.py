from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DoseBase(BaseModel):
    medication_id: Optional[int] = None
    medication_name: Optional[str] = None


class DoseCreate(DoseBase):
    medication_id: int  # Still required for creation


class DoseCreateWithTimezone(BaseModel):
    timezone_offset: int  # Timezone offset in minutes


class DoseInDB(DoseBase):
    id: int
    taken_at: datetime
    medication_id: Optional[int] = None  # Now optional for orphaned doses
    medication_name: Optional[str] = None  # For displaying doses of deleted medications

    model_config = ConfigDict(from_attributes=True)
