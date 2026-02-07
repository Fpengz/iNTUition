import asyncio
from unittest.mock import MagicMock, patch

import pytest

from app.core.providers import (
    AnthropicProvider,
    AuraResponse,
    BaseProvider,
    GeminiProvider,
    OllamaProvider,
    OpenAIProvider,
)


class ConcreteProvider(BaseProvider):
    async def generate(self, p, **kwargs): return await super().generate(p, **kwargs)
    async def generate_stream(self, p, **kwargs):
        # Trigger the super call to cover the 'pass' line
        res = super().generate_stream(p, **kwargs)
        if asyncio.iscoroutine(res): await res
        if False: yield "never"

@pytest.mark.asyncio
async def test_base_provider_abstract():
    provider = ConcreteProvider()
    assert await provider.generate("p") is None
    chunks = []
    async for chunk in provider.generate_stream("p"):
        chunks.append(chunk)
    assert chunks == []

@pytest.mark.asyncio
async def test_ollama_provider_generate():
    with patch("app.core.providers.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_res = MagicMock()
        mock_res.get.side_effect = lambda k, d=None: {"response": "hi", "eval_count": 10}.get(k, d)
        mock_client.generate.return_value = mock_res

        provider = OllamaProvider(host="http://localhost", model="m")
        response = await provider.generate("prompt")

        assert response.content == "hi"
        assert response.usage["total_tokens"] == 10

@pytest.mark.asyncio
async def test_ollama_provider_stream():
    with patch("app.core.providers.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        # Simulate generator returning dicts
        mock_client.generate.return_value = iter([{"response": "h"}, {}, {"response": "i"}])

        provider = OllamaProvider(host="http://localhost", model="m")
        chunks = []
        async for chunk in provider.generate_stream("prompt"):
            chunks.append(chunk)

        assert "".join(chunks) == "hi"

@pytest.mark.asyncio
async def test_gemini_provider_generate():
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_response = MagicMock()
        mock_response.text = "hi"
        mock_client.models.generate_content.return_value = mock_response

        provider = GeminiProvider(api_key="key", model="m")
        response = await provider.generate("prompt")
        assert response.content == "hi"

@pytest.mark.asyncio
async def test_gemini_provider_stream_empty_chunk():
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_chunk1 = MagicMock(text="h")
        mock_chunk2 = MagicMock(text=None) # Test empty chunk
        mock_client.models.generate_content_stream.return_value = [mock_chunk1, mock_chunk2]

        provider = GeminiProvider(api_key="key", model="m")
        chunks = []
        async for chunk in provider.generate_stream("prompt"):
            chunks.append(chunk)
        assert "".join(chunks) == "h"

def test_aura_response_dataclass():
    res = AuraResponse(content="hi", raw_response=None, usage={"tokens": 5})
    assert res.content == "hi"
    assert res.usage["tokens"] == 5

@pytest.mark.asyncio
async def test_openai_provider():
    provider = OpenAIProvider(api_key="key", model="m")
    res = await provider.generate("p")
    assert "not fully implemented" in res.content

    chunks = []
    async for chunk in provider.generate_stream("p"):
        chunks.append(chunk)
    assert "not fully implemented" in chunks[0]

@pytest.mark.asyncio
async def test_anthropic_provider():
    provider = AnthropicProvider(api_key="key", model="m")
    res = await provider.generate("p")
    assert "not fully implemented" in res.content

    chunks = []
    async for chunk in provider.generate_stream("p"):
        chunks.append(chunk)
    assert "not fully implemented" in chunks[0]
