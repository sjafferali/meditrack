#!/usr/bin/env python3
"""
Database utility functions for MediTrack
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import json  # noqa: E402
from datetime import datetime, timezone  # noqa: E402

from sqlalchemy import inspect  # noqa: E402

from app.db.session import SessionLocal, engine  # noqa: E402
from app.models import Dose, Medication  # noqa: E402


def check_tables():
    """Check which tables exist in the database"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Existing tables: {tables}")
    return tables


def count_records():
    """Count records in each table"""
    db = SessionLocal()
    try:
        med_count = db.query(Medication).count()
        dose_count = db.query(Dose).count()
        print(f"Medications: {med_count}")
        print(f"Doses: {dose_count}")
        return {"medications": med_count, "doses": dose_count}
    finally:
        db.close()


def backup_database(filename=None):
    """Create a backup of the database"""
    from shutil import copyfile

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"meditrack_backup_{timestamp}.db"

    # Get database path from URL
    db_path = engine.url.database
    backup_path = Path("backups") / filename

    # Create backup directory if it doesn't exist
    backup_path.parent.mkdir(exist_ok=True)

    try:
        copyfile(db_path, backup_path)
        print(f"Database backed up to: {backup_path}")
        return str(backup_path)
    except Exception as e:
        print(f"Backup failed: {e}")
        return None


def restore_database(backup_file):
    """Restore database from backup"""
    from shutil import copyfile

    backup_path = Path("backups") / backup_file
    if not backup_path.exists():
        print(f"Backup file not found: {backup_path}")
        return False

    db_path = engine.url.database

    response = input("This will overwrite the current database. Continue? (y/N): ")
    if response.lower() != "y":
        print("Restore cancelled")
        return False

    try:
        copyfile(backup_path, db_path)
        print(f"Database restored from: {backup_path}")
        return True
    except Exception as e:
        print(f"Restore failed: {e}")
        return False


def export_data(format="json"):
    """Export all data to JSON or CSV"""
    db = SessionLocal()
    try:
        # Export medications
        medications = db.query(Medication).all()
        med_data = []
        for med in medications:
            med_dict = {
                "id": med.id,
                "name": med.name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "max_doses_per_day": med.max_doses_per_day,
                "instructions": med.instructions,
                "created_at": med.created_at.isoformat() if med.created_at else None,
                "updated_at": med.updated_at.isoformat() if med.updated_at else None,
            }
            med_data.append(med_dict)

        # Export doses
        doses = db.query(Dose).all()
        dose_data = []
        for dose in doses:
            dose_dict = {
                "id": dose.id,
                "medication_id": dose.medication_id,
                "taken_at": dose.taken_at.isoformat() if dose.taken_at else None,
            }
            dose_data.append(dose_dict)

        export_data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "medications": med_data,
            "doses": dose_data,
        }

        if format == "json":
            filename = (
                f"meditrack_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            export_path = Path("exports") / filename
            export_path.parent.mkdir(exist_ok=True)

            with open(export_path, "w") as f:
                json.dump(export_data, f, indent=2)

            print(f"Data exported to: {export_path}")
            return str(export_path)

        # Add CSV export if needed

    finally:
        db.close()


def import_data(filename):
    """Import data from JSON file"""
    import_path = Path("exports") / filename
    if not import_path.exists():
        print(f"Import file not found: {import_path}")
        return False

    try:
        with open(import_path, "r") as f:
            data = json.load(f)

        db = SessionLocal()
        try:
            # Import medications
            for med_data in data.get("medications", []):
                # Skip if already exists
                existing = (
                    db.query(Medication)
                    .filter_by(name=med_data["name"], dosage=med_data["dosage"])
                    .first()
                )

                if not existing:
                    med = Medication(
                        name=med_data["name"],
                        dosage=med_data["dosage"],
                        frequency=med_data["frequency"],
                        max_doses_per_day=med_data["max_doses_per_day"],
                        instructions=med_data.get("instructions"),
                    )
                    db.add(med)

            db.commit()
            print(f"Data imported from: {import_path}")
            return True

        except Exception as e:
            db.rollback()
            print(f"Import failed: {e}")
            return False
        finally:
            db.close()

    except Exception as e:
        print(f"Error reading import file: {e}")
        return False


def main():
    """Main utility script"""
    if len(sys.argv) < 2:
        print(
            """
Usage: python db_utils.py <command>

Commands:
    check       - Check existing tables
    count       - Count records in tables
    backup      - Create database backup
    restore <file> - Restore from backup
    export      - Export data to JSON
    import <file> - Import data from JSON
"""
        )
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "check":
        check_tables()

    elif command == "count":
        count_records()

    elif command == "backup":
        backup_database()

    elif command == "restore":
        if len(sys.argv) < 3:
            print("Error: Backup filename required")
            sys.exit(1)
        restore_database(sys.argv[2])

    elif command == "export":
        export_data()

    elif command == "import":
        if len(sys.argv) < 3:
            print("Error: Import filename required")
            sys.exit(1)
        import_data(sys.argv[2])

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
