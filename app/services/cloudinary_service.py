"""
Cloudinary Service Module
=========================
Handles image uploads to Cloudinary.
"""

import logging
import asyncio
from typing import List

import cloudinary
import cloudinary.uploader
from PIL import Image
import io

from app.config import Settings

logger = logging.getLogger(__name__)


class CloudinaryService:
    """Service for interacting with Cloudinary."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._initialized = False

    def _initialize(self) -> None:
        """Initialize Cloudinary configuration."""
        if self._initialized:
            return

        if not all([
            self.settings.cloudinary_cloud_name,
            self.settings.cloudinary_api_key,
            self.settings.cloudinary_api_secret
        ]):
            logger.warning("Cloudinary credentials not provided. Image upload will be disabled.")
            return

        cloudinary.config(
            cloud_name=self.settings.cloudinary_cloud_name,
            api_key=self.settings.cloudinary_api_key,
            api_secret=self.settings.cloudinary_api_secret,
            secure=True
        )
        self._initialized = True
        logger.info("Cloudinary service initialized")

    def upload_image(self, image: Image.Image, folder: str = "pharaohs_chat") -> str | None:
        """
        Upload a PIL Image to Cloudinary.

        Args:
            image: PIL Image object.
            folder: Cloudinary folder name.

        Returns:
            Secure URL of the uploaded image, or None if upload fails/not configured.
        """
        self._initialize()
        if not self._initialized:
            return None

        try:
            # Convert PIL Image to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format=image.format or "JPEG")
            img_byte_arr.seek(0)

            response = cloudinary.uploader.upload(
                img_byte_arr,
                folder=folder,
                resource_type="image"
            )
            return response.get("secure_url")
        except Exception as e:
            logger.error(f"Failed to upload image to Cloudinary: {e}")
            return None

    async def upload_images_batch(self, images: List[Image.Image]) -> List[str]:
        """
        Upload multiple images in parallel.

        Args:
            images: List of PIL Image objects.

        Returns:
            List of secure URLs (filtering out Nones).
        """
        if not images:
            return []

        # Run uploads in threads since cloudinary.uploader is synchronous
        loop = asyncio.get_running_loop()
        tasks = [
            loop.run_in_executor(None, self.upload_image, img)
            for img in images
        ]
        
        results = await asyncio.gather(*tasks)
        # Filter out failed uploads
        return [url for url in results if url is not None]
