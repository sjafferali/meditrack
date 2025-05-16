# MediTrack Database Migrations Guide

## Overview

MediTrack uses Alembic for database migrations. This ensures consistent schema changes across all environments.

## Quick Start

### Apply all migrations
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### Check current migration
```bash
alembic current
```

## Migration Commands

### Using Alembic directly

```bash
# Apply all pending migrations
alembic upgrade head

# Downgrade one migration
alembic downgrade -1

# Create a new migration
alembic revision -m "description_of_changes"

# Create an auto-generated migration
alembic revision --autogenerate -m "description_of_changes"

# Show migration history
alembic history

# Show current migration
alembic current
```

### Using helper scripts

We provide convenient helper scripts for common operations:

```bash
# Apply all migrations
python scripts/migrate.py up

# Downgrade one migration
python scripts/migrate.py down

# Check current migration
python scripts/migrate.py current

# Show migration history
python scripts/migrate.py history

# Create new migration
python scripts/migrate.py create "migration_name"

# Reset database (dangerous!)
python scripts/migrate.py reset
```

## Database Utilities

Additional database management utilities:

```bash
# Check existing tables
python scripts/db_utils.py check

# Count records in tables
python scripts/db_utils.py count

# Create database backup
python scripts/db_utils.py backup

# Restore from backup
python scripts/db_utils.py restore backup_filename.db

# Export data to JSON
python scripts/db_utils.py export

# Import data from JSON
python scripts/db_utils.py import export_filename.json
```

## Current Migrations

1. **f4162eb18a25** - Initial migration
   - Creates `medications` table
   - Creates `doses` table
   - Sets up foreign key relationships

2. **588f4ae43933** - Add seed data
   - Adds 4 sample medications
   - Idempotent (safe to run multiple times)
   - Can be rolled back safely

## Creating New Migrations

### Auto-generated migrations

For schema changes based on model modifications:

```bash
# 1. Modify your SQLAlchemy models
# 2. Generate migration
alembic revision --autogenerate -m "add_new_field_to_medication"

# 3. Review the generated migration file
# 4. Apply the migration
alembic upgrade head
```

### Manual migrations

For data migrations or complex schema changes:

```bash
# 1. Create empty migration
alembic revision -m "update_medication_data"

# 2. Edit the migration file
# 3. Implement upgrade() and downgrade() functions
# 4. Apply the migration
alembic upgrade head
```

## Best Practices

1. **Always test migrations locally first**
   ```bash
   # Test upgrade
   alembic upgrade head
   
   # Test downgrade
   alembic downgrade -1
   
   # Test upgrade again
   alembic upgrade head
   ```

2. **Make migrations reversible**
   - Always implement both `upgrade()` and `downgrade()`
   - Test both directions
   - Use transactions where possible

3. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to debug and rollback

4. **Name migrations descriptively**
   ```bash
   # Good
   alembic revision -m "add_reminder_time_to_medications"
   
   # Bad
   alembic revision -m "update_db"
   ```

5. **Handle existing data carefully**
   - Check for existing data before inserting
   - Provide default values for new NOT NULL columns
   - Consider data migration needs

## Troubleshooting

### Migration conflicts

If you encounter conflicts (multiple heads):

```bash
# Show current heads
alembic heads

# Merge migrations
alembic merge -m "merge_heads"
```

### Failed migrations

If a migration fails:

1. Check the error message
2. Fix the issue in the migration file
3. If partially applied, manually clean up
4. Re-run the migration

### Database locked

If database is locked:

1. Stop all applications accessing the database
2. Check for hanging processes
3. Restart the backend if necessary

## Docker Deployment

When using Docker, migrations are handled differently:

### Development
```bash
docker compose exec backend alembic upgrade head
```

### Production
Include in your deployment script:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Dockerfile
Migrations can be run on container startup:
```dockerfile
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Examples

### Adding a new field

1. Update the model:
```python
# app/models/medication.py
class Medication(Base):
    # ... existing fields ...
    reminder_time = Column(Time, nullable=True)
```

2. Generate migration:
```bash
alembic revision --autogenerate -m "add_reminder_time_to_medications"
```

3. Review and apply:
```bash
alembic upgrade head
```

### Data migration example

```python
"""add_default_categories

Revision ID: abc123
Revises: def456
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create categories table
    categories_table = op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
    )
    
    # Insert default categories
    op.bulk_insert(categories_table, [
        {'name': 'Prescription'},
        {'name': 'Over-the-Counter'},
        {'name': 'Supplement'},
    ])

def downgrade():
    op.drop_table('categories')
```

## Backup and Recovery

Before major migrations:

```bash
# Create backup
python scripts/db_utils.py backup

# Run migration
alembic upgrade head

# If something goes wrong, restore
python scripts/db_utils.py restore meditrack_backup_20240115_100000.db
```

## Environment Variables

Set these for different environments:

```bash
# Development (default)
export DATABASE_URL=sqlite:///./data/meditrack.db

# Production (example with PostgreSQL)
export DATABASE_URL=postgresql://user:pass@host/dbname
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run migrations
  run: |
    cd backend
    source venv/bin/activate
    alembic upgrade head

# Or with Docker
- name: Run migrations
  run: |
    docker compose exec -T backend alembic upgrade head
```