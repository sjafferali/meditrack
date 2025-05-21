from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Dose(Base):
    __tablename__ = "doses"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(
        Integer, ForeignKey("medications.id", ondelete="SET NULL"), nullable=True
    )
    medication_name = Column(
        String, nullable=True
    )  # Store medication name for reference if medication is deleted
    taken_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    medication = relationship("Medication", back_populates="doses")
