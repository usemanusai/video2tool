"""
Main entry point for the Video2Tool application.
"""

import logging
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from api.routes import (
    router as api_router,
    auth_router,
    projects_router,
    videos_router,
    specs_router,
    tasks_router,
    export_router,
    integrations_router
)
from api.middleware import LoggingMiddleware, RateLimitMiddleware
import config

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create the FastAPI application
app = FastAPI(
    title="Video2Tool",
    description="AI-powered video analysis for software development",
    version="0.1.0",
)

# Add middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Specific origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Disposition"],  # For file downloads
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

# Include API routes
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(videos_router, prefix="/api")
app.include_router(specs_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(integrations_router, prefix="/api")

# Root route
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Render the home page."""
    return templates.TemplateResponse("index.html", {"request": request})

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

# Debug endpoint
@app.get("/api/debug")
async def debug_info(request: Request):
    """Debug endpoint to check request information."""
    routes = [
        {
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods) if route.methods else [],
        }
        for route in app.routes
    ]

    return {
        "headers": dict(request.headers),
        "method": request.method,
        "url": str(request.url),
        "path": request.url.path,
        "query_params": dict(request.query_params),
        "path_params": request.path_params,
        "client": request.client.host if request.client else None,
        "cookies": request.cookies,
        "routes": routes,
        "app_info": {
            "title": app.title,
            "version": app.version,
            "debug": config.DEBUG,
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors."""
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )
    return templates.TemplateResponse("404.html", {"request": request}, status_code=404)

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    """Handle 500 errors."""
    logger.error(f"Server error: {exc}")
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )
    return templates.TemplateResponse("500.html", {"request": request}, status_code=500)

# Run the application
if __name__ == "__main__":
    logger.info(f"Starting Video2Tool application on {config.HOST}:{config.PORT}")
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )
