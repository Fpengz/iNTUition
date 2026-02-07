import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.models.skeleton import VisionVerdict
from app.schemas import ActionResponse, ExplanationResponse


@pytest.fixture
def sample_dom_payload():
    return {
        "title": "Test Page",
        "url": "http://example.com",
        "elements": [
            {"role": "button", "text": "Click me", "selector": "#btn", "in_viewport": True}
        ]
    }

@pytest.fixture
def sample_profile_payload():
    return {
        "aura_id": "test-user",
        "cognitive": {"support_level": "medium"}
    }

@pytest.mark.asyncio
async def test_prefetch_endpoint(client):
    with patch("app.api.v1.endpoints.accessibility.prefetch_and_cache", new_callable=AsyncMock) as mock_prefetch:
        response = await client.post("/prefetch", json={"url": "http://example.com"})
        assert response.status_code == 200
        assert response.json() == {"message": "URL accepted for prefetching."}

@pytest.mark.asyncio
async def test_process_runtime_endpoint(client, sample_dom_payload, sample_profile_payload):
    with patch("app.api.v1.endpoints.accessibility.runtime.process_page", new_callable=AsyncMock) as mock_process:
        mock_process.return_value = {"action": "apply_ui", "mode": "phased_agent"}

        response = await client.post("/process", json={
            "dom_data": sample_dom_payload,
            "profile": sample_profile_payload
        })
        assert response.status_code == 200
        assert response.json()["mode"] == "phased_agent"

@pytest.mark.asyncio
async def test_process_runtime_missing_data(client):
    response = await client.post("/process", json={})
    assert response.status_code == 422
    assert "error" in response.json()

@pytest.mark.asyncio
async def test_process_runtime_error(client, sample_dom_payload, sample_profile_payload):
    with patch("app.api.v1.endpoints.accessibility.runtime.process_page", side_effect=Exception("Runtime Error")):
        response = await client.post("/process", json={
            "dom_data": sample_dom_payload,
            "profile": sample_profile_payload
        })
        assert response.status_code == 500
        assert "Runtime Error" in response.json()["error"]

@pytest.mark.asyncio
async def test_chat_endpoint(client):
    with patch("app.api.v1.endpoints.accessibility.agent.execute", new_callable=AsyncMock) as mock_execute:
        mock_execute.return_value = "Hello from Aura"
        response = await client.post("/chat", json={"query": "hi"})
        assert response.status_code == 200
        assert response.json() == {"response": "Hello from Aura"}

@pytest.mark.asyncio
async def test_chat_missing_query(client):
    response = await client.post("/chat", json={})
    assert response.status_code == 422
    assert "error" in response.json()

@pytest.mark.asyncio
async def test_chat_error(client):
    with patch("app.api.v1.endpoints.accessibility.agent.execute", side_effect=Exception("Chat Error")):
        response = await client.post("/chat", json={"query": "hi"})
        assert response.status_code == 500
        assert "Chat Error" in response.json()["error"]

