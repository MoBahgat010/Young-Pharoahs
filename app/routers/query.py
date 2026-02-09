"""
Query Router
============
Handles RAG query endpoints with image and text input.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body

from app.models.response import QueryResponse, SourceDocument, ImageDescriptionResponse
from app.models.request import QueryRequest
from app.services import (
    EmbeddingService,
    VisionService,
    VectorStoreService,
    LLMService,
    STTService,
    TTSService,
    RerankerService,
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
        reranker_service: RerankerService,
        stt_service: Optional[STTService] = None,
        tts_service: Optional[TTSService] = None,
    ):
        self.embedding_service = embedding_service
        self.vision_service = vision_service
        self.vector_store_service = vector_store_service
        self.llm_service = llm_service
        self.reranker_service = reranker_service
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
    "/describe-images",
    response_model=ImageDescriptionResponse,
    summary="Get image descriptions from vision model",
    description="Upload images to get their textual descriptions from the vision model.",
)
async def describe_images(
    images: List[UploadFile] = File(..., description="Images to analyze"),
    services: ServiceContainer = Depends(get_services),
) -> ImageDescriptionResponse:
    """
    Process images and return descriptions.
    """
    try:
        if not images:
             raise HTTPException(status_code=400, detail="No images provided")

        # Validate image count
        validate_image_count(len(images), settings.max_images_per_request)
        
        # Convert to PIL Images
        pil_images = await upload_files_to_pil_images(images)
        logger.info(f"Processing {len(pil_images)} images")
        
        # Describe images in parallel
        image_descriptions = await services.vision_service.describe_images_batch(pil_images)
        logger.info(f"Generated {len(image_descriptions)} image descriptions")
        
        return ImageDescriptionResponse(descriptions=image_descriptions)

    except ValueError as e:
        logger.error(f"Image validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Image processing error: {e}")
        raise HTTPException(status_code=502, detail=f"Image processing failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error processing images: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing error: {e}")


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Query RAG system",
    description="Submit a text query with optional image descriptions (from /describe-images) to retrieve and generate answers.",
)
async def query_rag(
    request: QueryRequest = Body(..., description="Query request body"),
    services: ServiceContainer = Depends(get_services),
) -> QueryResponse:
    """
    Query the RAG system with text and optional image descriptions.
    
    Args:
        request: Query parameters including prompt and image descriptions
        services: Injected service container
        
    Returns:
        QueryResponse with answer and sources
        
    Raises:
        HTTPException: For various errors during processing
    """
    prompt = request.prompt
    image_descriptions = request.image_descriptions

    logger.info(f"Received query: '{prompt[:100]}...'")
    
    # Validate inputs
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    prompt = prompt.strip()
    valid_descriptions: List[str] = image_descriptions or []
    
    # Enrich query with image context
    search_query = enrich_query_with_images(prompt, valid_descriptions)
    logger.info(f"Search query: '{search_query[:100]}...'")
    
    # Perform vector search
    try:
        k = settings.top_k
        # Retrieve more candidates for reranking
        initial_k = min(k * 4, 100)
        results = services.vector_store_service.similarity_search(search_query, k=initial_k)
        logger.info(f"Retrieved {len(results)} initial documents")
        
        # Rerank results
        results = services.reranker_service.rerank(search_query, results, top_k=k)
        logger.info(f"Reranked to top {len(results)} documents")
        
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
    logger.info(f"{'context'}: {context}")
    logger.info(f"{'prompt'}: {prompt}")
    try:
        answer = services.llm_service.generate_with_context(
            query=prompt,
            context=context,
            image_descriptions=valid_descriptions
        )
        logger.info("Generated answer successfully")
    except RuntimeError as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")
    
    response = QueryResponse(
        answer=answer,
        image_descriptions=valid_descriptions,
        search_query=search_query,
        top_k=k,
    )
    
    logger.info("Query processed successfully")
    return response
