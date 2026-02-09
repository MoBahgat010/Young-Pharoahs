"""
LLM Service Module
==================
Handles text generation using Google Gemini LLM.
"""

import logging

import google.generativeai as genai

from app.config import Settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for text generation using Gemini LLM."""
    
    def __init__(self, settings: Settings):
        """
        Initialize the LLM service.
        
        Args:
            settings: Application settings instance
        """
        self.settings = settings
        self.model: genai.GenerativeModel | None = None
    
    def initialize(self) -> None:
        """Initialize the Gemini LLM model."""
        if self.model is not None:
            logger.info("LLM model already initialized")
            return
        
        logger.info(f"Initializing Gemini LLM: {self.settings.gemini_model}")
        
        try:
            genai.configure(api_key=self.settings.gemini_api_key)
            self.model = genai.GenerativeModel(self.settings.gemini_model)
            logger.info("LLM model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LLM model: {e}")
            raise RuntimeError(f"Could not initialize LLM: {e}") from e
    
    def get_model(self) -> genai.GenerativeModel:
        """
        Get the initialized LLM model.
        
        Returns:
            GenerativeModel instance
            
        Raises:
            RuntimeError: If model is not initialized
        """
        if self.model is None:
            raise RuntimeError("LLM model not initialized. Call initialize() first.")
        return self.model
    
    def generate(self, prompt: str) -> str:
        """
        Generate text response from prompt.
        
        Args:
            prompt: Input prompt for generation
            
        Returns:
            Generated text
            
        Raises:
            RuntimeError: If generation fails
        """
        model = self.get_model()
        
        logger.debug(f"Generating response for prompt (length: {len(prompt)})")
        
        try:
            response = model.generate_content(prompt)
            answer = response.text.strip()
            logger.debug(f"Generated response (length: {len(answer)})")
            return answer
        except Exception as e:
            logger.error(f"Text generation failed: {e}")
            raise RuntimeError(f"LLM generation failed: {e}") from e
    
    def generate_with_context(
        self, 
        query: str, 
        context: str,
        image_descriptions: list[str] | None = None,
        system_instruction: str | None = None
    ) -> str:
        """
        Generate answer based on query, context, and optional images.
        
        Args:
            query: User's question
            context: Retrieved context documents
            image_descriptions: Optional list of image descriptions
            system_instruction: Optional system instruction override
            
        Returns:
            Generated answer
        """
        image_context_str = ""
        if image_descriptions:
            image_context_str = "\n\n### User Image Context:\n" + "\n".join(image_descriptions)

        prompt = f"""You are a strict and knowledgeable assistant specializing in ancient Egyptian history.
Your goal is to answer the user's question using ONLY the provided context, but you must strictly adhere to the following logic:

### STRICT RULES:
1. **Identify the Subject:** First, look at the 'Image Description' below and identify the name of the Egyptian King mentioned.
2. **Filter Context:** You may ONLY use information from the 'Retrieved Context' that explicitly refers to the King identified in step 1. Discard any information about other kings or unrelated topics.
3. **Relevance Check:** Does the filtered information specifically answer the 'User Question'?
   - IF YES: Answer the question using only that information.
   - IF NO: State "I do not have enough information about [King's Name] to answer this specific question."
4. **NO HALLUCINATION:** Do not add any outside knowledge. If the answer is not in the text provided, admit it.

### Retrieved Context:
{context}

### Image Description (Target Subject):
{image_context_str}

### User Question:
{query}

### Answer:"""
        
        return self.generate(prompt)
