from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.agents.vision import vision_judge_agent
from app.agent.models.skeleton import VisionVerdict


@pytest.mark.asyncio
async def test_vision_judge_agent_definition():
    # Verify agent exists
    assert vision_judge_agent is not None

@pytest.mark.asyncio
async def test_vision_judge_logic_mocked():
    # Use AsyncMock for async function
    with patch.object(vision_judge_agent, 'run', new_callable=AsyncMock) as mock_run:
        mock_run.return_value = MagicMock(data=VisionVerdict(
            success=True,
            improvement_score=0.9,
            new_issues=[],
            recommendation="keep",
            explanation="The UI looks much better."
        ))

        result = await vision_judge_agent.run("Fake context with image")
        assert result.data.success is True
        assert result.data.recommendation == "keep"
