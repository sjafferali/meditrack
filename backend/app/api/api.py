from fastapi import APIRouter

from app.api.endpoints import medications, doses

api_router = APIRouter()

api_router.include_router(
    medications.router,
    prefix="/medications",
    tags=["medications"]
)

# Include doses separately with its own prefix to avoid path conflicts
api_router.include_router(
    doses.router,
    prefix="/doses",
    tags=["doses"]
)