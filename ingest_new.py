"""
Document Ingestion Pipeline (Refactored)
=========================================
Loads PDFs, chunks them, generates embeddings, and uploads to Pinecone.

Usage:
    python ingest.py --folder datasource/ --chunk-size 512 --chunk-overlap 50
"""

import sys
import glob
import argparse
import logging
from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config import settings
from app.services import EmbeddingService, VectorStoreService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def load_and_chunk_pdfs(
    folder_path: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[Document]:
    """
    Load all PDFs from a folder and split them into chunks.
    
    Args:
        folder_path: Path to folder containing PDF files
        chunk_size: Size of text chunks (uses settings default if None)
        chunk_overlap: Overlap between chunks (uses settings default if None)
        
    Returns:
        List of document chunks
        
    Raises:
        ValueError: If folder doesn't exist or no PDFs found
    """
    folder = Path(folder_path)
    
    if not folder.is_dir():
        raise ValueError(f"Folder not found: {folder_path}")
    
    # Find all PDF files
    pdf_files = list(folder.glob("*.pdf"))
    if not pdf_files:
        raise ValueError(f"No PDF files found in {folder_path}")
    
    logger.info(f"Found {len(pdf_files)} PDF files in {folder_path}")
    
    # Load documents
    all_documents = []
    for pdf_path in pdf_files:
        try:
            logger.info(f"Loading: {pdf_path.name}")
            loader = PyPDFLoader(str(pdf_path))
            docs = loader.load()
            all_documents.extend(docs)
            logger.info(f"  ✓ Loaded {len(docs)} pages")
        except Exception as e:
            logger.error(f"  ✗ Failed to load {pdf_path.name}: {e}")
            continue
    
    if not all_documents:
        raise ValueError("No documents were successfully loaded")
    
    logger.info(f"Total pages loaded: {len(all_documents)}")
    
    # Split into chunks
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    
    logger.info(f"Splitting into chunks (size={chunk_size}, overlap={chunk_overlap})")
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    
    chunks = splitter.split_documents(all_documents)
    logger.info(f"Created {len(chunks)} chunks")
    
    return chunks


def main():
    """Main ingestion pipeline."""
    parser = argparse.ArgumentParser(
        description="Ingest PDF documents into Pinecone vector store"
    )
    parser.add_argument(
        "--folder",
        type=str,
        required=True,
        help="Path to folder containing PDF files"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=None,
        help=f"Chunk size (default: {settings.chunk_size})"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=None,
        help=f"Chunk overlap (default: {settings.chunk_overlap})"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for uploading (default: 100)"
    )
    parser.add_argument(
        "--create-index",
        action="store_true",
        help="Create/recreate Pinecone index if needed"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Document Ingestion Pipeline")
    logger.info("=" * 60)
    
    try:
        # Initialize services
        logger.info("Initializing services...")
        
        embedding_service = EmbeddingService(settings)
        embedding_service.load_model()
        
        vector_store_service = VectorStoreService(settings, embedding_service)
        
        # Ensure index exists if requested
        if args.create_index:
            logger.info("Ensuring Pinecone index exists...")
            vector_store_service.ensure_index_exists()
        
        # Connect to vector store
        vector_store_service.initialize()
        
        # Load and chunk documents
        logger.info("=" * 60)
        logger.info("Loading and chunking documents...")
        logger.info("=" * 60)
        
        chunks = load_and_chunk_pdfs(
            args.folder,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap
        )
        
        # Upload to Pinecone
        logger.info("=" * 60)
        logger.info("Uploading to Pinecone...")
        logger.info("=" * 60)
        
        vector_store_service.upsert_documents(chunks, batch_size=args.batch_size)
        
        logger.info("=" * 60)
        logger.info("✓ Ingestion completed successfully!")
        logger.info(f"✓ Total chunks uploaded: {len(chunks)}")
        logger.info("=" * 60)
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        sys.exit(1)
    except RuntimeError as e:
        logger.error(f"Runtime error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
