from typing import Literal
from pydantic import BaseModel, Field

class AccessibilityRisk(BaseModel):
    """Output of the Accessibility Health Check Agent."""
    risk_level: Literal["low", "medium", "high"] = Field(
        ..., description="The detected risk level of the current page."
    )
    issues: list[str] = Field(
        default_factory=list, description="List of detected accessibility issues."
    )
    recommend_intervention: bool = Field(
        ..., description="Whether the system should proactively intervene."
    )
