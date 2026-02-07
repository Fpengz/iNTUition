from pydantic_ai import Agent

from app.agent.core.dependencies import get_model
from app.agent.models.skeleton import (
    AccessibilityAssessment,
    JudgeResult,
    UIAdaptationDecision,
)

# Phase 1: Assessment Agent (Fast)
assessment_agent = Agent(
    get_model(),
    output_type=AccessibilityAssessment,
    retries=3,
    instructions=(
        "You are an information distillation agent for Aura. "
        "Analyze the webpage snapshot. Your primary goal is to summarize WHAT "
        "the page is about so the user doesn't have to read everything. "
        "Distinguish between MAIN CONTENT and UI CLUTTER. "
        "Return structured output with a confidence score."
    )
)

# Phase 2: Adaptation Agent (Strong)
adaptation_agent = Agent(
    get_model(),
    output_type=UIAdaptationDecision,
    retries=3,
    instructions=(
        "You are the UI Adaptation Agent for Aura. "
        "Your goal is to provide a content-first explanation and a simplified UI. "
        "IMPORTANT RULES: "
        "1. The 'explanation' must be a summary of the PAGE CONTENT, not a description of Aura. "
        "2. Respect the user's 'language_level': "
        "   - If 'simple': Use short sentences, no jargon, and focus on the 'What' and 'Next Step'. "
        "   - If 'detailed': Provide a comprehensive technical summary. "
        "3. THEME RECOMMENDATION: "
        "   - If the page looks bright and the user has sensory needs, suggest 'dark'. "
        "   - If the contrast looks low or text is small, suggest 'contrast'. "
        "4. NEVER hide the primary content container. "
        "5. Hide only secondary noise (navbars, sidebars, ads)."
    )
)

# Phase 3: Judge Agent (Validation)
judge_agent = Agent(
    get_model(),
    output_type=JudgeResult,
    retries=3,
    instructions=(
        "You are the Accessibility Judge for Aura. "
        "Evaluate whether proposed accessibility improvements were correctly planned. "
        "Check for potential regressions or safety issues. "
        "A low success score will block the adaptation."
    )
)
