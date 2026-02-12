"""
Image Generation Service
========================
- GPT4All for prompt engineering
- Stable Diffusion for image generation
- GPU/CPU safe
- Memory optimized
"""

import logging
import base64
import io
import traceback
from typing import List, Optional

import torch
from PIL import Image

from app.config import Settings

try:
    from gpt4all import GPT4All
except ImportError:
    GPT4All = None

try:
    from diffusers import StableDiffusionPipeline
except ImportError:
    StableDiffusionPipeline = None


logger = logging.getLogger(__name__)


class ImageGenerationService:
    _instance = None  # singleton to avoid reloading models

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ImageGenerationService, cls).__new__(cls)
        return cls._instance

    def __init__(self, settings: Settings):
        if hasattr(self, "_initialized_once"):
            return  # prevent re-init in FastAPI

        self.settings = settings
        self.llm_model = None
        self.sd_pipeline = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialized_once = True

    # ----------------------------
    # INIT MODELS
    # ----------------------------
    def initialize(self):
        if self.llm_model and self.sd_pipeline:
            return

        logger.info(f"Initializing Image Service on device: {self.device}")

        self._load_llm()
        self._load_stable_diffusion()

    def _load_llm(self):
        if GPT4All is None:
            logger.warning("GPT4All not installed. Using fallback prompts.")
            return

        try:
            logger.info("Loading GPT4All model...")
            self.llm_model = GPT4All(
                "Orca-2-7b.Q4_0.gguf",
                device="cuda" if self.device == "cuda" else "cpu"
            )
            logger.info("GPT4All loaded successfully.")
        except Exception:
            logger.error("Failed to load GPT4All:\n" + traceback.format_exc())
            self.llm_model = None

    def _load_stable_diffusion(self):
        if StableDiffusionPipeline is None:
            logger.error("diffusers not installed.")
            return

        try:
            logger.info("Loading Stable Diffusion model...")

            model_id = "runwayml/stable-diffusion-v1-5"
            dtype = torch.float16 if self.device == "cuda" else torch.float32

            pipe = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=dtype,
                safety_checker=None,
                requires_safety_checker=False
            )

            pipe = pipe.to(self.device)

            # 🔥 Memory optimizations
            pipe.enable_attention_slicing()
            if self.device == "cuda":
                try:
                    pipe.enable_xformers_memory_efficient_attention()
                except Exception:
                    logger.warning("xformers not available")

            if self.device == "cpu":
                pipe.enable_model_cpu_offload()

            self.sd_pipeline = pipe
            logger.info("Stable Diffusion loaded successfully.")

        except Exception:
            logger.error("Failed to load Stable Diffusion:\n" + traceback.format_exc())
            self.sd_pipeline = None

    # ----------------------------
    # PROMPT GENERATION
    # ----------------------------
    def generate_prompt_from_context(self, history: List[dict]) -> str:
        self.initialize()

        if not self.llm_model:
            return "cinematic ancient egypt scene, ultra detailed, 4k, dramatic lighting"

        recent = history[-6:]
        context = "\n".join(
            f"{msg.get('role', 'user')}: {msg.get('content')}" for msg in recent
        )

        system_prompt = (
            "You are an expert Stable Diffusion prompt engineer. "
            "Create a vivid, cinematic visual prompt from the conversation. "
            "Focus on style, lighting, environment, characters, and mood. "
            "Return ONLY the prompt."
        )

        try:
            prompt = self.llm_model.generate(
                f"{system_prompt}\n\nConversation:\n{context}\n\nPrompt:",
                max_tokens=120
            )
            return prompt.strip().replace('"', "")
        except Exception:
            logger.error("GPT4All prompt generation failed:\n" + traceback.format_exc())
            return "cinematic ancient egypt, hyperrealistic, 8k, dramatic lighting"

    # ----------------------------
    # IMAGE GENERATION
    # ----------------------------
    def generate_image(self, prompt: str) -> Optional[str]:
        self.initialize()

        if not self.sd_pipeline:
            logger.error("Stable Diffusion pipeline not available.")
            return None

        try:
            logger.info(f"Generating image with prompt: {prompt}")

            image: Image.Image = self.sd_pipeline(
                prompt=prompt,
                num_inference_steps=20,  # lower = faster & safer
                guidance_scale=7.0
            ).images[0]

            buffered = io.BytesIO()
            image.save(buffered, format="PNG")

            return base64.b64encode(buffered.getvalue()).decode()

        except torch.cuda.OutOfMemoryError:
            logger.error("CUDA OOM - GPU memory exceeded")
            return None
        except Exception:
            logger.error("Stable Diffusion generation failed:\n" + traceback.format_exc())
            return None