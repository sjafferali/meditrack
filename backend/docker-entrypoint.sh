#!/bin/bash
set -e

echo "Starting MediTrack Backend..."

# Function to wait for database to be ready
wait_for_db() {
    echo "Waiting for database to be ready..."
    
    # Try to connect to the database using Python
    python -c "
import sys
import time
from sqlalchemy import create_engine
from app.core.config import settings

max_attempts = 30
attempt = 0

while attempt < max_attempts:
    try:
        engine = create_engine(settings.DATABASE_URL)
        connection = engine.connect()
        connection.close()
        print('Database is ready!')
        break
    except Exception as e:
        attempt += 1
        print(f'Database not ready (attempt {attempt}/{max_attempts}): {e}')
        if attempt >= max_attempts:
            print('Failed to connect to database after maximum attempts')
            sys.exit(1)
        time.sleep(2)
"
}

# Function to run database migrations
run_migrations() {
    echo "Running database migrations..."
    
    # Check if alembic_version table exists
    echo "Checking migration infrastructure..."
    
    python -c "
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # Check if alembic_version table exists
        result = conn.execute(text(\"\"\"
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alembic_version'
            );
        \"\"\"))
        has_alembic_table = result.scalar()
        
        if not has_alembic_table:
            print('Migration tracking table missing - will initialize')
            sys.exit(1)
        else:
            print('Migration tracking table exists')
            sys.exit(0)
except Exception as e:
    print(f'Error checking migration status: {e}')
    sys.exit(2)
"
    
    migration_check_result=$?
    
    if [ $migration_check_result -eq 1 ]; then
        echo "Setting up migration tracking for existing database..."
        
        # Check if we have existing tables (indicating a pre-Alembic database)
        python -c "
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # Check if main tables exist
        result = conn.execute(text(\"\"\"
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name IN ('medications', 'doses', 'persons')
            );
        \"\"\"))
        has_tables = result.scalar()
        
        if has_tables:
            print('Existing tables found - will stamp current revision')
            sys.exit(0)
        else:
            print('No existing tables - fresh database')
            sys.exit(1)
except Exception as e:
    print(f'Error checking existing tables: {e}')
    sys.exit(2)
"
        
        tables_check_result=$?
        
        if [ $tables_check_result -eq 0 ]; then
            echo "Stamping existing database with current migration state..."
            # Mark the database as up-to-date with the latest migration
            alembic stamp head
        else
            echo "Fresh database detected - will run all migrations"
        fi
    elif [ $migration_check_result -eq 2 ]; then
        echo "Error checking migration status - proceeding with caution..."
    fi
    
    # Check current migration status
    echo "Current migration status:"
    alembic current || echo "No migrations applied yet"
    
    # Run migrations
    echo "Applying migrations..."
    alembic upgrade head
    
    echo "Migrations completed successfully!"
}

# Function to seed initial data if needed
seed_initial_data() {
    echo "Checking if initial data seeding is needed..."
    
    # Run the seed script if it exists and database is empty
    if [ -f "scripts/seed_data.py" ]; then
        python -c "
from scripts.seed_data import seed_data_if_needed
seed_data_if_needed()
"
        echo "Initial data seeding completed (if needed)"
    else
        echo "No seed script found, skipping initial data seeding"
    fi
}

# Main execution
echo "=== MediTrack Backend Initialization ==="

# Wait for database to be available
wait_for_db

# Run database migrations
run_migrations

# Seed initial data if needed
seed_initial_data

echo "=== Initialization Complete ==="
echo "Starting application server..."

# Start the application with all provided arguments
exec "$@"