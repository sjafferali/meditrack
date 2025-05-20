from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import settings

router = APIRouter(
    tags=["health"],
    responses={500: {"description": "Internal server error"}},
)


@router.get(
    "/health",
    summary="Health Check",
    description="Check if the API and database are healthy and responding",
)
def health_check(db: Session = Depends(get_db)):
    """
    Performs a health check on the API and database.

    Returns:
        dict: Status and health information
    """
    try:
        # Check database connectivity with basic query
        db.execute(text("SELECT 1")).first()

        # Use a database-agnostic way to get timestamp
        from datetime import datetime

        timestamp = datetime.now().isoformat()

        return {
            "status": "healthy",
            "version": settings.VERSION,
            "components": [
                {"component": "database", "status": "healthy", "details": {}},
                {
                    "component": "api",
                    "status": "healthy",
                    "details": {
                        "timestamp": timestamp,
                        "environment": settings.ENVIRONMENT,
                    },
                },
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
