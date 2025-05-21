#!/usr/bin/env python3
"""
Script to stamp an existing database with the current migration state.
Use this when you have an existing database that was created before Alembic migrations.
"""

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings  # noqa: E402


def check_tables_exist():
    """Check if the main application tables exist"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if main tables exist
        result = conn.execute(
            text(
                """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name IN ('medications', 'doses', 'persons', 'alembic_version')
            AND table_schema = 'public'
        """
            )
        )

        existing_tables = [row[0] for row in result]
        return existing_tables


def stamp_database():
    """Stamp the database with the current migration head"""
    print("Stamping database with current migration state...")

    try:
        # Run alembic stamp head
        result = subprocess.run(
            ["alembic", "stamp", "head"], capture_output=True, text=True, check=True
        )

        print("✅ Database successfully stamped with current migration state")
        print(result.stdout)

        # Show current status
        result = subprocess.run(
            ["alembic", "current"], capture_output=True, text=True, check=True
        )

        print("Current migration status:")
        print(result.stdout)

    except subprocess.CalledProcessError as e:
        print(f"❌ Error stamping database: {e}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False

    return True


def main():
    print("=== Database Migration Stamp Tool ===")
    print(f"Database URL: {settings.DATABASE_URL}")

    try:
        existing_tables = check_tables_exist()
        print(f"Existing tables: {existing_tables}")

        if "alembic_version" in existing_tables:
            print("✅ Migration tracking table already exists")

            # Check current migration status
            result = subprocess.run(
                ["alembic", "current"], capture_output=True, text=True
            )

            if result.returncode == 0:
                print("Current migration status:")
                print(result.stdout)
            else:
                print("⚠️  No current migration found")

        elif any(
            table in existing_tables 
            for table in ["medications", "doses", "persons"]
        ):
            print("📋 Found existing application tables without migration tracking")
            print("This indicates a pre-Alembic database that needs to be stamped")

            if stamp_database():
                print("✅ Database successfully prepared for future migrations")
            else:
                print("❌ Failed to stamp database")
                sys.exit(1)

        else:
            print("📝 Empty database detected - no stamping needed")
            print("Run 'alembic upgrade head' to create tables with migrations")

    except Exception as e:
        print(f"❌ Error checking database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
