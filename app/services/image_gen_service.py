"""
Image Generation Service
========================
- Mistral 7B Q4 (GPT4All) for prompt engineering
- SD-Turbo for fast image generation
- FastAPI-safe singleton
- GPU/CPU fallback
"""

import logging
import base64
import io
import traceback
from typing import List, Optional

import torch
from PIL import Image
from diffusers import AutoPipelineForText2Image

try:
    from gpt4all import GPT4All
except ImportError:
    GPT4All = None

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """
    Singleton Image Generation Service
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ImageGenerationService, cls).__new__(cls)
        return cls._instance

    def __init__(self, settings=None):
        # prevent re-init in FastAPI lifespan
        if getattr(self, "_initialized", False):
            return

        self.settings = settings
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32

        self.llm_model = None
        self.pipe = None

        self._initialized = True

    # ---------------- INITIALIZATION ---------------- #

    def initialize(self):
        if self.llm_model is not None and self.pipe is not None:
            return

        logger.info(f"🚀 Initializing ImageGenerationService on {self.device}")

        self._load_llm()
        self._load_diffusion()

    def _load_llm(self):
        if GPT4All is None:
            logger.error("❌ GPT4All not installed")
            return

        try:
            model_name = "mistral-7b-instruct-v0.1.Q4_0.gguf"

            self.llm_model = GPT4All(
                model_name,
                allow_download=True,  # auto-download model
                device="cuda" if self.device == "cuda" else "cpu",
            )

            logger.info("✅ Mistral 7B Q4 loaded successfully")

        except Exception:
            logger.error("❌ Failed to load Mistral 7B:\n" + traceback.format_exc())
            self.llm_model = None

    def _load_diffusion(self):
        try:
            model_id = "stabilityai/sd-turbo"

            self.pipe = AutoPipelineForText2Image.from_pretrained(
                model_id,
                torch_dtype=self.dtype,
                variant="fp16" if self.device == "cuda" else None,
            ).to(self.device)

            if self.device == "cuda":
                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                except Exception:
                    logger.warning("xformers not available")

            logger.info("✅ SD-Turbo loaded successfully")

        except Exception:
            logger.error("❌ Failed to load SD-Turbo:\n" + traceback.format_exc())
            self.pipe = None

    # ---------------- PROMPT GENERATION ---------------- #

    def generate_prompt_from_context(self, history: List[dict]) -> str:
        self.initialize()

        if not self.llm_model:
            logger.warning("⚠️ LLM not loaded, using fallback prompt")
            return "cinematic, ultra realistic, dramatic lighting, 8k, detailed"

        context = "\n".join(
            f"{m.get('role', 'user')}: {m.get('content')}" for m in history[-6:]
        )

        system_prompt = (
            "You are an expert Stable Diffusion prompt engineer. "
            "Generate a cinematic, photorealistic visual prompt from the conversation. "
            "Focus on lighting, style, composition, and details. "
            "Return ONLY the prompt."
        )

        try:
            prompt = self.llm_model.generate(
                f"{system_prompt}\n\nConversation:\n{context}\n\nPrompt:",
                max_tokens=120,
                temp=0.7,
            )
            return prompt.strip().replace('"', "")

        except Exception:
            logger.error("❌ Prompt generation failed:\n" + traceback.format_exc())
            return "cinematic, ultra realistic, dramatic lighting, 8k, detailed"

    # ---------------- IMAGE GENERATION ---------------- #

    def generate_image(self, prompt: str) -> Optional[str]:
        self.initialize()

        if not self.pipe:
            logger.error("❌ Diffusion pipeline not available")
            return None

        try:
            logger.info(f"🎨 Generating image with prompt: {prompt}")

            result = self.pipe(
                prompt,
                num_inference_steps=1,   # SD-Turbo speed
                guidance_scale=0.0,
            )

            image: Image.Image = result.images[0]

            buf = io.BytesIO()
            image.save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()

        except torch.cuda.OutOfMemoryError:
            logger.error("💥 CUDA OOM - GPU memory exceeded")
            return None
        except Exception:
            logger.error("❌ Image generation failed:\n" + traceback.format_exc())
            return None