from pydantic import BaseModel, Field

class CognitiveState(BaseModel):
    """Current mental load state of the user."""
    overloaded: bool = Field(..., description="Whether the user is likely experiencing overload.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in this assessment.")
    signals: list[str] = Field(default_factory=list, description="Interaction signals (e.g., scroll loops).")
