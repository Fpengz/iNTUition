
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import AsyncMock, patch
from app.schemas import ExplanationResponse, ActionResponse

client = TestClient(app)

@pytest.fixture
def mock_explainer():
    with patch("app.main.explainer") as mock:
        yield mock

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_explain_endpoint(mock_explainer):
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
    
    response = client.post("/explain", json={"dom_data": mock_dom})
    
    assert response.status_code == 200
    data = response.json()
    assert data["explanation"]["summary"] == "This is a test summary."
    assert data["cached"] is False

@pytest.mark.asyncio
async def test_action_endpoint(mock_explainer):
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
    
    response = client.post("/action", json=mock_request)
    
    assert response.status_code == 200
    assert response.json()["selector"] == "#buy"
