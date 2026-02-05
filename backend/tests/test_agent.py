
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.agent.core.agent import AuraAgent
from app.agent.tools.distiller_tool import DistillerTool
from app.schemas import DistilledData

@pytest.mark.asyncio
async def test_agent_initialization():
    # Mock get_provider to avoid needing API keys during initialization
    with patch("app.agent.core.agent.get_provider") as mock_get_provider:
        mock_get_provider.return_value = MagicMock()
        tools = [DistillerTool()]
        agent = AuraAgent(tools)
        assert "dom_distiller" in agent.tools

@pytest.mark.asyncio
async def test_agent_execute_final_answer():
    # Mock provider to return a Final Answer immediately
    with patch("app.agent.core.agent.get_provider") as mock_get_provider:
        mock_provider = AsyncMock()
        mock_provider.generate.return_value.content = "Final Answer: I am ready to help."
        mock_get_provider.return_value = mock_provider
        
        agent = AuraAgent([])
        response = await agent.execute("Hello")
        
        assert response == "I am ready to help."
        assert len(agent.state.conversation_history) == 2

@pytest.mark.asyncio
async def test_agent_ooda_loop_logic():
    # Mock provider to first call a tool, then give final answer
    with patch("app.agent.core.agent.get_provider") as mock_get_provider:
        mock_provider = AsyncMock()
        # Side effect to simulate two turns
        tool_action_content = 'Action: dom_distiller\nAction Input: {"dom_data": {"title": "test", "url": "https://test.com", "elements": []}}'
        mock_provider.generate.side_effect = [
            AsyncMock(content=tool_action_content),
            AsyncMock(content='Final Answer: I have analyzed the page.')
        ]
        mock_get_provider.return_value = mock_provider
        
        distiller_tool = DistillerTool()
        distiller_tool.run = AsyncMock(return_value=DistilledData(title="test", url="https://test.com/", summary=[], actions=[]))
        
        agent = AuraAgent([distiller_tool])
        response = await agent.execute("Analyze this page")
        
        assert response == "I have analyzed the page."
        assert distiller_tool.run.called
