"""
Vector Store Service Module
============================
Manages Pinecone vector database operations and similarity search.
"""

import logging
import time
from typing import List, Tuple

from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document

from app.config import Settings
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing Pinecone vector store operations."""
    
    def __init__(self, settings: Settings, embedding_service: EmbeddingService):
        """
        Initialize the vector store service.
        
        Args:
            settings: Application settings instance
            embedding_service: Embedding service for vectorization
        """
        self.settings = settings
        self.embedding_service = embedding_service
        self.pc: Pinecone | None = None
        self.vectorstore: PineconeVectorStore | None = None
    
    def initialize(self) -> None:
        """Initialize Pinecone client and connect to index."""
        if self.vectorstore is not None:
            logger.info("Vector store already initialized")
            return
        
        logger.info(f"Connecting to Pinecone index: {self.settings.pinecone_index}")
        
        try:
            # Initialize Pinecone client
            self.pc = Pinecone(api_key=self.settings.pinecone_api_key)
            
            # Connect to index
            index = self.pc.Index(self.settings.pinecone_index)
            
            # Create vector store
            embeddings = self.embedding_service.get_embeddings()
            self.vectorstore = PineconeVectorStore(
                index=index,
                embedding=embeddings,
            )
            
            logger.info("Vector store connected successfully")
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise RuntimeError(f"Could not connect to Pinecone: {e}") from e
    
    def get_vectorstore(self) -> PineconeVectorStore:
        """
        Get the initialized vector store.
        
        Returns:
            PineconeVectorStore instance
            
        Raises:
            RuntimeError: If vector store is not initialized
        """
        if self.vectorstore is None:
            raise RuntimeError("Vector store not initialized. Call initialize() first.")
        return self.vectorstore
    
    def similarity_search(
        self, 
        query: str, 
        k: int | None = None
    ) -> List[Tuple[Document, float]]:
        """
        Perform similarity search in vector store.
        
        Args:
            query: Search query text
            k: Number of results to return (uses settings.top_k if None)
            
        Returns:
            List of (Document, score) tuples
            
        Raises:
            ValueError: If k is out of valid range
            RuntimeError: If search fails
        """
        vectorstore = self.get_vectorstore()
        
        # Validate and set k
        k = k or self.settings.top_k
        if k < self.settings.min_top_k or k > self.settings.max_top_k:
            raise ValueError(
                f"top_k must be between {self.settings.min_top_k} and {self.settings.max_top_k}"
            )
        
        logger.info(f"Performing similarity search with k={k}")
        
        try:
            results = vectorstore.similarity_search_with_score(query, k=k)
            logger.info(f"Found {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise RuntimeError(f"Vector search failed: {e}") from e
    
    def ensure_index_exists(self) -> None:
        """
        Create or validate the Pinecone index.
        Used primarily by ingestion pipeline.
        
        Raises:
            RuntimeError: If index creation/validation fails
        """
        if self.pc is None:
            self.pc = Pinecone(api_key=self.settings.pinecone_api_key)
        
        index_name = self.settings.pinecone_index
        existing_indexes = [idx["name"] for idx in self.pc.list_indexes()]
        
        if index_name in existing_indexes:
            # Validate dimensions
            desc = self.pc.describe_index(index_name)
            if int(desc.dimension) != self.settings.embedding_dimension:
                logger.warning(
                    f"Index dimension mismatch: {desc.dimension} vs {self.settings.embedding_dimension}. "
                    "Recreating index..."
                )
                self.pc.delete_index(index_name)
                
                # Wait for deletion
                while index_name in [i["name"] for i in self.pc.list_indexes()]:
                    time.sleep(1)
            else:
                logger.info(f"Index '{index_name}' exists with correct dimensions")
                return
        
        # Create new index
        logger.info(f"Creating index '{index_name}'")
        try:
            self.pc.create_index(
                name=index_name,
                dimension=self.settings.embedding_dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=self.settings.pinecone_cloud,
                    region=self.settings.pinecone_region
                ),
            )
            
            # Wait for index to be ready
            while index_name not in [i["name"] for i in self.pc.list_indexes()]:
                time.sleep(1)
            
            logger.info(f"Index '{index_name}' created successfully")
        except Exception as e:
            logger.error(f"Failed to create index: {e}")
            raise RuntimeError(f"Could not create Pinecone index: {e}") from e
    
    def upsert_documents(
        self, 
        documents: List[Document],
        batch_size: int = 100
    ) -> None:
        """
        Upsert documents to vector store in batches.
        
        Args:
            documents: List of documents to upsert
            batch_size: Number of documents per batch
            
        Raises:
            RuntimeError: If upsert fails
        """
        vectorstore = self.get_vectorstore()
        
        logger.info(f"Upserting {len(documents)} documents in batches of {batch_size}")
        
        try:
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                vectorstore.add_documents(batch)
                logger.info(f"Upserted batch {i // batch_size + 1} ({len(batch)} documents)")
            
            logger.info("All documents upserted successfully")
        except Exception as e:
            logger.error(f"Failed to upsert documents: {e}")
            raise RuntimeError(f"Document upsert failed: {e}") from e
