"""
Query Router
============
Handles RAG query endpoints with image and text input.
"""

import logging
import base64
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body, Form
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated

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
    PlacesService,
    UberService,
    ConversationService,
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
        database_service: Optional["DatabaseService"] = None,
        auth_service: Optional["AuthService"] = None,
        places_service: Optional[PlacesService] = None,
        uber_service: Optional[UberService] = None,
        conversation_service: Optional[ConversationService] = None,
    ):
        self.embedding_service = embedding_service
        self.vision_service = vision_service
        self.vector_store_service = vector_store_service
        self.llm_service = llm_service
        self.reranker_service = reranker_service
        self.stt_service = stt_service
        self.tts_service = tts_service
        self.database_service = database_service
        self.auth_service = auth_service
        self.places_service = places_service
        self.uber_service = uber_service
        self.conversation_service = conversation_service


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


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signin")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], 
    services: ServiceContainer = Depends(get_services)
):
    return await services.auth_service.get_current_user(token)


@router.post(
    "/describe-images",
    response_model=ImageDescriptionResponse,
    summary="Get image descriptions from vision model",
    description="Upload images to get their textual descriptions from the vision model.",
    dependencies=[]
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
    dependencies=[]
)
async def query_rag(
    request: QueryRequest = Body(..., description="Query request body"),
    services: ServiceContainer = Depends(get_services),
) -> QueryResponse:
    """
    Query the RAG system with text and optional image descriptions.
    Supports multi-turn conversations via conversation_id.
    """
    prompt = request.prompt
    image_descriptions = request.image_descriptions
    gender = request.gender
    tts_provider = request.tts_provider
    tts_model = request.tts_model
    conversation_id = request.conversation_id

    logger.info("gender: ", gender)
    logger.info("tts_provider: ", tts_provider)
    logger.info("tts_model: ", tts_model)
    logger.info(f"Received query: '{prompt[:100]}...'")
    
    # Validate inputs
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    prompt = prompt.strip()
    valid_descriptions: List[str] = image_descriptions or []
    
    # ── Conversation Memory ─────────────────────────────────────────────────
    history = []
    if services.conversation_service:
        if conversation_id:
            # Continue existing conversation
            history = await services.conversation_service.get_history(conversation_id, limit=10)
            if not history:
                logger.warning(f"Conversation {conversation_id} not found, creating new one")
                conversation_id = await services.conversation_service.create_conversation()
        else:
            # Start new conversation
            conversation_id = await services.conversation_service.create_conversation()
        
        # Store user message
        await services.conversation_service.add_message(conversation_id, "user", prompt)
    
    # ── Query Rewriting ─────────────────────────────────────────────────────
    rewritten_query = services.llm_service.rewrite_query(prompt, history)
    
    # Enrich query with image context
    search_query = enrich_query_with_images(rewritten_query, valid_descriptions)
    logger.info(f"Search query: '{search_query[:100]}...'")
    
    # Perform vector search
    try:
        k = settings.top_k

        logger.info(f"Performing vector search with top_k={k}")
        
        # Retrieve candidates for reranking
        results = services.vector_store_service.similarity_search(search_query, k=k)
        logger.info(f"Retrieved {len(results)} initial documents")
        
        # Rerank results
        rerank_top_k = 8
        results = services.reranker_service.rerank(search_query, results, top_k=rerank_top_k)
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
    
    # Generate answer using LLM (with conversation history)
    logger.info(f"{'context'}: {context}")
    logger.info(f"{'prompt'}: {prompt}")
    try:
        answer = services.llm_service.generate_with_context(
            query=prompt,
            context=context,
            image_descriptions=valid_descriptions,
            history=history,
        )
        logger.info("Generated answer successfully")
    except RuntimeError as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")

    # Store assistant response in conversation
    if services.conversation_service and conversation_id:
        await services.conversation_service.add_message(conversation_id, "assistant", answer)

    logger.info(f"Answer: {answer}")
    
    response = QueryResponse(
        answer=answer,
        image_descriptions=valid_descriptions,
        search_query=search_query,
        top_k=k,
        conversation_id=conversation_id,
        audio_base64=None,
        tts_provider=None,
        tts_model=None,
    )
    
    logger.info("Query processed successfully")
    return response


@router.post(
    "/tts",
    response_model=QueryResponse,
    summary="Synthesize text to speech",
    description="Convert text to speech. If conversation_id is provided and gender is omitted, the pharaoh's gender is auto-detected from conversation history.",
    dependencies=[]
)
async def synthesize_speech(
    text: str = Form(..., description="Text to synthesize"),
    gender: Optional[str] = Form(None, description="Voice gender for TTS (female/male). Auto-detected if omitted with conversation_id."),
    tts_model: Optional[str] = Form(None, description="TTS model override"),
    conversation_id: Optional[str] = Form(None, description="Conversation ID for auto gender detection"),
    services: ServiceContainer = Depends(get_services),
) -> QueryResponse:
    """
    Convert text to speech.
    If conversation_id is provided and gender is not, auto-detect the pharaoh's gender.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Auto-detect gender from conversation history
    if not gender and conversation_id and services.conversation_service:
        history = await services.conversation_service.get_history(conversation_id, limit=10)
        if history:
            gender = services.llm_service.detect_gender(history, text_to_speak=text)
            logger.info(f"Auto-detected gender: {gender}")

    provider_used = "deepgram"
    
    # Handle model selection based on gender
    if tts_model:
        model_used = tts_model
    elif gender and gender.lower() == "male":
        model_used = "aura-helios-en"
    else:
        model_used = settings.deepgram_tts_model
    
    # Preprocess text
    text_clean = text.replace("*", "").strip()
    
    try:
        audio_out = services.tts_service.synthesize(
            text=text_clean,
            provider=provider_used,
            voice=gender,
            model=model_used,
        )
    except (RuntimeError, ValueError) as e:
        logger.error(f"TTS failed: {e}")
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")
        
    audio_base64 = base64.b64encode(audio_out).decode("utf-8")
    
    return QueryResponse(
        answer=text,
        search_query=text,
        top_k=0,
        conversation_id=conversation_id,
        audio_base64=audio_base64,
        tts_provider=provider_used,
        tts_model=model_used
    )
