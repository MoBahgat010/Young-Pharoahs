"""
Request Models
==============
Pydantic models for API request validation.
"""

from typing import Optional
from pydantic import BaseModel, Field, validator


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The query text"
    )
    
    @validator('prompt')
    def prompt_not_empty(cls, v):
        """Validate prompt is not just whitespace."""
        if not v.strip():
            raise ValueError("Prompt cannot be empty or just whitespace")
        return v.strip()
    
    image_descriptions: Optional[list[str]] = Field(
        None,
        description="Optional list of image descriptions"
    )
    
    # Conversation memory
    conversation_id: Optional[str] = Field(
        None,
        description="Conversation ID to continue an existing session. Omit to start a new conversation."
    )
    
    # TTS Parameters (Legacy - used for voice query logic or other purposes if needed)
    gender: Optional[str] = Field(None, description="Voice gender for TTS (female/male)")
    tts_provider: Optional[str] = Field(None, description="TTS provider (elevenlabs/deepgram)")
    tts_model: Optional[str] = Field(None, description="TTS model override")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Tell me about Ramses II",
                "image_descriptions": ["A statue of Ramses II"],
                "conversation_id": None,
                "gender": "male",
                "tts_provider": "elevenlabs"
            }
        }


class TTSRequest(BaseModel):
    """Request model for TTS endpoint."""
    
    text: str = Field(..., description="Text to synthesize")
    gender: Optional[str] = Field(None, description="Voice gender for TTS (female/male)")
    tts_model: Optional[str] = Field(None, description="TTS model override")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for auto gender detection")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "The river Nile is the longest river in the world.",
                "gender": "male",
                "tts_model": "aura-asteria-en",
                "conversation_id": "uuid-string"
            }
        }
