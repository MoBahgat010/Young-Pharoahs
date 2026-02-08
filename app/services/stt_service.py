"""
STT Service Module
==================
Speech-to-text service using Deepgram.
"""

import logging
from typing import Optional

import requests

from app.config import Settings

logger = logging.getLogger(__name__)


class STTService:
    """Service for speech-to-text using Deepgram."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def _require_key(self) -> str:
        if not self.settings.deepgram_api_key:
            raise RuntimeError("DEEPGRAM_KEY is required for STT")
        return self.settings.deepgram_api_key

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        mimetype: Optional[str] = None,
        model: Optional[str] = None,
    ) -> str:
        """
        Transcribe audio bytes to text using Deepgram.

        Args:
            audio_bytes: Raw audio bytes
            mimetype: MIME type of the audio (e.g., 'audio/wav')
            model: Deepgram STT model override

        Returns:
            Transcribed text
        """
        api_key = self._require_key()
        stt_model = model or self.settings.deepgram_stt_model

        url = f"https://api.deepgram.com/v1/listen?model={stt_model}&punctuate=true"
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": mimetype or "application/octet-stream",
        }

        logger.info("Sending audio to Deepgram STT")
        response = requests.post(url, headers=headers, data=audio_bytes, timeout=120)

        if response.status_code >= 400:
            logger.error("Deepgram STT failed: %s", response.text)
            raise RuntimeError(f"Deepgram STT failed: {response.text}")

        data = response.json()
        try:
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
        except (KeyError, IndexError) as exc:
            logger.error("Invalid Deepgram STT response: %s", data)
            raise RuntimeError("Invalid Deepgram STT response") from exc

        if not transcript:
            raise RuntimeError("Deepgram STT returned empty transcript")

        logger.info("STT transcription completed")
        return transcript
