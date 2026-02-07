from unittest.mock import AsyncMock, patch

import pytest

from app.agent.tools.base import BaseTool
from app.agent.tools.distiller_tool import DistillerTool, DistillerToolSchema
from app.agent.tools.explainer_tool import ExplainerTool
from app.agent.tools.tts_tool import TTSTool


class ConcreteTool(BaseTool):
    name = "c"
    description = "d"
    args_schema = DistillerToolSchema
    async def run(self, **kwargs): return await super().run(**kwargs)

@pytest.mark.asyncio
async def test_base_tool_abstract():
    tool = ConcreteTool()
    # Calling super().run() should do nothing or return None as it's pass
    assert await tool.run() is None

@pytest.mark.asyncio
async def test_distiller_tool():
    tool = DistillerTool()
    payload = {"title": "T", "url": "http://t.com", "elements": []}
    with patch("app.core.distiller.DOMDistiller.distill") as mock_distill:
        await tool.run(dom_data=payload)
        assert mock_distill.called

@pytest.mark.asyncio
async def test_explainer_tool():
    tool = ExplainerTool()
    payload = {"title": "T", "url": "http://t.com", "summary": [], "actions": []}
    with patch("app.core.explainer.AuraExplainer.explain_page", new_callable=AsyncMock) as mock_explain:
        await tool.run(distilled_data=payload)
        assert mock_explain.called

@pytest.mark.asyncio
async def test_tts_tool():
    tool = TTSTool()
    with patch("app.core.tts.AuraTTS.synthesize_speech") as mock_tts:
        await tool.run(text="hello")
        assert mock_tts.called
