import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal  # noqa: E402
from app.models import Medication  # noqa: E402


def seed_database():
    """Add sample medications to the database"""
    db = SessionLocal()

    # Check if data already exists
    existing = db.query(Medication).first()
    if existing:
        print("Database already contains data. Skipping seed.")
        db.close()
        return

    medications = [
        {
            "name": "Lisinopril",
            "dosage": "10mg",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Take with food in the morning",
        },
        {
            "name": "Ibuprofen",
            "dosage": "200mg",
            "frequency": "Every 6 hours as needed",
            "max_doses_per_day": 4,
            "instructions": "Take with food or milk",
        },
        {
            "name": "Vitamin D",
            "dosage": "1000 IU",
            "frequency": "Once daily",
            "max_doses_per_day": 1,
            "instructions": "Take with a meal",
        },
        {
            "name": "Amoxicillin",
            "dosage": "500mg",
            "frequency": "Every 8 hours",
            "max_doses_per_day": 3,
            "instructions": "Complete full course of treatment",
        },
    ]

    for med_data in medications:
        medication = Medication(**med_data)
        db.add(medication)

    db.commit()
    print(f"Added {len(medications)} medications to the database.")
    db.close()


def seed_data_if_needed():
    """Seed the database only if it's empty (for use in Docker entrypoint)"""
    try:
        seed_database()
    except Exception as e:
        print(f"Warning: Could not seed database: {e}")
        # Don't fail the startup if seeding fails


if __name__ == "__main__":
    seed_database()
