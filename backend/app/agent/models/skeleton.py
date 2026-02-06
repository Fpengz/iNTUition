from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict

class PageSnapshot(BaseModel):
    url: str
    dom_text: str
    dom_structure: str
    interaction_stats: Dict[str, float] = Field(default_factory=dict)

class AccessibilityAssessment(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    issues: List[str]
    complexity_score: int = Field(..., ge=1, le=10)
    primary_goal: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class UIAdaptationDecision(BaseModel):
    overloaded: bool
    layout_mode: Literal["normal", "simplified", "focus"]
    theme: Optional[Literal["dark", "contrast"]] = None
    hide_elements: List[str]
    highlight_elements: List[str]
    explanation: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class JudgeResult(BaseModel):
    success: bool
    errors: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)
