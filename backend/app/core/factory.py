"""Factory for instantiating LLM providers."""

import logging

from app.core.providers import (
    BaseProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
)

logger = logging.getLogger(__name__)


from app.core.config import settings


def get_provider() -> BaseProvider:
    """Factory function to get the configured LLM provider.

    Returns:
        An instance of a class that inherits from BaseProvider.
    """
    provider_type = settings.LLM_PROVIDER.lower()
    logger.info(f"Initializing LLM provider: {provider_type}")

    if provider_type == "ollama":
        host = settings.OLLAMA_HOST
        model = settings.OLLAMA_MODEL
        logger.debug(f"Ollama config: host={host}, model={model}")
        return OllamaProvider(host=host, model=model)
    elif provider_type == "gemini":
        api_key = settings.GEMINI_API_KEY
        model = settings.GEMINI_MODEL
        logger.debug(f"Gemini config: model={model}")
        return GeminiProvider(api_key=api_key, model=model)
    elif provider_type == "openai":
        api_key = settings.OPENAI_API_KEY
        model = settings.OPENAI_MODEL
        logger.debug(f"OpenAI config: model={model}")
        return OpenAIProvider(api_key=api_key, model=model)
    else:
        logger.error(f"Unsupported LLM provider requested: {provider_type}")
        raise ValueError(f"Unsupported LLM provider: {provider_type}")
