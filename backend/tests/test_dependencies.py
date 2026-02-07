from unittest.mock import patch

from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.openai import OpenAIChatModel

from app.agent.core.dependencies import get_model
from app.core.config import settings


def test_get_model_gemini():
    with patch.object(settings, "LLM_PROVIDER", "gemini"):
        model = get_model()
        assert isinstance(model, GoogleModel)

def test_get_model_ollama():
    with patch.object(settings, "LLM_PROVIDER", "ollama"):
        model = get_model()
        assert isinstance(model, OpenAIChatModel)
        assert "ollama" in str(model._provider).lower()

def test_get_model_openai():
    with patch.object(settings, "LLM_PROVIDER", "openai"):
        model = get_model()
        assert isinstance(model, OpenAIChatModel)
        assert "openai" in str(model._provider).lower()

def test_get_model_default():
    with patch.object(settings, "LLM_PROVIDER", "unsupported"):
        model = get_model()
        assert isinstance(model, GoogleModel)
