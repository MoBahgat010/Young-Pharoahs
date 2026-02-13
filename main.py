"""
Cross-Lingual RAG FastAPI Server (Refactored)
==============================================
Modern, modular architecture with dependency injection and service layers.

Endpoints:
  POST /query   — text + optional images → Gemini vision → BGE-M3 → Pinecone → Gemini LLM → answer
  GET  /health  — service health check
  GET  /        — API information
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services import (
    EmbeddingService,
    VisionService,
    VectorStoreService,
    LLMService,
    STTService,
    TTSService,
    RerankerService,
    DatabaseService,
    AuthService,
    PlacesService,
    UberService,
    ConversationService,
    CloudinaryService,
    ImageGenerationService,
)
from app.routers import (
    query_router,
    health_router,
    audio_router,
    auth_router,
    pharaohs_router,
    conversations_router,
    ServiceContainer,
    set_service_container,
)
from app import __version__

# ── Configure Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


# ── Application Lifespan ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes all services on startup and cleans up on shutdown.
    """
    logger.info("=" * 60)
    logger.info("Starting Cross-Lingual RAG API v%s", __version__)
    logger.info("=" * 60)
    
    try:
        # Initialize services
        logger.info("Initializing services...")
        
        # 1. Embedding Service
        embedding_service = EmbeddingService(settings)
        embedding_service.load_model()
        
        # 2. Vector Store Service
        vector_store_service = VectorStoreService(settings, embedding_service)
        vector_store_service.initialize()
        
        # 3. Vision Service
        vision_service = VisionService(settings)
        vision_service.initialize()
        
        # 4. LLM Service
        llm_service = LLMService(settings)
        llm_service.initialize()

        # 5. STT Service
        stt_service = STTService(settings)

        # 6. TTS Service
        tts_service = TTSService(settings)

        # 7. Reranker Service
        reranker_service = RerankerService(settings)
        reranker_service.initialize()
        
        # 8. Database Service
        logger.info("Connecting to MongoDB...")
        database_service = DatabaseService(settings)
        database_service.connect()
        
        # 9. Auth Service
        auth_service = AuthService(settings, database_service)
        
        # 10. Places Service
        places_service = PlacesService(settings)
        logger.info("Google Places service initialized")

        # 11. Uber Service
        logger.info("11. Initializing UberService ...")
        uber_service = UberService(settings)
        logger.info("Uber service initialized")

        # 12. Conversation Service
        logger.info("12. Initializing ConversationService ...")
        conversation_service = ConversationService(settings, database_service)
        logger.info("Conversation service initialized")
        
        # 13. Cloudinary Service
        logger.info("13. Initializing CloudinaryService ...")
        cloudinary_service = CloudinaryService(settings)
        # Initialization happens lazily on first use, or we can force it here if we want to check creds early
        # cloudinary_service._initialize() 
        logger.info("Cloudinary service prepared")
        
        # 14. Image Generation Service
        logger.info("14. Initializing ImageGenerationService ...")
        image_gen_service = ImageGenerationService(settings)
        # Initialization happens lazily
        logger.info("Image generation service prepared")

        # Create service container and inject into routers
        container = ServiceContainer(
            embedding_service=embedding_service,
            vision_service=vision_service,
            vector_store_service=vector_store_service,
            llm_service=llm_service,
            reranker_service=reranker_service,
            stt_service=stt_service,
            tts_service=tts_service,
            database_service=database_service,
            auth_service=auth_service,
            places_service=places_service,
            uber_service=uber_service,
            conversation_service=conversation_service,
            cloudinary_service=cloudinary_service,
            image_gen_service=image_gen_service,
        )
        set_service_container(container)
        
        logger.info("=" * 60)
        logger.info("✓ All services initialized successfully")
        logger.info("✓ API ready to accept requests")
        logger.info("=" * 60)
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services: %s", e)
        raise
    
    finally:
        logger.info("Shutting down Cross-Lingual RAG API...")
        logger.info("Cleanup complete")
        
        if 'database_service' in locals():
            database_service.close()


# ── FastAPI Application ─────────────────────────────────────────────────────
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=__version__,
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# ── Include Routers ─────────────────────────────────────────────────────────
app.include_router(health_router, tags=["Health"])
app.include_router(query_router, tags=["Query"])
app.include_router(audio_router, tags=["Audio"])
app.include_router(auth_router, tags=["Auth"])
app.include_router(pharaohs_router, tags=["Pharaohs"])
app.include_router(conversations_router, tags=["Conversations"])


# ── Application Entry Point ─────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower(),
    )
