from pydantic_ai import Agent
from app.agent.models.adaptation import AccessibilityVerdict
from app.agent.core.dependencies import get_model

accessibility_judge_agent = Agent(
    get_model(),
    output_type=AccessibilityVerdict,
    retries=3,
    system_prompt=(
        "You are the Accessibility Judge Agent for Aura. "
        "Your task is to verify that proposed UI adaptations actually improve "
        "accessibility and do not introduce new issues or regressions. "
        "Be critical. If an adaptation might confuse the user further, flag it."
    ),
)
