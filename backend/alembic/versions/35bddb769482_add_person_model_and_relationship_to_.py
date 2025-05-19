"""Add person model and relationship to medications

Revision ID: 35bddb769482
Revises: 588f4ae43933
Create Date: 2025-05-19 12:13:19.411459

"""

from datetime import datetime
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.sql import column, table

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "35bddb769482"
down_revision: Union[str, None] = "588f4ae43933"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the persons table (check if it exists first)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "persons" not in inspector.get_table_names():
        op.create_table(
            "persons",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("date_of_birth", sa.Date(), nullable=True),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("is_default", sa.Boolean(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_persons_id"), "persons", ["id"], unique=False)

    # Check if default person already exists
    persons_table = table(
        "persons",
        column("id", sa.Integer),
        column("name", sa.String),
        column("is_default", sa.Boolean),
        column("created_at", sa.DateTime),
    )

    # Check for existing default person
    result = conn.execute(
        sa.select(persons_table.c.id).where(persons_table.c.is_default == True)
    )
    existing_default = result.first()

    if existing_default:
        default_person_id = existing_default[0]
    else:
        # Insert a default person if none exists
        conn.execute(
            persons_table.insert().values(
                id=1,  # Explicitly set the ID for SQLite
                name="Default User",
                is_default=True,
                created_at=datetime.utcnow(),
            )
        )
        default_person_id = 1

    # Check if person_id column already exists
    columns = [col["name"] for col in inspector.get_columns("medications")]
    if "person_id" not in columns:
        # Add person_id column to medications table directly as non-nullable with default
        # In SQLite, we can't alter columns, so we add it with a default that we'll use
        op.add_column(
            "medications",
            sa.Column(
                "person_id",
                sa.Integer(),
                nullable=False,
                server_default=str(default_person_id),
            ),
        )

        # Note: SQLite doesn't support adding foreign keys via ALTER TABLE
        # The foreign key constraint will be enforced at the application level


def downgrade() -> None:
    # Note: SQLite doesn't support dropping columns directly
    # In a production environment, you'd need to use batch mode
    # For development, we'll just document this limitation
    # op.drop_column('medications', 'person_id')

    # Drop the persons table
    op.drop_index(op.f("ix_persons_id"), table_name="persons")
    op.drop_table("persons")
