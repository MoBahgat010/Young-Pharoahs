"""Routers package initialization."""

from app.routers.query import router as query_router, ServiceContainer, set_service_container
from app.routers.health import router as health_router
from app.routers.audio import router as audio_router
from app.routers.auth import router as auth_router
from app.routers.pharaohs import router as pharaohs_router

__all__ = [
    "query_router",
    "health_router",
    "audio_router",
    "auth_router",
    "pharaohs_router",
    "ServiceContainer",
    "set_service_container",
]
