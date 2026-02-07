from unittest.mock import AsyncMock, patch

import pytest

from app.agent.core.agent import AuraAgent
from app.agent.tools.base import BaseTool
from app.core.providers import AuraResponse


class MockTool(BaseTool):
    name = "mock_tool"
    description = "desc"
    async def run(self, **kwargs): return "result"

@pytest.fixture
def agent():
    with patch("app.agent.core.agent.get_provider"):
        return AuraAgent([MockTool()])

@pytest.mark.asyncio
async def test_execute_tool_success(agent):
    agent.provider.generate = AsyncMock()
    agent.provider.generate.side_effect = [
        AuraResponse(content='Action: mock_tool\nAction Input: {"a": 1}', raw_response=None, usage={}),
        AuraResponse(content='Final Answer: done', raw_response=None, usage={})
    ]

    res = await agent.execute("hi")
    assert res == "done"

@pytest.mark.asyncio
async def test_execute_tool_not_found(agent):
    agent.provider.generate = AsyncMock(return_value=AuraResponse(
        content='Action: unknown\nAction Input: {}', raw_response=None, usage={}
    ))
    res = await agent.execute("hi")
    assert "error" in res.lower()

@pytest.mark.asyncio
async def test_execute_parse_error(agent):
    agent.provider.generate = AsyncMock(return_value=AuraResponse(
        content='Broken response', raw_response=None, usage={}
    ))
    res = await agent.execute("hi")
    assert "error" in res.lower()

@pytest.mark.asyncio
async def test_execute_exception(agent):
    agent.provider.generate = AsyncMock(side_effect=Exception("BOOM"))
    res = await agent.execute("hi")
    assert "error" in res.lower()

@pytest.mark.asyncio
async def test_execute_max_iterations(agent):
    agent.provider.generate = AsyncMock(return_value=AuraResponse(
        content='Action: mock_tool\nAction Input: {}', raw_response=None, usage={}
    ))
    agent.max_iterations = 2
    res = await agent.execute("hi")
    assert "error" in res.lower()
