from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    medications = relationship(
        "Medication", back_populates="person", cascade="all, delete-orphan"
    )

    @hybrid_property
    def name(self):
        """Computed property for backward compatibility"""
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name
