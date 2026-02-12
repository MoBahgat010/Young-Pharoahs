"""
Image Generation Service
========================
Uses GPT4All for prompt engineering and Stable Diffusion for image generation.
"""

import logging
import base64
import io
import torch
from typing import List, Optional

from app.config import Settings

# Lazy imports to avoid heavy load on startup if not used
try:
    from gpt4all import GPT4All
    from diffusers import StableDiffusionPipeline
except ImportError:
    GPT4All = None
    StableDiffusionPipeline = None

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for AI image generation."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.llm_model = None
        self.sd_pipeline = None
        self._initialized = False

    def _initialize(self) -> None:
        """Load models into memory. This is heavy!"""
        if self._initialized:
            return

        if GPT4All is None or StableDiffusionPipeline is None:
            logger.error("Required packages (gpt4all, diffusers) not installed.")
            return

        try:
            # 1. Initialize GPT4All (lightweight LLM)
            # Ensure the model file exists or it will download (approx 3GB)
            logger.info("Loading GPT4All model...")
            self.llm_model = GPT4All("Orca-2-7b.Q4_0.gguf") # Example model

            # 2. Initialize Stable Diffusion
            logger.info("Loading Stable Diffusion pipeline...")
            model_id = "runwayml/stable-diffusion-v1-5"
            
            # Check for CUDA
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")

            self.sd_pipeline = StableDiffusionPipeline.from_pretrained(
                model_id, 
                torch_dtype=torch.float16 if device == "cuda" else torch.float32
            )
            self.sd_pipeline = self.sd_pipeline.to(device)
            
            # Enable memory optimizations if on CUDA
            if device == "cuda":
                self.sd_pipeline.enable_attention_slicing()

            self._initialized = True
            logger.info("Image Generation Service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Image Generation Service: {e}")
            self._initialized = False

    def generate_prompt_from_context(self, history: List[dict]) -> str:
        """
        Use GPT4All to summarize conversation context into a visual prompt.
        """
        self._initialize()
        if not self.llm_model:
            return "A photo of an ancient Egyptian scene"

        # Format history logic
        # Take last 3 exchanges to keep context focused
        recent = history[-6:] 
        context_str = ""
        for msg in recent:
            role = "User" if msg.get("role") == "user" else "Pharaoh"
            context_str += f"{role}: {msg.get('content')}\n"

        system_prompt = (
            "You are an expert AI prompt engineer for Stable Diffusion. "
            "Read the conversation below and generate a detailed, descriptive visual prompt "
            "that captures the scene, characters, and atmosphere discussed. "
            "Focus on visual details like lighting, clothing, background, and style. "
            "Output ONLY the prompt, nothing else."
        )

        full_prompt = f"{system_prompt}\n\nConversation:\n{context_str}\n\nVisual Prompt:"
        
        # Generate
        try:
            # limit max tokens to avoid long rambling
            gen_prompt = self.llm_model.generate(full_prompt, max_tokens=100)
            clean_prompt = gen_prompt.strip().replace('"', '')
            logger.info(f"Generated Image Prompt: {clean_prompt}")
            return clean_prompt
        except Exception as e:
            logger.error(f"GPT4All generation failed: {e}")
            return "ancient egypt hyperrealistic 8k"

    def generate_image(self, prompt: str) -> Optional[str]:
        """
        Generate image using Stable Diffusion and return Base64 string.
        """
        self._initialize()
        if not self.sd_pipeline:
            logger.error("Stable Diffusion pipeline not available")
            return None

        try:
            # Generate
            image = self.sd_pipeline(
                prompt, 
                num_inference_steps=25, # Balance between speed and quality
                guidance_scale=7.5
            ).images[0]

            # Convert to base64
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            return img_str
        except Exception as e:
            logger.error(f"Stable Diffusion generation failed: {e}")
            return None
