from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(
        Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    max_doses_per_day = Column(Integer, nullable=False)
    instructions = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    person = relationship("Person", back_populates="medications")
    doses = relationship(
        "Dose", back_populates="medication", cascade="all", passive_deletes=False
    )
