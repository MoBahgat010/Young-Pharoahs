"""
Reranker Service Module
========================
Manages BGE reranker operations for improving retrieval quality.
"""

import logging
from typing import List, Tuple

import torch
from sentence_transformers import CrossEncoder

from app.config import Settings
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class RerankerService:
    """Service for reranking retrieved documents using BAAI/bge-reranker-base."""

    def __init__(self, settings: Settings):
        """
        Initialize the reranker service.

        Args:
            settings: Application settings instance
        """
        self.settings = settings
        self.model: CrossEncoder | None = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def initialize(self) -> None:
        """Initialize the CrossEncoder model."""
        if self.model is not None:
            logger.info("Reranker model already initialized")
            return

        logger.info(f"Loading BGE reranker model on {self.device}...")

        try:
            # Force FP16 for VRAM savings as requested
            model_kwargs = {"torch_dtype": "float16"} if self.device == "cuda" else {}
            
            self.model = CrossEncoder(
                'BAAI/bge-reranker-base',
                automodel_args=model_kwargs,
                device=self.device
            )
            logger.info("Reranker model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load reranker model: {e}")
            raise RuntimeError(f"Could not load BGE reranker: {e}") from e

    def rerank(
        self,
        query: str,
        documents: List[Tuple[Document, float]],
        top_k: int | None = None,
        batch_size: int = 4
    ) -> List[Tuple[Document, float]]:
        """
        Rerank a list of (Document, score) tuples based on the query.

        Args:
            query: The search query.
            documents: List of (Document, score) tuples from the vector store.
            top_k: Number of top results to return after reranking.
            batch_size: Batch size for prediction to manage VRAM usage.

        Returns:
            List of reranked (Document, new_score) tuples.
        """
        if not self.model:
            raise RuntimeError("Reranker service not initialized. Call initialize() first.")

        if not documents:
            return []

        # Prepare pairs for CrossEncoder
        pairs = [(query, doc.page_content) for doc, _ in documents]

        try:
            # Predict scores
            scores = self.model.predict(pairs, batch_size=batch_size)
            
            # Combine documents with new scores
            reranked_results = []
            for i, score in enumerate(scores):
                doc = documents[i][0]
                reranked_results.append((doc, float(score)))

            # Sort by new score (descending)
            reranked_results.sort(key=lambda x: x[1], reverse=True)

            # Slice to top_k
            if top_k is not None:
                reranked_results = reranked_results[:top_k]

            return reranked_results

        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            # Fallback to original order if reranking fails? 
            # Or raise? Raising seems safer to alert issues.
            raise RuntimeError(f"Reranking failed: {e}") from e
