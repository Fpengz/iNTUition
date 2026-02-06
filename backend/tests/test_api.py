import pytest
from unittest.mock import AsyncMock, patch
from app.schemas import ExplanationResponse, ActionResponse

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_root_check(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]

@pytest.mark.asyncio
async def test_explain_endpoint(client):
    # Patch explainer in the new location
    with patch("app.api.v1.endpoints.accessibility.explainer") as mock_explainer:
        mock_explainer.explain_page = AsyncMock(return_value=ExplanationResponse(
            summary="This is a test summary.",
            actions=["Action 1", "Action 2"]
        ))
        
        mock_dom = {
            "title": "Test Shop",
            "url": "https://testshop.com/",
            "elements": [
                {"role": "heading", "text": "Welcome", "selector": "h1", "y": 100.5},
                {"role": "button", "text": "Buy", "selector": "#buy", "y": 250.75}
            ]
        }
        
        response = await client.post("/explain", json={"dom_data": mock_dom})
        
        assert response.status_code == 200
        data = response.json()
        assert data["explanation"]["summary"] == "This is a test summary."
        assert data["cached"] is False

@pytest.mark.asyncio
async def test_action_endpoint(client):
    # Patch explainer in the new location
    with patch("app.api.v1.endpoints.accessibility.explainer") as mock_explainer:
        mock_explainer.find_action = AsyncMock(return_value=ActionResponse(
            selector="#buy",
            explanation="Click the buy button."
        ))
        
        mock_request = {
            "dom_data": {
                "title": "Test Shop",
                "url": "https://testshop.com/",
                "elements": [{"role": "button", "text": "Buy", "selector": "#buy"}]
            },
            "query": "I want to buy"
        }
        
        response = await client.post("/action", json=mock_request)
        
        assert response.status_code == 200
        assert response.json()["selector"] == "#buy"