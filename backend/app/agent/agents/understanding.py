from pydantic_ai import Agent

from app.agent.core.dependencies import get_model
from app.agent.models.understanding import PageSummary

page_understanding_agent = Agent(
    get_model(),
    output_type=PageSummary,
    retries=3,
    system_prompt=(
        "You are the Page Understanding Agent for Aura. "
        "Your task is to provide a semantic, task-oriented map of the current webpage. "
        "Identify the primary goal, distinguish between main actions and secondary noise, "
        "and score the page's complexity."
    ),
)
