"""Module for Text-to-Speech synthesis using gTTS."""

import hashlib
import logging  # Import logging
from io import BytesIO

from app.core.cache import explanation_cache
from app.core.config import settings
from gtts import gTTS

logger = logging.getLogger(__name__)  # Get logger


class AuraTTS:
    """Handles text-to-speech synthesis and caching."""

    @staticmethod
    def _get_cache_key(text: str) -> str:
        """Generates a stable cache key for a given text."""
        return f"tts_{hashlib.md5(text.encode()).hexdigest()}"

    def synthesize_speech(self, text: str) -> bytes:
        """Synthesizes speech from text, using a cache to avoid re-generation.

        Args:
            text: The text to convert to speech.

        Returns:
            The synthesized speech as MP3 audio bytes.
        """
        logger.info(f"Synthesizing speech for text (len: {len(text)})")
        cache_key = self._get_cache_key(text)
        cached_audio = explanation_cache.get(cache_key)

        if cached_audio and isinstance(cached_audio, bytes):
            logger.info(f"TTS Cache HIT for text hash: {cache_key}")
            return cached_audio

        logger.info(f"TTS Cache MISS for text hash: {cache_key} | Generating audio...")
        # Create an in-memory file-like object
        mp3_fp = BytesIO()

        # Create gTTS object and write to the in-memory file
        try:
            tts = gTTS(text=text, lang=settings.TTS_LANG)
            tts.write_to_fp(mp3_fp)
            logger.debug(f"gTTS generation successful for {cache_key}")
        except Exception as e:
            # Handle potential gTTS errors (e.g., network issues)
            logger.error(f"Error during TTS synthesis for {cache_key}: {e}", exc_info=True)
            raise e

        # Get the bytes from the in-memory file
        audio_bytes = mp3_fp.getvalue()
        explanation_cache.set(cache_key, audio_bytes)
        logger.info(f"TTS audio generated and cached: {cache_key} | Bytes: {len(audio_bytes)}")

        return audio_bytes
