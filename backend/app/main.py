from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
        "description": "Operations with medication doses. Track when medications "
        "are taken.",
    },
    {
        "name": "health",
        "description": "Health check and status endpoints.",
    },
    {
        "name": "root",
        "description": "Root endpoints with general information.",
    },
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


# Health check endpoint
@app.get(
    "/health",
    tags=["health"],
    summary="Health Check",
    description="Check if the API is healthy and responding",
)
def health_check():
    """
    Performs a health check on the API.

    Returns:
        dict: Status and version information
    """
    return {"status": "healthy", "version": settings.VERSION}


# Include API router
app.include_router(api_router, prefix="/api/v1")

# Serve React frontend - must be mounted after API routes
if static_path.exists():
    # Check both possible paths for static files
    # (copied directly or through symlinks)
    static_static_path = static_path / "static"

    # Mount static directories if they exist
    # First check for direct static/css, static/js paths
    js_path = static_path / "js"
    css_path = static_path / "css"
    media_path = static_path / "media"
    assets_path = static_path / "assets"

    # If those don't exist, check for static/static/js structure
    if not js_path.exists() and static_static_path.exists():
        static_js_path = static_static_path / "js"
        if static_js_path.exists():
            app.mount(
                "/static/js",
                StaticFiles(directory=str(static_js_path)),
                name="static_js_files",
            )
    elif js_path.exists():
        app.mount("/js", StaticFiles(directory=str(js_path)), name="js_files")

    # Handle CSS
    if not css_path.exists() and static_static_path.exists():
        static_css_path = static_static_path / "css"
        if static_css_path.exists():
            app.mount(
                "/static/css",
                StaticFiles(directory=str(static_css_path)),
                name="static_css_files",
            )
    elif css_path.exists():
        app.mount("/css", StaticFiles(directory=str(css_path)), name="css_files")

    # Handle media files
    if not media_path.exists() and static_static_path.exists():
        static_media_path = static_static_path / "media"
        if static_media_path.exists():
            app.mount(
                "/static/media",
                StaticFiles(directory=str(static_media_path)),
                name="static_media_files",
            )
    elif media_path.exists():
        app.mount("/media", StaticFiles(directory=str(media_path)), name="media_files")

    # Handle assets
    if assets_path.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(assets_path)), name="static_assets"
        )

    # Mount the root static directory (for asset-manifest.json, etc)
    if static_static_path.exists():
        app.mount(
            "/static",
            StaticFiles(directory=str(static_static_path)),
            name="static_files",
        )

    # Mount frontend app as a catch-all route (must be last)
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="spa")


# Root endpoint - removed as static files will be served at /


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
