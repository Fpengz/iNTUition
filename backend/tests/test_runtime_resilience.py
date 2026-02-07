from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.core.runtime import AccessibilityRuntime
from app.schemas import DOMData, DOMElement, UserProfile


@pytest.fixture
def sample_dom_data():
    return DOMData(
        title="Test Page",
        url="http://example.com",
        elements=[
            DOMElement(role="button", text="Click me", selector="#btn", in_viewport=True)
        ],
        content_summary="This is a test page."
    )

@pytest.fixture
def sample_user_profile():
    return UserProfile(
        aura_id="test-user",
        cognitive={"support_level": "medium", "simplify_language": True, "reduce_distractions": True, "memory_aids": False},
        motor={"precision_required": "normal", "click_assistance": False, "keyboard_only": False, "target_upscaling": False},
        sensory={"vision_acuity": "normal", "color_blindness": None, "audio_sensitivity": False, "high_contrast": False},
        modalities={"input_preferred": ["text"], "output_preferred": ["visual"], "auto_tts": False}
    )

@pytest.mark.asyncio
async def test_runtime_connection_error_handling(sample_dom_data, sample_user_profile):
    """Test that runtime falls back to mock response on model connection error."""
    runtime = AccessibilityRuntime()

    # We want to simulate a failure in the agents.
    # Since agents use get_model(), we can patch the agents' run methods
    # to raise a connection error.

    with patch("app.agent.core.runtime.assessment_agent.run", new_callable=AsyncMock) as mock_run:
        mock_run.side_effect = Exception("Connection error")

        result = await runtime.process_page(
            dom_data=sample_dom_data,
            user_profile=sample_user_profile,
            is_explicit=True
        )

        assert result["mode"] == "mock_fallback"
        assert "action" in result
        assert result["action"] == "apply_ui"
        assert "ui_command" in result
        assert "explanation" in result["ui_command"]

@pytest.mark.asyncio
async def test_runtime_success_path(sample_dom_data, sample_user_profile):
    """Test that runtime works correctly on success path."""
    runtime = AccessibilityRuntime()

    from app.agent.models.skeleton import (
        AccessibilityAssessment,
        JudgeResult,
        UIAdaptationDecision,
    )

    # Since all agents are the same MagicMock object from conftest.py,
    # patching .run on one patches all of them. We use side_effect to differentiate.

    with patch("app.agent.core.runtime.assessment_agent.run", new_callable=AsyncMock) as m_run:
        assessment_data = AccessibilityAssessment(
            risk_level="high",
            confidence=0.9,
            complexity_score=5,
            issues=["too much text"],
            primary_goal="Login to the application"
        )

        adaptation_data = UIAdaptationDecision(
            overloaded=True,
            layout_mode="focus",
            theme="dark",
            hide_elements=["#ad"],
            highlight_elements=["#btn"],
            explanation="I've simplified this for you.",
            confidence=0.9
        )

        judge_data = JudgeResult(
            success=True,
            errors=[],
            confidence=1.0
        )

        def side_effect_fn(input_str, **kwargs):
            if "snapshot" in input_str.lower() or "PageSnapshot" in input_str:
                return MagicMock(data=assessment_data)
            elif "Assessment" in input_str:
                return MagicMock(data=adaptation_data)
            elif "Before:" in input_str:
                return MagicMock(data=judge_data)
            return MagicMock(data=assessment_data)

        m_run.side_effect = side_effect_fn

        result = await runtime.process_page(
            dom_data=sample_dom_data,
            user_profile=sample_user_profile,
            is_explicit=True
        )

        assert result["mode"] == "phased_agent"
        assert result["ui_command"]["layout_mode"] == "focus"
