from typing import Literal
from pydantic import BaseModel, Field

class UIActions(BaseModel):
    """Proposed structural adaptations for the UI."""
    hide_elements: list[str] = Field(
        default_factory=list, description="List of selectors/IDs to hide."
    )
    highlight_elements: list[str] = Field(
        default_factory=list, description="List of selectors/IDs to highlight."
    )
    layout_mode: Literal["normal", "simplified", "focus"] = Field(
        ..., description="The UI layout strategy to apply."
    )
    explanation: str = Field(
        ..., description="Natural language explanation of WHY these changes were made."
    )

class AccessibilityVerdict(BaseModel):
    """Validation result from the Accessibility Judge Agent."""
    compliant: bool = Field(..., description="Whether the adaptation is safe and helpful.")
    remaining_issues: list[str] = Field(default_factory=list)
    regressions: list[str] = Field(default_factory=list)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
