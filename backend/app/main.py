"""
app/main.py
────────────
FastAPI application entry point for the PS-97 Voice Processing module.

Start the server:
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Then open:
  http://localhost:8000/docs   – Interactive Swagger UI
  http://localhost:8000/redoc  – ReDoc documentation
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.voice import router as voice_router
from app.api.skills import router as skills_router
from app.api.recommendations import router as recommendations_router
from app.api.pipeline import router as pipeline_router
from app.api.qualifications import router as qualifications_router
from app.config import get_settings
from app.db.session import init_db

settings = get_settings()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan (replaces deprecated @app.on_event)
# ─────────────────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("PS-97 Voice Processing API starting up (version=%s)", settings.app_version)
    if not settings.is_bhashini_configured():
        logger.warning(
            "BHASHINI credentials are NOT configured. "
            "Set BHASHINI_API_URL and BHASHINI_API_KEY in .env "
            "before calling the /api/voice/transcribe endpoint."
        )
    else:
        logger.info("BHASHINI credentials are configured.")

    await init_db()
    yield  # Application runs here

    # Shutdown
    logger.info("PS-97 Voice Processing API shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=settings.app_description,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS (adjust origins before deploying to production)
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to known frontend origins in production
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(voice_router)
app.include_router(skills_router)
app.include_router(recommendations_router)
app.include_router(pipeline_router)
app.include_router(qualifications_router)
app.mount("/demo", StaticFiles(directory="static", html=True), name="static")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")

# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["health"], summary="Health check")
async def health() -> dict:
    """Returns service liveness and BHASHINI configuration status."""
    return {
        "status": "ok",
        "service": settings.app_title,
        "version": settings.app_version,
        "bhashini_configured": settings.is_bhashini_configured(),
    }
