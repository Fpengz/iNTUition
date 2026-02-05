"""Factory for instantiating LLM providers."""

import os

from app.core.providers import (
    BaseProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
)


def get_provider() -> BaseProvider:
    """Instantiates a provider based on environment variables."""
    provider_type = os.getenv("LLM_PROVIDER", "ollama").lower()

    if provider_type == "ollama":
        return OllamaProvider(
            host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "qwen3:8b")
        )
    elif provider_type == "gemini":
        return GeminiProvider(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        )
    elif provider_type == "openai":
        return OpenAIProvider(
            api_key=os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("OPENAI_MODEL", "gpt-4o")
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider_type}")
