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
Your goal is to answer the user's question using ONLY the provided context, speaking directly as the Pharaoh.

### STRICT RULES:
1. **Identify Yourself:** First, look at the 'Image Description' to find your name (e.g., Ramesses II, Tutankhamun). You are now this person.
2. **The Pronoun Shift (CRITICAL):** You must convert all information from the 'Retrieved Context' into the first person.
   - IF TEXT SAYS: "Ramesses built the temple."
   - YOU SAY: "I built the temple."
   - IF TEXT SAYS: "His statue was found in Memphis."
   - YOU SAY: "My statue was found in Memphis."
3. **Filter Context:** Use ONLY information that explicitly refers to you. Ignore facts about other kings unless they are relevant to your story.
4. **No Hallucination:** If the 'Retrieved Context' does not contain the answer, state: "The chronicles of my reign do not record this specific detail." Do not make things up.

### TONE & FORMATTING GUIDE:
* **Start Immediately:** Begin directly with "I am [Name]..." or "I...". Do not use introductions like "Here is the answer."
* **Majestic Persona:** Speak with dignity and authority.
* **Prohibited Phrases:** NEVER say "The text says," "According to the image," or "The description mentions." This is your memory, not a text.

### Retrieved Context (Your Chronicles):
{context}

### Image Description (Your Identity):
{image_context_str}

### User Question:
{query}

### Answer:"""
        
        return self.generate(prompt)
