# Docker Auto-Migration Feature

This document describes the automatic database migration feature added to the MediTrack Docker container.

## Overview

The Docker container now automatically runs database migrations when it starts up, ensuring your database schema is always up-to-date with the latest application code.

## How It Works

1. **Container Startup**: When the Docker container starts, it runs the `docker-entrypoint.sh` script
2. **Database Connection**: Waits for the database to be available (up to 30 attempts with 2-second intervals)
3. **Migration Check**: Checks the current migration status using `alembic current`
4. **Migration Execution**: Runs `alembic upgrade head` to apply any pending migrations
5. **Initial Data Seeding**: Optionally seeds initial data if the database is empty
6. **Application Start**: Starts the FastAPI application server

## Benefits

- **Zero-downtime updates**: No need to manually run migrations during deployments
- **Automatic schema synchronization**: Database schema is always in sync with application code
- **Robust startup**: Handles database connection failures gracefully
- **Safe operations**: Only runs migrations that haven't been applied yet

## Configuration

The auto-migration feature works with any database supported by Alembic:
- SQLite (default for development)
- PostgreSQL (recommended for production)
- MySQL/MariaDB

## Deployment Process

1. **Build new image**: `docker build -t meditrack:latest .`
2. **Stop current container**: `docker stop meditrack`
3. **Start new container**: The new container will automatically run migrations
4. **Verify startup**: Check logs to confirm migrations ran successfully

## Logs and Monitoring

The entrypoint script provides detailed logging:

```
=== MediTrack Backend Initialization ===
Waiting for database to be ready...
Database is ready!
Running database migrations...
Current migration status:
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 35bddb769482 -> 03586fa62d43, modify_dose_medication_relationship
Applying migrations...
Migrations completed successfully!
Checking if initial data seeding is needed...
Initial data seeding completed (if needed)
=== Initialization Complete ===
Starting application server...
```

## Error Handling

- **Database Connection Failures**: Retries up to 30 times with 2-second intervals
- **Migration Failures**: Container will exit with error code if migrations fail
- **Seeding Failures**: Warns but doesn't fail container startup
- **Existing Database**: Automatically detects and stamps pre-Alembic databases

## Fixing Existing Database Issues

If you see errors like `relation "medications" already exists`, this means your database was created before Alembic migration tracking was set up. The entrypoint script now handles this automatically, but you can also fix it manually:

### Option 1: Let Docker Handle It (Recommended)
The updated entrypoint script automatically detects this situation and stamps your database appropriately.

### Option 2: Manual Fix
If you need to fix this manually:

```bash
# Connect to your backend container or environment
docker exec -it <container_name> bash

# Run the stamp script
python scripts/stamp_existing_db.py

# Or manually stamp with Alembic
alembic stamp head
```

### Option 3: Fresh Start (Development Only)
For development environments, you can reset everything:

```bash
# Stop container and remove database
docker-compose down -v

# Start fresh - migrations will run cleanly
docker-compose up
```

## Manual Migration Override

If you need to skip auto-migrations, you can override the entrypoint:

```bash
docker run -it --entrypoint /bin/bash meditrack:latest
# Then manually run: alembic upgrade head
```

## Rollback Procedure

If you need to rollback migrations:

```bash
# Connect to running container
docker exec -it meditrack bash

# Rollback to specific revision
alembic downgrade <revision_id>

# Or rollback one step
alembic downgrade -1
```

## Files Modified

- `Dockerfile`: Added entrypoint script execution
- `backend/docker-entrypoint.sh`: New entrypoint script (executable)
- `backend/scripts/seed_data.py`: Added conditional seeding function

## Testing

Test the auto-migration feature:

```bash
# Build the image
docker build -t meditrack:test .

# Run with clean database
docker run --rm -p 8000:8000 -e DATABASE_URL=sqlite:///./test.db meditrack:test

# Check logs for migration messages
docker logs <container_id>
```

This ensures your production deployments are always seamless and your database schema stays in sync with your application code.