from typing import Literal, Optional
from pydantic import BaseModel, Field
from .risks import AccessibilityRisk
from .understanding import PageSummary, AccessibilityConstraints
from .state import CognitiveState
from .adaptation import UIActions, AccessibilityVerdict

class ConsolidatedResponse(BaseModel):
    """Combined output of the entire accessibility pipeline."""
    risk: AccessibilityRisk
    page_summary: PageSummary
    constraints: AccessibilityConstraints
    cognitive_state: Optional[CognitiveState]
    proposed_actions: UIActions
    verdict: AccessibilityVerdict
