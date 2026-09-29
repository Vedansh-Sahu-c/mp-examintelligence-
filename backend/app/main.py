"""
Main FastAPI application — wires all routers together.
Tables are created on startup via SQLAlchemy metadata.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine
from app.models import Base  # imports all models so metadata is complete
from app.routers import audit, auth, exams, sheets, quality, analytics, review

app = FastAPI(
    title="MP ExamIntelligence API",
    description=(
        "Prototype for MPOnline Idea & Innovation Hackathon 2026. "
        "AI-assisted, evidence-grounded, tamper-evident on-screen marking. "
        "Sample data (synthetic)."
    ),
    version="0.1.0",
)

# CORS — restricted to the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve masked uploaded images statically (examiner-safe — originals are NOT served)
os.makedirs("uploads/masked", exist_ok=True)
app.mount("/uploads/masked", StaticFiles(directory="uploads/masked"), name="masked")


@app.on_event("startup")
def on_startup():
    """Create all tables on startup (idempotent — safe to run multiple times)."""
    Base.metadata.create_all(bind=engine)


# Register routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(sheets.router)
app.include_router(audit.router)
app.include_router(quality.router)
app.include_router(analytics.router)
app.include_router(review.router)


@app.get("/api/health")
def health_check():
    demo_mode = os.environ.get("DEMO_CACHE_ONLY", "false").lower() == "true"
    return {"status": "ok", "demo_cache_only": demo_mode}
