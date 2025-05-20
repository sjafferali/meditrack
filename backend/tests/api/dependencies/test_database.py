from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db


def test_get_db():
    """Test that get_db returns a database session and closes it properly"""
    # Get database generator
    db_generator = get_db()

    # Get the database session
    db = next(db_generator)

    # Check that we got a valid session
    assert isinstance(db, Session)

    # Test we can execute a query
    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1

    # Finish the generator to ensure db.close() is called
    try:
        next(db_generator)
    except StopIteration:
        pass
