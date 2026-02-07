from pydantic_ai import Agent

from app.agent.core.dependencies import get_model
from app.agent.models.state import CognitiveState

cognitive_evaluator_agent = Agent(
    get_model(),
    output_type=CognitiveState,
    retries=3,
    system_prompt=(
        "You are the Cognitive Load Evaluator for Aura. "
        "Based on interaction patterns (provided in the prompt) and page complexity, "
        "determine if the user is likely experiencing cognitive overload. "
        "Look for signals like repeated scrolling, hesitation, or redundant clicks."
    ),
)
