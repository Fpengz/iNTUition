from pydantic_ai import Agent
from app.agent.models.understanding import AccessibilityConstraints
from app.agent.core.dependencies import get_model

profile_interpreter_agent = Agent(
    get_model(),
    output_type=AccessibilityConstraints,
    retries=3,
    system_prompt=(
        "You are the User Profile Interpreter for Aura. "
        "Your task is to translate a human-friendly user accessibility profile "
        "into concrete, actionable UI constraints that other agents can use."
    ),
)
