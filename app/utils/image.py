"""
Image Utilities
===============
Helper functions for image processing and conversion.
"""

import io
import logging
from typing import List

import PIL.Image
from fastapi import UploadFile

logger = logging.getLogger(__name__)


async def upload_files_to_pil_images(files: List[UploadFile]) -> List[PIL.Image.Image]:
    """
    Convert uploaded files to PIL Images.
    
    Args:
        files: List of uploaded image files
        
    Returns:
        List of PIL Image objects
        
    Raises:
        ValueError: If file cannot be converted to image
    """
    images = []
    
    for i, file in enumerate(files):
        try:
            # Read file content
            content = await file.read()
            
            # Convert to PIL Image
            image = PIL.Image.open(io.BytesIO(content))
            images.append(image)
            
            logger.debug(f"Converted file {i+1} to PIL Image: {image.size}")
        except Exception as e:
            logger.error(f"Failed to convert file {i+1} to image: {e}")
            raise ValueError(f"File {i+1} is not a valid image: {e}") from e
    
    return images


def validate_image_count(count: int, max_count: int) -> None:
    """
    Validate number of uploaded images.
    
    Args:
        count: Number of images
        max_count: Maximum allowed images
        
    Raises:
        ValueError: If count exceeds maximum
    """
    if count > max_count:
        raise ValueError(f"Maximum {max_count} images allowed, got {count}")
