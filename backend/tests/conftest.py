import asyncio
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest

# Global patches BEFORE app imports
patch("pydantic_ai.Agent", MagicMock()).start()
patch("pydantic_ai.models.gemini.GeminiModel", MagicMock()).start()
patch("pydantic_ai.models.openai.OpenAIModel", MagicMock()).start()
patch("app.core.factory.get_provider", MagicMock()).start()

from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client() -> AsyncGenerator:
    from httpx import ASGITransport, AsyncClient
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client
