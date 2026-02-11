"""
Response Models
===============
Pydantic models for API responses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    """Model for a source document in search results."""
    
    content: str = Field(..., description="Document content/text")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    score: float = Field(..., description="Similarity score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "Ramses II was one of the most powerful pharaohs...",
                "metadata": {
                    "source_file": "ramses.pdf",
                    "page": 1
                },
                "score": 0.89
            }
        }


class QueryResponse(BaseModel):
    """Response model for query endpoint."""
    
    answer: str = Field(..., description="Generated answer to the query")
    sources: List[SourceDocument] = Field(
        default_factory=list,
        description="Retrieved source documents"
    )
    image_descriptions: List[str] = Field(
        default_factory=list,
        description="Descriptions of uploaded images (if any)"
    )
    search_query: str = Field(..., description="Enriched search query used")
    top_k: int = Field(..., description="Number of results retrieved")
    
    # Conversation memory
    conversation_id: Optional[str] = Field(None, description="Conversation session ID")
    
    # TTS Response Fields
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio output")
    tts_provider: Optional[str] = Field(None, description="TTS provider used")
    tts_model: Optional[str] = Field(None, description="TTS model used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "Ramses II, also known as Ramses the Great...",
                "sources": [
                    {
                        "content": "Ramses II ruled Egypt for 66 years...",
                        "metadata": {"source_file": "ramses.pdf", "page": 1},
                        "score": 0.89
                    }
                ],
                "image_descriptions": ["Ramses II"],
                "search_query": "Tell me about Ramses II. Context: Ramses II",
                "top_k": 5
            }
        }


class VoiceQueryResponse(BaseModel):
    """Response model for voice query endpoint."""

    transcript: str = Field(..., description="Transcribed text from audio")
    answer: str = Field(..., description="Generated answer text used to generate the audio")
    sources: List[SourceDocument] = Field(
        default_factory=list,
        description="Retrieved source documents"
    )
    audio_base64: str = Field(..., description="Base64-encoded audio output")
    tts_provider: str = Field(..., description="TTS provider used")
    tts_model: str = Field(..., description="TTS model used")
    search_query: str = Field(..., description="Enriched search query used")
    top_k: int = Field(..., description="Number of results retrieved")
    conversation_id: Optional[str] = Field(None, description="Conversation session ID")

    class Config:
        json_schema_extra = {
            "example": {
                "transcript": "Tell me about Ramses II",
                "answer": "Ramses II was one of the most powerful pharaohs...",
                "sources": [
                    {
                        "content": "Ramses II ruled Egypt for 66 years...",
                        "metadata": {"source_file": "ramses.pdf", "page": 1},
                        "score": 0.89
                    }
                ],
                "audio_base64": "<base64-audio>",
                "tts_provider": "elevenlabs",
                "tts_model": "eleven_multilingual_v2",
                "search_query": "Tell me about Ramses II",
                "top_k": 5
            }
        }


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    services: Dict[str, str] = Field(
        default_factory=dict,
        description="Status of individual services"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "2.0.0",
                "services": {
                    "embeddings": "loaded",
                    "vector_store": "connected",
                    "llm": "ready",
                    "vision": "ready"
                }
            }
        }


class ErrorResponse(BaseModel):
    """Response model for error responses."""
    
    detail: str = Field(..., description="Error message")
    error_type: Optional[str] = Field(None, description="Type of error")
    
    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Vector search failed: Connection timeout",
                "error_type": "VectorStoreError"
            }
        }


class ImageDescriptionResponse(BaseModel):
    """Response model for image description endpoint."""
    descriptions: List[str] = Field(..., description="List of image descriptions")

