from pydantic_ai import Agent
from app.agent.models.adaptation import UIActions
from app.agent.core.dependencies import get_model

ui_adaptation_agent = Agent(
    get_model(),
    output_type=UIActions,
    retries=3,
    system_prompt=(
        "You are the UI Adaptation Decision Agent for Aura. "
        "Your goal is to decide HOW the interface should adapt to reduce friction. "
        "You receive the page summary, user constraints, and cognitive state. "
        "Recommend specific structural changes like hiding elements or changing the layout mode. "
        "Explain WHY you made these choices."
    ),
)
