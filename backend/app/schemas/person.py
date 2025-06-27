from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field, model_validator


class PersonBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None

    @computed_field
    def name(self) -> str:
        """Computed property for backward compatibility"""
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name


class PersonCreate(BaseModel):
    # Accept either new format (first_name/last_name) or old format (name)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None
    name: Optional[str] = None

    @model_validator(mode="before")
    def validate_name_fields(cls, values):
        # Handle old format: if name is provided but not first_name
        if values.get("name") and not values.get("first_name"):
            values["first_name"] = values["name"]
            values["last_name"] = None
        # Ensure at least first_name or name is provided
        elif not values.get("first_name") and not values.get("name"):
            raise ValueError("Either first_name or name must be provided")
        return values


class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None  # For backward compatibility
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    def validate_name_fields(cls, values):
        # Handle old format: if name is provided but not first_name
        if values.get("name") and not values.get("first_name"):
            values["first_name"] = values["name"]
            # Don't clear last_name on update if only name is provided
        return values


class PersonInDB(PersonBase):
    id: int
    is_default: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PersonWithStats(PersonInDB):
    medication_count: int = 0
