from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Create database tables
Base.metadata.create_all(bind=engine)

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


# Health check endpoint
@app.get("/health", tags=["health"], summary="Health Check", description="Check if the API is healthy and responding")
def health_check():
    """
    Performs a health check on the API.
    
    Returns:
        dict: Status and version information
    """
    return {"status": "healthy", "version": settings.VERSION}


# Root endpoint
@app.get("/", tags=["root"], summary="Welcome", description="Root endpoint with API information")
def root():
    """
    Welcome endpoint that provides basic API information.
    
    Returns:
        dict: Welcome message and API documentation links
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)