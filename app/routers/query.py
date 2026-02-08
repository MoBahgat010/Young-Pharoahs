"""
Query Router
============
Handles RAG query endpoints with image and text input.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.models.response import QueryResponse, SourceDocument
from app.services import (
    EmbeddingService,
    VisionService,
    VectorStoreService,
    LLMService,
    STTService,
    TTSService,
)
from app.utils.image import upload_files_to_pil_images, validate_image_count
from app.utils.prompt import (
    build_context_from_documents,
    enrich_query_with_images,
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Service dependencies (will be injected by main app)
class ServiceContainer:
    """Container for service dependencies."""
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        vision_service: VisionService,
        vector_store_service: VectorStoreService,
        llm_service: LLMService,
        stt_service: Optional[STTService] = None,
        tts_service: Optional[TTSService] = None,
    ):
        self.embedding_service = embedding_service
        self.vision_service = vision_service
        self.vector_store_service = vector_store_service
        self.llm_service = llm_service
        self.stt_service = stt_service
        self.tts_service = tts_service


# Global service container (set by main app during startup)
_service_container: Optional[ServiceContainer] = None


def set_service_container(container: ServiceContainer) -> None:
    """Set the global service container."""
    global _service_container
    _service_container = container


def get_services() -> ServiceContainer:
    """Dependency to get services."""
    if _service_container is None:
        raise RuntimeError("Services not initialized")
    return _service_container


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Query RAG system",
    description="Submit a text query with optional images to retrieve and generate answers from the knowledge base.",
)
async def query_rag(
    prompt: str = Form(..., description="The query text"),
    images: Optional[List[UploadFile]] = File(None, description="Optional images to analyze"),
    top_k: Optional[int] = Form(None, description="Number of results to retrieve"),
    services: ServiceContainer = Depends(get_services),
) -> QueryResponse:
    """
    Query the RAG system with text and optional images.
    
    Args:
        prompt: User query text
        images: Optional uploaded images
        top_k: Number of results to retrieve (overrides default)
        services: Injected service container
        
    Returns:
        QueryResponse with answer and sources
        
    Raises:
        HTTPException: For various errors during processing
    """
    logger.info(f"Received query: '{prompt[:100]}...'")
    
    # Validate inputs
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    prompt = prompt.strip()
    image_descriptions: List[str] = []
    
    # Process images if provided
    if images:
        try:
            # Validate image count
            validate_image_count(len(images), settings.max_images_per_request)
            
            # Convert to PIL Images
            pil_images = await upload_files_to_pil_images(images)
            logger.info(f"Processing {len(pil_images)} images")
            
            # Describe images in parallel
            image_descriptions = await services.vision_service.describe_images_batch(pil_images)
            logger.info(f"Generated {len(image_descriptions)} image descriptions")
            
        except ValueError as e:
            logger.error(f"Image validation error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except RuntimeError as e:
            logger.error(f"Image processing error: {e}")
            raise HTTPException(status_code=502, detail=f"Image processing failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error processing images: {e}")
            raise HTTPException(status_code=500, detail=f"Image processing error: {e}")
    
    # Enrich query with image context
    search_query = enrich_query_with_images(prompt, image_descriptions)
    logger.info(f"Search query: '{search_query[:100]}...'")
    
    # Perform vector search
    try:
        k = top_k or settings.top_k
        results = services.vector_store_service.similarity_search(search_query, k=k)
        logger.info(f"Retrieved {len(results)} documents")
    except ValueError as e:
        logger.error(f"Invalid top_k value: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Vector search error: {e}")
        raise HTTPException(status_code=502, detail=f"Vector search failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during search: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {e}")
    
    # Build context from results
    context = build_context_from_documents(results)
    
    # Generate answer using LLM
    try:
        answer = services.llm_service.generate_with_context(
            query=prompt,
            context=context
        )
        logger.info("Generated answer successfully")
    except RuntimeError as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")
    
    # Format response
    sources = [
        SourceDocument(
            content=doc.page_content,
            metadata=doc.metadata,
            score=score,
        )
        for doc, score in results
    ]
    
    response = QueryResponse(
        answer=answer,
        sources=sources,
        image_descriptions=image_descriptions,
        search_query=search_query,
        top_k=k,
    )
    
    logger.info("Query processed successfully")
    return response
