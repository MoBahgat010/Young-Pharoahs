"""
TTS Service Module
==================
Text-to-speech using ElevenLabs and Deepgram.
"""

import logging
from typing import Optional

import requests

from app.config import Settings

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech with multiple providers."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def _require_elevenlabs_key(self) -> str:
        if not self.settings.elevenlabs_api_key:
            raise RuntimeError("ELEVENLABS is required for ElevenLabs TTS")
        return self.settings.elevenlabs_api_key

    def _require_deepgram_key(self) -> str:
        if not self.settings.deepgram_api_key:
            raise RuntimeError("DEEPGRAM_KEY is required for Deepgram TTS")
        return self.settings.deepgram_api_key

    def tts_elevenlabs(
        self,
        text: str,
        voice: Optional[str] = None,
        model: Optional[str] = None,
    ) -> bytes:
        """
        Generate speech using ElevenLabs.

        Args:
            text: Text to synthesize
            voice: Voice id or 'female'/'male'
            model: ElevenLabs model id (default from settings)

        Returns:
            Audio bytes (mp3)
        """
        api_key = self._require_elevenlabs_key()
        model_id = model or self.settings.elevenlabs_default_model

        voice_id = voice
        logger.debug("Selected ElevenLabs voice: %s", voice_id)
        if voice_id in (None, "female", "male"):
            if voice_id == "male":
                voice_id = self.settings.elevenlabs_voice_male or self.settings.elevenlabs_voice_female
            else:
                print("fdsfdsfds")
                voice_id = self.settings.elevenlabs_voice_female or self.settings.elevenlabs_voice_male

        if not voice_id:
            raise RuntimeError("ElevenLabs voice ID is required")

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": api_key,
            "accept": "audio/mpeg",
            "content-type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": model_id,
        }

        logger.info("Sending text to ElevenLabs TTS")
        response = requests.post(url, headers=headers, json=payload, timeout=120)

        if response.status_code >= 400:
            logger.error("ElevenLabs TTS failed: %s", response.text)
            raise RuntimeError(f"ElevenLabs TTS failed: {response.text}")

        return response.content

    def tts_deepgram(
        self,
        text: str,
        model: Optional[str] = None,
    ) -> bytes:
        """
        Generate speech using Deepgram.

        Args:
            text: Text to synthesize
            model: Deepgram TTS model override

        Returns:
            Audio bytes (mp3)
        """
        api_key = self._require_deepgram_key()
        tts_model = model or self.settings.deepgram_tts_model

        url = f"https://api.deepgram.com/v1/speak?model={tts_model}"
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text,
        }

        logger.info("Sending text to Deepgram TTS")
        response = requests.post(url, headers=headers, json=payload, timeout=120)

        if response.status_code >= 400:
            logger.error("Deepgram TTS failed: %s", response.text)
            raise RuntimeError(f"Deepgram TTS failed: {response.text}")

        return response.content

    def synthesize(
        self,
        text: str,
        provider: Optional[str] = None,
        voice: Optional[str] = None,
        model: Optional[str] = None,
    ) -> bytes:
        """
        Main TTS function that dispatches to a provider.

        Args:
            text: Text to synthesize
            provider: Provider name ('elevenlabs' or 'deepgram')
            voice: Voice preference (for ElevenLabs)
            model: Model override

        Returns:
            Audio bytes
        """
        selected_provider = (provider or self.settings.tts_provider).lower()

        if selected_provider == "elevenlabs":
            return self.tts_elevenlabs(text=text, voice=voice, model=model)
        if selected_provider == "deepgram":
            return self.tts_deepgram(text=text, model=model)

        raise ValueError(f"Unsupported TTS provider: {selected_provider}")
