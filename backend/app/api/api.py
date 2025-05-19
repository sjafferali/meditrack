from fastapi import APIRouter

from app.api.endpoints import doses, medications, persons, health

api_router = APIRouter()

api_router.include_router(
    medications.router, prefix="/medications", tags=["medications"]
)

# Include doses separately with its own prefix to avoid path conflicts
api_router.include_router(doses.router, prefix="/doses", tags=["doses"])

# Include persons endpoints
api_router.include_router(persons.router, prefix="/persons", tags=["persons"])

# Include health endpoints
api_router.include_router(health.router, prefix="", tags=["health"])