@pytest.mark.asyncio
async def test_explain_endpoint(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.explainer.explain_page", new_callable=AsyncMock) as mock_explain:
        mock_explain.return_value = ExplanationResponse(summary="Test", actions=[])

        response = await client.post("/explain", json={"dom_data": sample_dom_payload})
        assert response.status_code == 200
        assert "explanation" in response.json()

@pytest.mark.asyncio
async def test_explain_endpoint_missing_dom(client):
    response = await client.post("/explain", json={})
    assert response.status_code == 422
    assert "error" in response.json()

@pytest.mark.asyncio
async def test_explain_endpoint_cached(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.explanation_cache.get") as mock_cache_get:
        mock_cache_get.return_value = {"summary": "Cached", "actions": []}

        response = await client.post("/explain", json={"dom_data": sample_dom_payload})
        assert response.status_code == 200
        assert response.json()["cached"] is True

@pytest.mark.asyncio
async def test_explain_endpoint_error(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.explainer.explain_page", side_effect=Exception("Explain Error")):
        # We need to make sure cache returns None
        with patch("app.api.v1.endpoints.accessibility.explanation_cache.get", return_value=None):
            response = await client.post("/explain", json={"dom_data": sample_dom_payload})
            assert response.status_code == 500
            assert "Explain Error" in response.json()["error"]

@pytest.mark.asyncio
async def test_explain_stream_endpoint(client, sample_dom_payload):
    async def mock_stream(*args, **kwargs):
        yield json.dumps({"type": "summary", "content": "Part 1"})
        yield json.dumps({"type": "action", "content": "Action 1"})

    with patch("app.api.v1.endpoints.accessibility.explainer.stream_explanation", side_effect=mock_stream):
        with patch("app.api.v1.endpoints.accessibility.explanation_cache.get", return_value=None):
            response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]

@pytest.mark.asyncio
async def test_explain_stream_inner_yield_error(client, sample_dom_payload):
    # This specifically targets the try-except INSIDE the event_generator
    async def mock_stream_error_midway(*args, **kwargs):
        yield json.dumps({"type": "summary", "content": "Good"})
        raise Exception("Midway Error")

    with patch("app.api.v1.endpoints.accessibility.explainer.stream_explanation", side_effect=mock_stream_error_midway):
        with patch("app.api.v1.endpoints.accessibility.explanation_cache.get", return_value=None):
            response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
            assert response.status_code == 200
            content = await response.aread()
            assert b"Midway Error" in content

@pytest.mark.asyncio
async def test_explain_stream_inner_json_error(client, sample_dom_payload):
    # This specifically targets the 'except Exception: pass' block
    async def mock_stream_invalid_json(*args, **kwargs):
        yield "INVALID JSON"

    with patch("app.api.v1.endpoints.accessibility.explainer.stream_explanation", side_effect=mock_stream_invalid_json):
        with patch("app.api.v1.endpoints.accessibility.explanation_cache.get", return_value=None):
            response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
            assert response.status_code == 200
            content = await response.aread()
            assert b"INVALID JSON" in content

@pytest.mark.asyncio
async def test_explain_stream_endpoint_missing_dom(client):
    response = await client.post("/explain/stream", json={})
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_explain_stream_endpoint_cached(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.explanation_cache.get") as mock_cache_get:
        mock_cache_get.return_value = {"summary": "Cached", "actions": ["Action"]}

        response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
        assert response.status_code == 200
        # It's an SSE response

@pytest.mark.asyncio
async def test_explain_stream_inner_error(client, sample_dom_payload):
    async def mock_stream_error(*args, **kwargs):
        raise Exception("Stream Error")
        yield "never"

    with patch("app.api.v1.endpoints.accessibility.explainer.stream_explanation", side_effect=mock_stream_error):
        with patch("app.api.v1.endpoints.accessibility.explanation_cache.get", return_value=None):
            response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
            assert response.status_code == 200
            # Error is yielded in the stream

@pytest.mark.asyncio
async def test_explain_stream_outer_error(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.DOMDistiller.distill", side_effect=Exception("Outer Error")):
        response = await client.post("/explain/stream", json={"dom_data": sample_dom_payload})
        assert response.status_code == 500

@pytest.mark.asyncio
async def test_action_endpoint(client, sample_dom_payload):
    with patch("app.api.v1.endpoints.accessibility.explainer.find_action", new_callable=AsyncMock) as mock_action:
        mock_action.return_value = ActionResponse(selector="#btn", explanation="Click it")

        response = await client.post("/action", json={
            "dom_data": sample_dom_payload,
            "query": "click button"
        })
        assert response.status_code == 200
        assert response.json()["selector"] == "#btn"

@pytest.mark.asyncio
async def test_tts_endpoint(client):
    with patch("app.api.v1.endpoints.accessibility.tts_synthesizer.synthesize_speech") as mock_tts:
        mock_tts.return_value = b"mp3data"
        response = await client.post("/tts", json={"text": "hello"})
        assert response.status_code == 200
        assert response.content == b"mp3data"

@pytest.mark.asyncio
async def test_tts_error(client):
    with patch("app.api.v1.endpoints.accessibility.tts_synthesizer.synthesize_speech", side_effect=Exception("TTS Error")):
        response = await client.post("/tts", json={"text": "hello"})
        assert response.status_code == 500

@pytest.mark.asyncio
async def test_verify_endpoint(client):
    from app.agent.agents.vision import vision_judge_agent
    with patch.object(vision_judge_agent, "run", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = MagicMock(data=VisionVerdict(
            success=True,
            improvement_score=0.9,
            new_issues=[],
            recommendation="keep",
            explanation="Good"
        ))

        response = await client.post("/verify", json={
            "screenshot": "base64...",
            "goal": "read",
            "actions_applied": [],
            "url": "http://test.com"
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

@pytest.mark.asyncio
async def test_verify_error(client):
    from app.agent.agents.vision import vision_judge_agent
    with patch.object(vision_judge_agent, "run", side_effect=Exception("Vision Error")):
        response = await client.post("/verify", json={
            "screenshot": "...", "goal": "...", "actions_applied": [], "url": "..."
        })
        assert response.json()["success"] is False

@pytest.mark.asyncio
async def test_prefetch_and_cache_success():
    from app.api.v1.endpoints.accessibility import prefetch_and_cache
    from app.schemas import ExplanationResponse

    with patch("httpx.AsyncClient.get") as mock_get, \
         patch("app.core.distiller.DOMDistiller.distill_html") as mock_distill, \
         patch("app.core.explainer.AuraExplainer.explain_page", new_callable=AsyncMock) as mock_explain, \
         patch("app.api.v1.endpoints.accessibility.explanation_cache.set") as mock_cache_set:

        mock_get.return_value = MagicMock(status_code=200, text="<html></html>")
        # Ensure it has raise_for_status
        mock_get.return_value.raise_for_status = MagicMock()

        mock_distill.return_value = MagicMock(url="http://test.com")
        mock_distill.return_value.actions = []
        mock_distill.return_value.summary = []

        mock_explain.return_value = ExplanationResponse(summary="Prefetched", actions=[])

        await prefetch_and_cache("http://test.com")
        assert mock_cache_set.called

@pytest.mark.asyncio
async def test_prefetch_and_cache_failure():
    from app.api.v1.endpoints.accessibility import prefetch_and_cache
    with patch("httpx.AsyncClient.get", side_effect=Exception("Network error")):
        # Should not raise exception but log error
        await prefetch_and_cache("http://test.com")
