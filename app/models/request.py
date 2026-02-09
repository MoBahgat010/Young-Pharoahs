"""
Request Models
==============
Pydantic models for API request validation.
"""

from typing import Optional
from pydantic import BaseModel, Field, validator


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The query text"
    )
    
    top_k: Optional[int] = Field(
        None,
        ge=1,
        le=20,
        description="Number of results to retrieve (1-20)"
    )
    
    @validator('prompt')
    def prompt_not_empty(cls, v):
        """Validate prompt is not just whitespace."""
        if not v.strip():
            raise ValueError("Prompt cannot be empty or just whitespace")
        return v.strip()
    
    image_descriptions: Optional[list[str]] = Field(
        None,
        description="Optional list of image descriptions"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Tell me about Ramses II",
                "top_k": 5,
                "image_descriptions": ["A statue of Ramses II"]
            }
        }
