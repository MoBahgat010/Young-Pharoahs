"""
Audio Router
============
Handles voice-based queries (audio → STT → RAG → TTS).
"""

import base64
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.models.response import VoiceQueryResponse, SourceDocument
from app.routers.query import ServiceContainer, get_services, get_current_user
from app.utils.prompt import build_context_from_documents
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[])


@router.post(
    "/voice-query",
    response_model=VoiceQueryResponse,
    summary="Voice query RAG system",
    description="Submit an audio file to transcribe, retrieve context, generate answer, and return TTS audio.",
)
async def voice_query_rag(
    audio: UploadFile = File(..., description="Audio file (wav/mp3/m4a)"),
    tts_provider: Optional[str] = Form(None, description="TTS provider: elevenlabs or deepgram"),
    gender: Optional[str] = Form(None, description="Voice gender: female/male"),
    tts_model: Optional[str] = Form(None, description="TTS model override"),
    stt_model: Optional[str] = Form(None, description="STT model override"),
    services: ServiceContainer = Depends(get_services),
) -> VoiceQueryResponse:
    """
    Voice query flow:
    1) Transcribe audio with Deepgram STT
    2) Retrieve context from Pinecone
    3) Generate answer with Gemini LLM
    4) Synthesize speech with TTS provider
    """
    if services.stt_service is None or services.tts_service is None:
        raise HTTPException(status_code=500, detail="STT/TTS services not initialized")

    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise ValueError("Empty audio file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid audio file: {e}")

    # 1) STT
    try:
        transcript = services.stt_service.transcribe_audio(
            audio_bytes=audio_bytes,
            mimetype=audio.content_type,
            model=stt_model,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"STT failed: {e}")

    logger.info("Transcript: %s", transcript[:120])

    # 2) Retrieve documents
    try:
        k = settings.top_k
        results = services.vector_store_service.similarity_search(transcript, k=k)

        rerank_top_k = settings.rerank_top_k
        results = services.reranker_service.rerank(transcript, results, top_k=rerank_top_k)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vector search failed: {e}")

    # 3) Build context and generate answer
    context = build_context_from_documents(results)
    try:
        answer = services.llm_service.generate_with_context(query=transcript, context=context)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {e}")
    
    answer_reformatted = answer.replace("*", "").strip()

    # 4) TTS
    try:
        audio_out = services.tts_service.synthesize(
            text=answer_reformatted,
            provider=tts_provider,
            voice=gender,
            model=tts_model,
        )
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")

    audio_base64 = base64.b64encode(audio_out).decode("utf-8")

    provider_used = (tts_provider or settings.tts_provider).lower()
    if provider_used == "deepgram":
        model_used = tts_model or settings.deepgram_tts_model
    else:
        model_used = tts_model or settings.elevenlabs_default_model

    return VoiceQueryResponse(
        transcript=transcript,
        answer=answer,
        audio_base64=audio_base64,
        tts_provider=provider_used,
        tts_model=model_used,
        search_query=transcript,
        top_k=k,
    )
