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