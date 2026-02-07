import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.explainer import AuraExplainer
from app.core.providers import AuraResponse
from app.schemas import (
    DistilledData,
    DistilledElement,
)


@pytest.fixture
def mock_provider():
    return MagicMock()

@pytest.fixture
def explainer(mock_provider):
    with patch("app.core.explainer.get_provider", return_value=mock_provider):
        return AuraExplainer()

@pytest.fixture
def sample_distilled():
    return DistilledData(
        title="Test Title",
        url="http://example.com",
        summary=[DistilledElement(role="text", text="Hello", in_viewport=True)],
        actions=[DistilledElement(role="button", text="Click", selector="#btn", in_viewport=True)]
    )

@pytest.mark.asyncio
async def test_explain_page_success(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content='{"summary": "Test summary", "actions": ["Action 1"]}',
        raw_response=None,
        usage={}
    ))

    response = await explainer.explain_page(sample_distilled)
    assert response.summary == "Test summary"
    assert response.actions == ["Action 1"]

@pytest.mark.asyncio
async def test_explain_page_markdown_json(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content="""```json
{"summary": "Markdown summary", "actions": []}
```""",
        raw_response=None,
        usage={}
    ))

    response = await explainer.explain_page(sample_distilled)
    assert response.summary == "Markdown summary"

@pytest.mark.asyncio
async def test_explain_page_invalid_json_fallback(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content='Invalid JSON',
        raw_response=None,
        usage={}
    ))

    response = await explainer.explain_page(sample_distilled)
    assert "encountered a formatting issue" in response.summary

def test_clean_llm_json_empty(explainer):
    assert explainer._clean_llm_json(None) == "{}"
    assert explainer._clean_llm_json("") == "{}"

@pytest.mark.asyncio
async def test_explain_page_empty_content(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content='',
        raw_response=None,
        usage={}
    ))

    response = await explainer.explain_page(sample_distilled)
    assert "encountered a formatting issue" in response.summary

@pytest.mark.asyncio
async def test_explain_page_generic_markdown(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content='Here is the result:\n```\n{"summary": "Generic summary", "actions": []}\n```',
        raw_response=None,
        usage={}
    ))

    response = await explainer.explain_page(sample_distilled)
    assert response.summary == "Generic summary"

@pytest.mark.asyncio
async def test_explain_page_error(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(side_effect=Exception("LLM Error"))

    with pytest.raises(Exception, match="LLM Error"):
        await explainer.explain_page(sample_distilled)

@pytest.mark.asyncio
async def test_stream_explanation(explainer, mock_provider, sample_distilled):
    async def mock_stream(*args, **kwargs):
        yield "SUMMARY: This is a summary."
        yield " ACTIONS: Action 1, Action 2"
        yield " More context"

    mock_provider.generate_stream = mock_stream

    chunks = []
    async for chunk in explainer.stream_explanation(sample_distilled):
        chunks.append(json.loads(chunk))

    assert any(c["type"] == "summary" and "This is a summary" in c["content"] for c in chunks)
    assert any(c["type"] == "action" and "Action 1" in c["content"] for c in chunks)

@pytest.mark.asyncio
async def test_stream_explanation_error(explainer, mock_provider, sample_distilled):
    async def mock_stream_error(*args, **kwargs):
        yield "SUMMARY: Start"
        raise Exception("Stream break")

    mock_provider.generate_stream = mock_stream_error

    chunks = []
    async for chunk in explainer.stream_explanation(sample_distilled):
        chunks.append(json.loads(chunk))

    assert chunks[-1]["type"] == "error"

@pytest.mark.asyncio
async def test_find_action_success(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(return_value=AuraResponse(
        content='{"selector": "#btn", "explanation": "Clicking button"}',
        raw_response=None,
        usage={}
    ))

    response = await explainer.find_action(sample_distilled, "Click the button")
    assert response.selector == "#btn"
    assert response.explanation == "Clicking button"

@pytest.mark.asyncio
async def test_find_action_error(explainer, mock_provider, sample_distilled):
    mock_provider.generate = AsyncMock(side_effect=Exception("Action Error"))

    with pytest.raises(Exception, match="Action Error"):
        await explainer.find_action(sample_distilled, "query")
