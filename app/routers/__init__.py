"""Routers package initialization."""

from app.routers.query import router as query_router, ServiceContainer, set_service_container
from app.routers.health import router as health_router
from app.routers.audio import router as audio_router

__all__ = [
    "query_router",
    "health_router",
    "audio_router",
    "ServiceContainer",
    "set_service_container",
]
