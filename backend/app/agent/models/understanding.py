from pydantic import BaseModel, Field

class PageSummary(BaseModel):
    """Semantic understanding of the current webpage."""
    page_type: str = Field(..., description="Type of page (e.g., form, article, dashboard).")
    primary_goal: str = Field(..., description="The likely goal of the user on this page.")
    main_actions: list[str] = Field(..., description="Key interactive elements.")
    secondary_elements: list[str] = Field(..., description="Non-essential UI elements.")
    complexity_score: int = Field(..., ge=1, le=10, description="Complexity score from 1 to 10.")

class AccessibilityConstraints(BaseModel):
    """Actionable UI constraints derived from the user profile."""
    max_elements_visible: int = Field(..., description="Limit on number of visible elements.")
    simplify_text_level: int = Field(..., ge=0, le=3, description="Text simplification level (0-3).")
    enable_speech: bool = Field(..., description="Whether TTS should be active.")
    emphasize_primary_action: bool = Field(..., description="Whether to highlight the main CTA.")
