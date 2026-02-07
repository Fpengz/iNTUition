from pydantic import BaseModel

from .adaptation import AccessibilityVerdict, UIActions
from .risks import AccessibilityRisk
from .state import CognitiveState
from .understanding import AccessibilityConstraints, PageSummary


class ConsolidatedResponse(BaseModel):
    """Combined output of the entire accessibility pipeline."""
    risk: AccessibilityRisk
    page_summary: PageSummary
    constraints: AccessibilityConstraints
    cognitive_state: CognitiveState | None
    proposed_actions: UIActions
    verdict: AccessibilityVerdict
