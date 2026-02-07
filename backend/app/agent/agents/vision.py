from pydantic_ai import Agent

from app.agent.core.dependencies import get_vision_model
from app.agent.models.skeleton import VisionVerdict

# Phase 5: Vision Judge Agent (Closed-Loop)
# This agent expects multimodal input (text + screenshots)
vision_judge_agent = Agent(
    get_vision_model(),
    output_type=VisionVerdict,
    retries=2,
    instructions=(
        "You are the Vision Accessibility Judge for Aura. "
        "Your task is to visually verify if UI adaptations improved accessibility. "
        "You will be provided with a 'Before' and 'After' state (or just 'After'). "
        "Evaluate: "
        "1. Readability: Is the text easier to read? "
        "2. Visual Integrity: Did the change break the layout? (e.g., overlapping text, hidden buttons) "
        "3. Goal Achievement: Did it solve the original accessibility issue? "
        "Return a structured verdict with a recommendation: 'keep', 'refine', or 'rollback'."
    )
)
