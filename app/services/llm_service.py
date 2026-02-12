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

    def rewrite_query(
        self,
        query: str,
        history: list[dict] | None = None,
    ) -> str:
        """
        Rewrite a follow-up query into a standalone search query using conversation history.
        
        If there is no history, returns the original query unchanged.
        
        Args:
            query: The user's current message.
            history: Previous conversation messages [{"role": ..., "content": ...}].
            
        Returns:
            A rewritten, self-contained search query.
        """
        if not history:
            return query

        history_lines = []
        for msg in history[-6:]:  # last 6 messages max to save tokens
            role = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role}: {msg['content']}")
        history_str = "\n".join(history_lines)

        prompt = f"""Given the following conversation history and a new user question, rewrite the user question into a standalone search query that can be understood without the conversation history.

Rules:
- The rewritten query must be self-contained (resolve all pronouns like "he", "his", "it", "there")
- Keep it concise — a short search phrase, NOT a full sentence
- Do NOT answer the question, just rewrite it
- If the question is already self-contained, return it as-is
- Output ONLY the rewritten query, nothing else

### Conversation History:
{history_str}

### New User Question:
{query}

### Rewritten Query:"""

        try:
            rewritten = self.generate(prompt)
            # Clean up: remove quotes, extra whitespace
            rewritten = rewritten.strip().strip('"').strip("'").strip()
            if rewritten:
                logger.info(f"Query rewritten: '{query}' → '{rewritten}'")
                return rewritten
            return query
        except Exception as e:
            logger.warning(f"Query rewriting failed, using original: {e}")
            return query

    def detect_gender(self, history: list[dict]) -> str:
        """
        Detect the gender of the pharaoh currently being discussed in the conversation.
        
        Args:
            history: Conversation messages [{"role": ..., "content": ...}].
            
        Returns:
            "male" or "female".
        """
        if not history:
            return "female"

        # Use last 4 messages for context
        recent = history[-4:]
        lines = []
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Pharaoh"
            lines.append(f"{role}: {msg['content']}")
        context = "\n".join(lines)

        prompt = f"""Based on this conversation, determine the gender of the Pharaoh currently speaking.

{context}

Reply with ONLY one word: "male" or "female". Nothing else."""

        try:
            result = self.generate(prompt).strip().lower()
            print("result: ", result)
            if "male" in result and "female" not in result:
                return "male"
            elif "female" in result:
                return "female"
            return "male"  # default for most pharaohs
        except Exception as e:
            logger.warning(f"Gender detection failed: {e}")
            return "female"

    def generate_with_context(
        self, 
        query: str, 
        context: str,
        image_descriptions: list[str] | None = None,
        system_instruction: str | None = None,
        history: list[dict] | None = None,
    ) -> str:
        """
        Generate answer based on query, context, optional images, and conversation history.
        
        Args:
            query: User's question
            context: Retrieved context documents
            image_descriptions: Optional list of image descriptions
            system_instruction: Optional system instruction override
            history: Optional list of past messages [{"role": ..., "content": ...}]
            
        Returns:
            Generated answer
        """
        image_context_str = ""
        if image_descriptions:
            image_context_str = "\n\n### User Image Context:\n" + "\n".join(image_descriptions)

        history_str = ""
        if history:
            lines = []
            for msg in history:
                role_label = "User" if msg["role"] == "user" else "Pharaoh"
                lines.append(f"{role_label}: {msg['content']}")
            history_str = "\n".join(lines)

        history_block = ""
        if history_str:
            history_block = f"""\n### Conversation History:\n{history_str}\n"""

        prompt = f"""You are an ancient Egyptian Pharaoh speaking to a visitor.
You are NOT an assistant. You are the King or Queen themselves.

### IDENTITY RULES:
1. **If an 'Image Description' is provided below**, adopt the identity of the Pharaoh described in it.
2. **If no 'Image Description' is provided**, determine your identity from the 'User Question' and 'Retrieved Context'. Speak as whichever Pharaoh the user is currently asking about.
3. **Switching Pharaohs:** If the user was previously asking about one Pharaoh and now asks about a different one, you MUST switch your persona immediately. Speak as the NEW Pharaoh. Do NOT continue as the previous one.
4. **Conversation History:** The history may contain previous exchanges where you spoke as a different Pharaoh. That is expected. Always speak as the Pharaoh relevant to the CURRENT question.

### STRICT GUARDRAILS:
1. **Context-Driven Only:** You must answer the user's question using **ONLY** the information provided in the 'Retrieved Context' and 'Image Description'.
2. **No Outside Knowledge:** Do not use any external historical knowledge, facts, or assumptions. If the information is not in the context, do not use it.
3. **Refusal:** If the answer is not found in the 'Retrieved Context' or 'Image Description', you MUST respond with: "The chronicles do not record this specific detail."
4. **Conciseness:** You MUST be concise. Summarize the information to reduce response length. Avoid unnecessary words.

### ROLE & PERSONA:
1. **First Person:** You must convert all information from the 'Retrieved Context' into the first person ("I", "My").
2. **Tone:** Speak with dignity and authority.

### LANGUAGE:
- Answer **strictly** in the same language as the 'User Question'.

### Image Description (Identity Hint):
{image_context_str}

### Retrieved Context (Your Chronicles):
{context}
{history_block}
### User Question:
{query}

### Answer:"""
        
        return self.generate(prompt)
