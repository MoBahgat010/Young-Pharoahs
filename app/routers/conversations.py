"""
Conversations Router
====================
Endpoints for managing conversation sessions.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.routers.query import ServiceContainer, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post(
    "/",
    summary="Create a new conversation",
    description="Start a new conversation session and return its ID.",
)
async def create_conversation(
    services: ServiceContainer = Depends(get_services),
):
    if not services.conversation_service:
        raise HTTPException(status_code=500, detail="Conversation service not initialized")

    conversation_id = await services.conversation_service.create_conversation()
    return {"conversation_id": conversation_id}


@router.get(
    "/",
    summary="List recent conversations",
    description="List recent conversation sessions (metadata only).",
)
async def list_conversations(
    limit: int = 20,
    services: ServiceContainer = Depends(get_services),
):
    if not services.conversation_service:
        raise HTTPException(status_code=500, detail="Conversation service not initialized")

    conversations = await services.conversation_service.list_conversations(limit=limit)
    return {"conversations": conversations}


@router.get(
    "/{conversation_id}",
    summary="Get conversation history",
    description="Retrieve the full message history for a conversation.",
)
async def get_conversation(
    conversation_id: str,
    services: ServiceContainer = Depends(get_services),
):
    if not services.conversation_service:
        raise HTTPException(status_code=500, detail="Conversation service not initialized")

    conversation = await services.conversation_service.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation


@router.delete(
    "/{conversation_id}",
    summary="Delete a conversation",
    description="Permanently delete a conversation and its history.",
)
async def delete_conversation(
    conversation_id: str,
    services: ServiceContainer = Depends(get_services),
):
    if not services.conversation_service:
        raise HTTPException(status_code=500, detail="Conversation service not initialized")

    deleted = await services.conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"detail": "Conversation deleted"}
