from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Create database tables
Base.metadata.create_all(bind=engine)

# Serve React frontend first (before FastAPI app creation)
static_path = Path(__file__).parent / "static"

# API metadata
tags_metadata = [
    {
        "name": "medications",
        "description": "Operations with medications. Manage your medication list.",
    },
    {
        "name": "doses", 
        "description": "Operations with medication doses. Track when medications are taken.",
    },
    {
        "name": "health",
        "description": "Health check and status endpoints.",
    },
    {
        "name": "root",
        "description": "Root endpoints with general information.",
    }
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "MediTrack Support",
        "url": "https://github.com/sjafferali/meditrack",
        "email": "support@meditrack.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Serve React frontend - must be mounted after API routes
if static_path.exists():
    # Mount static assets
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static_files")
    # Mount frontend app as a catch-all route (must be last)
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="spa")


# Health check endpoint
@app.get("/health", tags=["health"], summary="Health Check", description="Check if the API is healthy and responding")
def health_check():
    """
    Performs a health check on the API.
    
    Returns:
        dict: Status and version information
    """
    return {"status": "healthy", "version": settings.VERSION}


# Root endpoint - removed as static files will be served at /


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)