from unittest.mock import AsyncMock, MagicMock, patch
import pytest
import base64

@pytest.mark.asyncio
async def test_verify_endpoint_with_image(client):
    """Test the /verify endpoint with a mock image."""
    # Create a dummy base64 image
    dummy_img = base64.b64encode(b"fake image data").decode()
    payload = {
        "screenshot": f"data:image/png;base64,{dummy_img}",
        "goal": "improve button visibility",
        "actions_applied": ["button { transform: scale(1.2) }"],
        "url": "https://example.com"
    }

    from app.agent.models.skeleton import VisionVerdict
    with patch("app.api.v1.endpoints.accessibility.vision_judge_agent.run", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = MagicMock(data=VisionVerdict(
            success=True,
            improvement_score=0.9,
            new_issues=[],
            recommendation="keep",
            explanation="Visually verified."
        ))

        response = await client.post("/verify", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["recommendation"] == "keep"
        
        # Verify that it was called with parts (multimodal)
        args, kwargs = mock_run.call_args
        parts = args[0]
        assert isinstance(parts, list)
        assert len(parts) == 2
        from pydantic_ai.messages import UserPromptPart, BinaryImage
        assert isinstance(parts[0], UserPromptPart)
        assert isinstance(parts[1], BinaryImage)
        assert parts[1].data == b"fake image data"
