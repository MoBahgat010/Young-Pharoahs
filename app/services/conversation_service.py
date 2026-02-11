"""
Conversation Service Module
=============================
Manages conversation history in MongoDB for multi-turn dialogue.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import Settings
from app.services.database import DatabaseService

logger = logging.getLogger(__name__)

COLLECTION_NAME = "conversations"


class ConversationService:
    """Service for managing conversation history in MongoDB."""

    def __init__(self, settings: Settings, db_service: DatabaseService):
        self.settings = settings
        self.db_service = db_service

    @property
    def collection(self):
        return self.db_service.get_collection(COLLECTION_NAME)

    async def create_conversation(self) -> str:
        """
        Create a new conversation and return its ID.

        Returns:
            The generated conversation_id (UUID string).
        """
        conversation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        doc = {
            "conversation_id": conversation_id,
            "created_at": now,
            "updated_at": now,
            "messages": [],
        }

        await self.collection.insert_one(doc)
        logger.info("Created conversation: %s", conversation_id)
        return conversation_id

    async def get_history(
        self, conversation_id: str, limit: int = 10
    ) -> list[dict]:
        """
        Fetch the last N messages for a conversation.

        Args:
            conversation_id: The conversation UUID.
            limit: Max number of messages to return (most recent).

        Returns:
            List of message dicts with 'role' and 'content'.
        """
        doc = await self.collection.find_one(
            {"conversation_id": conversation_id},
            {"messages": {"$slice": -limit}},
        )

        if doc is None:
            return []

        return doc.get("messages", [])

    async def add_message(
        self, conversation_id: str, role: str, content: str
    ) -> None:
        """
        Append a message to the conversation.

        Args:
            conversation_id: The conversation UUID.
            role: 'user' or 'assistant'.
            content: The message text.
        """
        now = datetime.now(timezone.utc)

        result = await self.collection.update_one(
            {"conversation_id": conversation_id},
            {
                "$push": {
                    "messages": {
                        "role": role,
                        "content": content,
                        "timestamp": now,
                    }
                },
                "$set": {"updated_at": now},
            },
        )

        if result.matched_count == 0:
            logger.warning(
                "Conversation %s not found when adding message", conversation_id
            )

    async def get_conversation(self, conversation_id: str) -> Optional[dict]:
        """
        Fetch the full conversation document.

        Returns:
            The conversation dict or None.
        """
        doc = await self.collection.find_one(
            {"conversation_id": conversation_id}, {"_id": 0}
        )
        return doc

    async def list_conversations(self, limit: int = 20) -> list[dict]:
        """
        List recent conversations (metadata only, no messages).

        Returns:
            List of conversation summary dicts.
        """
        cursor = self.collection.find(
            {},
            {"_id": 0, "conversation_id": 1, "created_at": 1, "updated_at": 1},
        ).sort("updated_at", -1).limit(limit)

        return await cursor.to_list(length=limit)

    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation by its ID.

        Returns:
            True if deleted, False if not found.
        """
        result = await self.collection.delete_one(
            {"conversation_id": conversation_id}
        )
        return result.deleted_count > 0
