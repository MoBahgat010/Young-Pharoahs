"""
Embedding Service Module
=========================
Manages BGE-M3 embedding model for text vectorization.
"""

import logging
from typing import List

import torch
from langchain_huggingface import HuggingFaceEmbeddings

from app.config import Settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using BGE-M3 model."""
    
    def __init__(self, settings: Settings):
        """
        Initialize the embedding service.
        
        Args:
            settings: Application settings instance
        """
        self.settings = settings
        self.embeddings: HuggingFaceEmbeddings | None = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
    
    def load_model(self) -> None:
        """Load the BGE-M3 embedding model."""
        if self.embeddings is not None:
            logger.info("Embedding model already loaded")
            return
        
        logger.info(f"Loading {self.settings.embedding_model} on {self.device}")
        
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.settings.embedding_model,
                model_kwargs={"device": self.device},
                encode_kwargs={"normalize_embeddings": self.settings.normalize_embeddings},
            )
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RuntimeError(f"Could not load embedding model: {e}") from e
    
    def get_embeddings(self) -> HuggingFaceEmbeddings:
        """
        Get the loaded embeddings instance.
        
        Returns:
            HuggingFaceEmbeddings instance
            
        Raises:
            RuntimeError: If model is not loaded
        """
        if self.embeddings is None:
            raise RuntimeError("Embedding model not loaded. Call load_model() first.")
        return self.embeddings
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of embedding values
        """
        embeddings = self.get_embeddings()
        return embeddings.embed_query(text)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of input texts
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.get_embeddings()
        return embeddings.embed_documents(texts)
