# Create database directory if it doesn't exist
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Only create directories for sqlite file-based databases
if (
    settings.DATABASE_URL.startswith("sqlite:///")
    and ":" not in settings.DATABASE_URL[10:]
):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if db_path and os.path.dirname(db_path):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=(
        {"check_same_thread": False}
        if settings.DATABASE_URL.startswith("sqlite")
        else {}
    ),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
