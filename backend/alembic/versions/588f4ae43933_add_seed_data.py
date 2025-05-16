"""add_seed_data

Revision ID: 588f4ae43933
Revises: f4162eb18a25
Create Date: 2025-05-16 13:55:48.863652

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy import table, column
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '588f4ae43933'
down_revision: Union[str, None] = 'f4162eb18a25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add sample medications as seed data"""
    # Create medications table reference
    medications_table = table('medications',
        column('name', sa.String),
        column('dosage', sa.String),
        column('frequency', sa.String),
        column('max_doses_per_day', sa.Integer),
        column('instructions', sa.String),
        column('created_at', sa.DateTime),
    )
    
    # Sample medication data
    sample_medications = [
        {
            'name': 'Lisinopril',
            'dosage': '10mg',
            'frequency': 'Once daily',
            'max_doses_per_day': 1,
            'instructions': 'Take with food in the morning',
            'created_at': datetime.now(timezone.utc)
        },
        {
            'name': 'Ibuprofen',
            'dosage': '200mg',
            'frequency': 'Every 6 hours as needed',
            'max_doses_per_day': 4,
            'instructions': 'Take with food or milk',
            'created_at': datetime.now(timezone.utc)
        },
        {
            'name': 'Vitamin D',
            'dosage': '1000 IU',
            'frequency': 'Once daily',
            'max_doses_per_day': 1,
            'instructions': 'Take with a meal',
            'created_at': datetime.now(timezone.utc)
        },
        {
            'name': 'Amoxicillin',
            'dosage': '500mg',
            'frequency': 'Every 8 hours',
            'max_doses_per_day': 3,
            'instructions': 'Complete full course of treatment',
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    # Check if data already exists (to make migration idempotent)
    conn = op.get_bind()
    existing_count = conn.execute(text("SELECT COUNT(*) FROM medications")).scalar()
    
    if existing_count == 0:
        op.bulk_insert(medications_table, sample_medications)
        print(f"Added {len(sample_medications)} sample medications")
    else:
        print(f"Skipping seed data - {existing_count} medications already exist")


def downgrade() -> None:
    """Remove seeded medications"""
    # Only remove the specific medications we added
    medication_names = ['Lisinopril', 'Ibuprofen', 'Vitamin D', 'Amoxicillin']
    
    conn = op.get_bind()
    
    # Delete the seeded medications
    for name in medication_names:
        conn.execute(
            text("DELETE FROM medications WHERE name = :name AND id NOT IN (SELECT medication_id FROM doses)"),
            {"name": name}
        )
    
    print(f"Removed seed medications (if they had no associated doses)")