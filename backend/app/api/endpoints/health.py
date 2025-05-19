from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

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
        # Check database connectivity with custom function
        db_health = db.execute(text("SELECT * FROM meditrack_health_check()")).fetchone()
        api_health = db.execute(text("SELECT * FROM api_health")).fetchone()
        
        return {
            "status": "healthy",
            "version": settings.VERSION,
            "components": [
                {
                    "component": db_health[0],
                    "status": db_health[1],
                    "details": db_health[2]
                },
                {
                    "component": api_health[0], 
                    "status": api_health[1],
                    "details": api_health[2]
                }
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )
