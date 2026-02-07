import importlib
from unittest.mock import patch

import pytest

import app.core.factory
from app.core.config import settings
from app.core.providers import GeminiProvider, OllamaProvider, OpenAIProvider


@pytest.fixture
def real_factory():
    # Reload the module to get the real function, bypassing the global patch
    importlib.reload(app.core.factory)
    yield app.core.factory
    # We don't necessarily need to re-patch it back as other tests should handle their own mocks
    # but conftest.py's patch is session-wide.

def test_get_provider_gemini(real_factory):
    with patch.object(settings, "LLM_PROVIDER", "gemini"):
        with patch.object(settings, "GEMINI_API_KEY", "test-key"):
            provider = real_factory.get_provider()
            assert isinstance(provider, GeminiProvider)

def test_get_provider_ollama(real_factory):
    with patch.object(settings, "LLM_PROVIDER", "ollama"):
        provider = real_factory.get_provider()
        assert isinstance(provider, OllamaProvider)

def test_get_provider_openai(real_factory):
    with patch.object(settings, "LLM_PROVIDER", "openai"):
        provider = real_factory.get_provider()
        assert isinstance(provider, OpenAIProvider)

def test_get_provider_unsupported(real_factory):
    with patch.object(settings, "LLM_PROVIDER", "unsupported"):
        with pytest.raises(ValueError, match="Unsupported LLM provider: unsupported"):
            real_factory.get_provider()
