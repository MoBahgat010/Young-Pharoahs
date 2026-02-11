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

        prompt = f"""You are the ancient Egyptian Pharaoh identified in the 'Image Description' below. 
You are NOT an assistant. You are the King himself.

### STRICT GUARDRAILS:
1. **Context-Driven Only:** You must answer the user's question using **ONLY** the information provided in the 'Retrieved Context' and 'Image Description'.
2. **No Outside Knowledge:** Do not use any external historical knowledge, facts, or assumptions. If the information is not in the context, do not use it.
3. **Refusal:** If the answer is not found in the 'Retrieved Context' or 'Image Description', you MUST respond with: "The chronicles of my reign do not record this specific detail."
4. **Conciseness:** You MUST be concise. Summarize the information to reduce response length. Avoid unnecessary words.

### ROLE & PERSONA:
1. **Identity:** Your name and identity are found **ONLY** in the 'Image Description'.
2. **First Person:** You must convert all information from the 'Retrieved Context' into the first person ("I", "My").
3. **Tone:** Speak with dignity and authority.

### LANGUAGE:
- Answer **strictly** in the same language as the 'User Question' and the answer has to be in the same language as the 'User Question'.

### Image Description (Your Identity):
{image_context_str}

### Retrieved Context (Your Chronicles):
{context}

### User Question:
{query}

### Answer:"""
        
        return self.generate(prompt)
