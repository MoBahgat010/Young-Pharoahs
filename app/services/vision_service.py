"""
Vision Service Module
======================
Handles image processing and description using Google Gemini Vision API.
"""

import logging
import asyncio
from typing import List

import PIL.Image
import google.generativeai as genai

from app.config import Settings

logger = logging.getLogger(__name__)


class VisionService:
    """Service for processing images with Gemini Vision model."""
    
    def __init__(self, settings: Settings):
        """
        Initialize the vision service.
        
        Args:
            settings: Application settings instance
        """
        self.settings = settings
        self.model: genai.GenerativeModel | None = None
    
    def initialize(self) -> None:
        """Initialize the Gemini Vision model."""
        if self.model is not None:
            logger.info("Vision model already initialized")
            return
        
        logger.info(f"Initializing Gemini Vision model: {self.settings.gemini_vision_model}")
        
        try:
            genai.configure(api_key=self.settings.gemini_api_key)
            self.model = genai.GenerativeModel(self.settings.gemini_vision_model)
            logger.info("Vision model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize vision model: {e}")
            raise RuntimeError(f"Could not initialize vision model: {e}") from e
    
    def get_model(self) -> genai.GenerativeModel:
        """
        Get the initialized vision model.
        
        Returns:
            GenerativeModel instance
            
        Raises:
            RuntimeError: If model is not initialized
        """
        if self.model is None:
            raise RuntimeError("Vision model not initialized. Call initialize() first.")
        return self.model
    
    async def describe_image_async(self, image: PIL.Image.Image, prompt: str | None = None) -> str:
        """
        Generate description for a single image asynchronously.
        
        Args:
            image: PIL Image to describe
            prompt: Optional custom prompt (uses default if None)
            
        Returns:
            Description text
            
        Raises:
            RuntimeError: If description generation fails
        """
        model = self.get_model()
        vision_prompt = prompt or self.settings.vision_prompt
        
        try:
            # Run synchronous Gemini API call in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content([vision_prompt, image])
            )
            description = response.text.strip()
            logger.debug(f"Image description generated: {description[:100]}...")
            return description
        except Exception as e:
            logger.error(f"Failed to describe image: {e}")
            raise RuntimeError(f"Image description failed: {e}") from e
    
    def describe_image(self, image: PIL.Image.Image, prompt: str | None = None) -> str:
        """
        Generate description for a single image synchronously.
        
        Args:
            image: PIL Image to describe
            prompt: Optional custom prompt (uses default if None)
            
        Returns:
            Description text
        """
        model = self.get_model()
        vision_prompt = prompt or self.settings.vision_prompt
        
        try:
            response = model.generate_content([vision_prompt, image])
            description = response.text.strip()
            logger.debug(f"Image description generated: {description[:100]}...")
            return description
        except Exception as e:
            logger.error(f"Failed to describe image: {e}")
            raise RuntimeError(f"Image description failed: {e}") from e
    
    async def describe_images_batch(
        self, 
        images: List[PIL.Image.Image], 
        prompt: str | None = None
    ) -> List[str]:
        """
        Generate descriptions for multiple images in parallel.
        
        Args:
            images: List of PIL Images to describe
            prompt: Optional custom prompt for all images
            
        Returns:
            List of description texts (same order as input)
        """
        if not images:
            return []
        
        logger.info(f"Processing {len(images)} images in parallel")
        
        # Create tasks for parallel processing
        tasks = [
            self.describe_image_async(img, prompt)
            for img in images
        ]
        
        # Execute all tasks concurrently
        try:
            descriptions = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle any errors in results
            results = []
            for i, desc in enumerate(descriptions):
                if isinstance(desc, Exception):
                    error_msg = f"[Image {i+1} processing failed: {desc}]"
                    logger.warning(error_msg)
                    results.append(error_msg)
                else:
                    results.append(desc)
            
            return results
        except Exception as e:
            logger.error(f"Batch image processing failed: {e}")
            raise RuntimeError(f"Batch processing failed: {e}") from e
