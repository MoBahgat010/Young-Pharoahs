"""
Prompt Utilities
================
Helper functions for building prompts and formatting context.
"""

import logging
from typing import List, Tuple
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


def build_context_from_documents(
    documents: List[Tuple[Document, float]]
) -> str:
    """
    Build context string from retrieved documents.
    
    Args:
        documents: List of (Document, score) tuples from vector search
        
    Returns:
        Formatted context string
    """
    if not documents:
        return "No relevant context found."
    
    context_parts = []
    for i, (doc, score) in enumerate(documents, 1):
        # Extract metadata
        source = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", "N/A")
        
        # Format document section
        section = f"""
[Source {i}] (Score: {score:.3f})
File: {source}, Page: {page}
Content: {doc.page_content}
"""
        context_parts.append(section.strip())
    
    return "\n\n".join(context_parts)


def enrich_query_with_images(
    query: str,
    image_descriptions: List[str]
) -> str:
    """
    Enrich user query with image descriptions.
    
    Args:
        query: Original user query
        image_descriptions: List of image descriptions
        
    Returns:
        Enriched query string
    """
    if not image_descriptions:
        return query
    
    # Filter out error messages
    valid_descriptions = [
        desc for desc in image_descriptions
        if not desc.startswith("[Image") or "processing failed" not in desc
    ]
    
    if not valid_descriptions:
        return query
    
    context = " Context: " + ", ".join(valid_descriptions)
    enriched = f"{query}.{context}"
    
    logger.debug(f"Enriched query: {enriched}")
    return enriched


def build_rag_prompt(
    query: str,
    context: str,
    system_instruction: str | None = None
) -> str:
    """
    Build final RAG prompt for LLM.
    
    Args:
        query: User's question
        context: Retrieved context
        system_instruction: Optional system instruction
        
    Returns:
        Complete prompt string
    """
    default_instruction = (
        "You are an expert assistant specializing in ancient Egyptian history. "
        "Answer the question using ONLY the context provided below. "
        "If the context doesn't contain the answer, respond with "
        "\"I don't have enough information to answer that question.\""
    )
    
    instruction = system_instruction or default_instruction
    
    prompt = f"""{instruction}

Context:
{context}

Question: {query}

Answer:"""
    
    return prompt
