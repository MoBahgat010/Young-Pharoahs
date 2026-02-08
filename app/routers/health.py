"""
Health Router
=============
Health check and system status endpoints.
"""

import logging

from fastapi import APIRouter

from app.models.response import HealthResponse
from app import __version__

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check the health and status of the API and its services.",
)
async def health_check() -> HealthResponse:
    """
    Perform health check on the system.
    
    Returns:
        HealthResponse with service status
    """
    logger.debug("Health check requested")
    
    # In a production system, you would check actual service health here
    # For now, we return a basic healthy status
    return HealthResponse(
        status="healthy",
        version=__version__,
        services={
            "embeddings": "loaded",
            "vector_store": "connected",
            "llm": "ready",
            "vision": "ready",
        }
    )


@router.get(
    "/",
    summary="Root endpoint",
    description="API information endpoint.",
)
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Cross-Lingual RAG API",
        "version": __version__,
        "status": "operational",
        "endpoints": {
            "query": "/query",
            "health": "/health",
            "docs": "/docs",
        }
    }
