from typing import Literal

from pydantic import BaseModel, Field


class PageSnapshot(BaseModel):
    url: str
    dom_text: str
    dom_structure: str
    interaction_stats: dict[str, float] = Field(default_factory=dict)

class AccessibilityAssessment(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    issues: list[str]
    complexity_score: int = Field(..., ge=1, le=10)
    primary_goal: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class UIAdaptationDecision(BaseModel):
    overloaded: bool
    layout_mode: Literal["normal", "simplified", "focus"]
    theme: Literal["dark", "contrast"] | None = None
    hide_elements: list[str]
    highlight_elements: list[str]
    explanation: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class JudgeResult(BaseModel):
    success: bool
    errors: list[str]
    confidence: float = Field(..., ge=0.0, le=1.0)

class VisionVerdict(BaseModel):
    success: bool
    improvement_score: float = Field(..., ge=0.0, le=1.0)
    new_issues: list[str]
    recommendation: Literal["keep", "refine", "rollback"]
    explanation: str
