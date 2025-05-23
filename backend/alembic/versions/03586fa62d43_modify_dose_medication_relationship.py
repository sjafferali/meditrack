"""modify_dose_medication_relationship

Revision ID: 03586fa62d43
Revises: 35bddb769482
Create Date: 2025-05-21 11:14:12.318933

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "03586fa62d43"
down_revision: Union[str, None] = "35bddb769482"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if we're using PostgreSQL or SQLite
    conn = op.get_bind()
    dialect_name = conn.dialect.name

    if dialect_name == "postgresql":
        # PostgreSQL approach: use ALTER TABLE
        # Add the medication_name column
        op.add_column("doses", sa.Column("medication_name", sa.String(), nullable=True))

        # Allow medication_id to be nullable
        op.alter_column("doses", "medication_id", nullable=True)

        # Update foreign key constraint to SET NULL on delete
        op.drop_constraint("doses_medication_id_fkey", "doses", type_="foreignkey")
        op.create_foreign_key(
            "doses_medication_id_fkey",
            "doses",
            "medications",
            ["medication_id"],
            ["id"],
            ondelete="SET NULL",
        )

        # Populate medication_name for existing records
        conn.execute(
            sa.text(
                """
            UPDATE doses 
            SET medication_name = medications.name 
            FROM medications 
            WHERE doses.medication_id = medications.id
        """
            )
        )

    else:
        # SQLite approach: recreate table
        # Create a new temporary doses table with the desired structure
        conn.execute(
            sa.text(
                """
            CREATE TABLE new_doses (
                id INTEGER PRIMARY KEY,
                medication_id INTEGER REFERENCES medications(id) ON DELETE SET NULL,
                medication_name TEXT,
                taken_at TIMESTAMP NOT NULL
            )
            """
            )
        )

        # Copy data from the old table to the new one and populate medication_name
        conn.execute(
            sa.text(
                """
            INSERT INTO new_doses (id, medication_id, medication_name, taken_at)
            SELECT 
                doses.id, 
                doses.medication_id, 
                medications.name, 
                doses.taken_at 
            FROM doses
            LEFT JOIN medications ON doses.medication_id = medications.id
            """
            )
        )

        # Drop the old table
        conn.execute(sa.text("DROP TABLE doses"))

        # Rename the new table to the original name
        conn.execute(sa.text("ALTER TABLE new_doses RENAME TO doses"))

        # Add needed indexes
        conn.execute(sa.text("CREATE INDEX ix_doses_id ON doses (id)"))


def downgrade() -> None:
    # For SQLite, we need to use raw SQL to recreate the table, statement by statement
    conn = op.get_bind()

    # Create a new temporary doses table with the original structure
    conn.execute(
        sa.text(
            """
        CREATE TABLE new_doses (
            id INTEGER PRIMARY KEY,
            medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
            taken_at TIMESTAMP NOT NULL
        )
        """
        )
    )

    # Copy data from the current table to the new one, skipping orphaned doses
    conn.execute(
        sa.text(
            """
        INSERT INTO new_doses (id, medication_id, taken_at)
        SELECT id, medication_id, taken_at FROM doses
        WHERE medication_id IS NOT NULL
        """
        )
    )

    # Drop the current table
    conn.execute(sa.text("DROP TABLE doses"))

    # Rename the new table to the original name
    conn.execute(sa.text("ALTER TABLE new_doses RENAME TO doses"))

    # Add needed indexes
    conn.execute(sa.text("CREATE INDEX ix_doses_id ON doses (id)"))
    # ### end Alembic commands ###
