"""
Application Configuration Module
==================================
Centralized configuration management using Pydantic Settings.
All environment variables are validated and type-checked here.
"""

from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )
    
    # ── Pinecone Configuration ──────────────────────────────────────────────
    pinecone_api_key: str
    pinecone_index: str = "cross-lingual-rag"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    
    # ── Google Gemini Configuration ─────────────────────────────────────────
    gemini_api_key: str
    gemini_model: str = "gemini-3-flash-preview"
    gemini_vision_model: str = "gemini-3-flash-preview"
    
    # ── RAG Configuration ───────────────────────────────────────────────────
    top_k: int = 30
    max_top_k: int = 100
    min_top_k: int = 1

    rerank_top_k: int = 10
    
    # ── Embedding Configuration ─────────────────────────────────────────────
    embedding_model: str = "BAAI/bge-m3"
    embedding_dimension: int = 1024
    normalize_embeddings: bool = True
    
    # ── Text Chunking Configuration ─────────────────────────────────────────
    chunk_size: int = 512
    chunk_overlap: int = 50
    
    # ── Vision Configuration ────────────────────────────────────────────────
    vision_prompt: str = (
        "Just tell me who is the king or queen in this image. "
        "No need to explain yourself or add more text or details. "
        "Just give me the name directly and accurately."
    )
    max_images_per_request: int = 5
    
    # ── API Configuration ───────────────────────────────────────────────────
    api_title: str = "Cross-Lingual RAG API"
    api_version: str = "2.0.0"
    api_description: str = "Retrieval-Augmented Generation for Ancient Egyptian History"
    
    # ── CORS Configuration ──────────────────────────────────────────────────
    cors_allow_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]
    
    # ── Logging Configuration ───────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    
    # ── STT/TTS Configuration ───────────────────────────────────────────────
    stt_provider: str = "deepgram"
    tts_provider: str = "elevenlabs"
    tts_language: str = "en"

    deepgram_api_key: str | None = Field(default=None, alias="DEEPGRAM_KEY")
    deepgram_stt_model: str = "nova-2"
    deepgram_tts_model: str = "aura-asteria-en"

    elevenlabs_api_key: str | None = Field(default=None, alias="ELEVENLABS")
    elevenlabs_voice_female: str | None = Field(default=None, alias="ELEVENLABS_female")
    elevenlabs_voice_male: str | None = Field(default=None, alias="ELEVENLABS_male")
    elevenlabs_default_voice: str = "female"
    elevenlabs_default_model: str = "eleven_multilingual_v2"
    tts_audio_format: str = "mp3"

    # ── Database Configuration ──────────────────────────────────────────────
    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    db_name: str = "pharaohs_db"

    # ── Auth Configuration ──────────────────────────────────────────────────
    jwt_secret_key: str = "your_secret_key"  # Change in production
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # ── Google Places Configuration ─────────────────────────────────────────
    google_places_api_key: str | None = Field(default=None, alias="GOOGLE_PLACES_API_KEY")
    places_radius: int = 5000  # search radius in meters

    # ── Uber Configuration ──────────────────────────────────────────────────
    uber_credentials_file: str = "uber_credentials.json"
    
    def validate_api_keys(self) -> None:
        """Validate that required API keys are present."""
        if not self.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY is required")
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is required")


# Global settings instance
settings = Settings()
settings.validate_api_keys()
