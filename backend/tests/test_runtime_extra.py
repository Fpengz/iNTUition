from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.core.runtime import AccessibilityRuntime
from app.agent.models.skeleton import (
    AccessibilityAssessment,
    JudgeResult,
    UIAdaptationDecision,
)
from app.schemas import DOMData, DOMElement, UserProfile


@pytest.fixture
def sample_data():
    dom = DOMData(
        title="T", url="http://t.com",
        elements=[DOMElement(role="button", text="B", selector="#b")],
        content_summary="S"
    )
    profile = UserProfile(aura_id="u")
    return dom, profile

@pytest.mark.asyncio
async def test_runtime_low_confidence_assessment(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()

    # Create separate mocks
    m_assess = AsyncMock()
    m_assess.run.return_value = MagicMock(data=AccessibilityAssessment(
        risk_level="low", confidence=0.4, issues=[], complexity_score=1, primary_goal="G"
    ))

    with patch("app.agent.core.runtime.assessment_agent", m_assess):
        res = await runtime.process_page(dom, profile, is_explicit=True)
        assert res["action"] == "suggest_help"

@pytest.mark.asyncio
async def test_runtime_low_confidence_adaptation(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()

    m_assess = AsyncMock()
    m_assess.run.return_value = MagicMock(data=AccessibilityAssessment(
        risk_level="high", confidence=0.9, issues=[], complexity_score=1, primary_goal="G"
    ))

    m_adapt = AsyncMock()
    m_adapt.run.return_value = MagicMock(data=UIAdaptationDecision(
        overloaded=True, layout_mode="focus", explanation="E", confidence=0.5,
        hide_elements=[], highlight_elements=[]
    ))

    with patch("app.agent.core.runtime.assessment_agent", m_assess), \
         patch("app.agent.core.runtime.adaptation_agent", m_adapt):
        res = await runtime.process_page(dom, profile, is_explicit=True)
        assert res["action"] == "suggest_help"

@pytest.mark.asyncio
async def test_runtime_judge_failure(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()

    m_assess = AsyncMock()
    m_assess.run.return_value = MagicMock(data=AccessibilityAssessment(
        risk_level="high", confidence=0.9, issues=[], complexity_score=1, primary_goal="G"
    ))
    m_adapt = AsyncMock()
    m_adapt.run.return_value = MagicMock(data=UIAdaptationDecision(
        overloaded=True, layout_mode="focus", explanation="E", confidence=0.9,
        hide_elements=[], highlight_elements=[]
    ))
    m_judge = AsyncMock()
    m_judge.run.return_value = MagicMock(data=JudgeResult(success=False, errors=["broken"], confidence=1.0))

    with patch("app.agent.core.runtime.assessment_agent", m_assess), \
         patch("app.agent.core.runtime.adaptation_agent", m_adapt), \
         patch("app.agent.core.runtime.judge_agent", m_judge):
        res = await runtime.process_page(dom, profile, is_explicit=True)
        assert res["action"] == "warn"

@pytest.mark.asyncio
async def test_runtime_complex_triggers_vision(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()

    m_assess = AsyncMock()
    m_assess.run.return_value = MagicMock(data=AccessibilityAssessment(
        risk_level="high", confidence=0.9, issues=[], complexity_score=9, primary_goal="G"
    ))
    m_adapt = AsyncMock()
    m_adapt.run.return_value = MagicMock(data=UIAdaptationDecision(
        overloaded=True, layout_mode="focus", explanation="E", confidence=0.9,
        hide_elements=[], highlight_elements=[]
    ))
    m_judge = AsyncMock()
    m_judge.run.return_value = MagicMock(data=JudgeResult(success=True, errors=[], confidence=1.0))

    with patch("app.agent.core.runtime.assessment_agent", m_assess), \
         patch("app.agent.core.runtime.adaptation_agent", m_adapt), \
         patch("app.agent.core.runtime.judge_agent", m_judge):
        res = await runtime.process_page(dom, profile, is_explicit=True)
        assert res["ui_command"]["visual_validation_required"] is True

@pytest.mark.asyncio
async def test_runtime_heuristic_gate(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()
    # No interaction stats, so should run ai if not for gate
    # But wait, should_run_ai returns False for empty stats
    res = await runtime.process_page(dom, profile, is_explicit=False)
    assert res["reason"] == "heuristic_gate"

@pytest.mark.asyncio
async def test_runtime_unexpected_error(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()
    m_assess = AsyncMock(side_effect=Exception("BOOM"))
    with patch("app.agent.core.runtime.assessment_agent", m_assess):
        res = await runtime.process_page(dom, profile, is_explicit=True)
        assert res["mode"] == "mock_fallback"

def test_get_mock_response_detailed(sample_data):
    dom, profile = sample_data
    runtime = AccessibilityRuntime()
    profile.cognitive.simplify_language = False
    res = runtime._get_mock_response(dom, profile)
    assert "Detailed Analysis" in res["ui_command"]["explanation"]

def test_parse_logs_extra():
    runtime = AccessibilityRuntime()
    stats = runtime._parse_logs(["idle", "scroll", "click"])
    assert stats["idle_time"] == 15
    assert stats["scroll_loops"] == 1
    assert stats["rage_clicks"] == 1
