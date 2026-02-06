from pydantic_ai import Agent
from app.agent.models.risks import AccessibilityRisk
from app.agent.core.dependencies import get_model

health_check_agent = Agent(
    get_model(),
    output_type=AccessibilityRisk,
    retries=3,
    system_prompt=(
        "You are the Accessibility Health Check Agent for Aura. "
        "Your task is to analyze a webpage's DOM and metadata to identify potential "
        "accessibility risks (visual, cognitive, or motor). "
        "Be proactive. If you see high density, small targets, or missing labels, "
        "flag it for intervention."
    ),
)
