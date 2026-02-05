"""Factory for instantiating LLM providers."""

import logging
import os

from app.core.providers import (
    BaseProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
)

logger = logging.getLogger(__name__)


def get_provider() -> BaseProvider:
    """Factory function to get the configured LLM provider.

    Returns:
        An instance of a class that inherits from BaseProvider.
    """
    provider_type = os.getenv("LLM_PROVIDER", "gemini").lower()
    logger.info(f"Initializing LLM provider: {provider_type}")

    if provider_type == "ollama":
        host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        model = os.getenv("OLLAMA_MODEL", "qwen3:8b")
        logger.debug(f"Ollama config: host={host}, model={model}")
        return OllamaProvider(host=host, model=model)
    elif provider_type == "gemini":
        api_key = os.getenv("GEMINI_API_KEY", "")
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        logger.debug(f"Gemini config: model={model}")
        return GeminiProvider(api_key=api_key, model=model)
    elif provider_type == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        logger.debug(f"OpenAI config: model={model}")
        return OpenAIProvider(api_key=api_key, model=model)
    else:
        logger.error(f"Unsupported LLM provider requested: {provider_type}")
        raise ValueError(f"Unsupported LLM provider: {provider_type}")
