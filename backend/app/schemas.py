"""Pydantic schemas for data exchange within the Aura backend."""

from typing import Any, List, Literal, Optional

from pydantic import BaseModel, HttpUrl, Field


# --- DOM Scraping & Distillation ---

class DOMElement(BaseModel):
    """Represents a single scraped DOM element before distillation."""
    role: str
    text: str
    selector: str | None = None
    aria_label: str | None = None
    in_viewport: bool | None = False
    y: float | None = None  # Vertical position for sorting


class DOMData(BaseModel):
    """Payload from the frontend content script containing raw DOM elements."""
    title: str
    url: HttpUrl
    elements: list[DOMElement]
    main_selector: str = "main"
    content_summary: str = ""


class DistilledElement(BaseModel):
    """Represents a single DOM element after distillation for LLM consumption."""
    r: str = Field(..., alias="role")  # role
    t: str = Field(..., alias="text")  # text content
    s: str | None = Field(None, alias="selector")  # CSS selector for mapping back
    l: str | None = Field(None, alias="aria_label")  # aria_label
    v: bool | None = Field(False, alias="in_viewport")  # is in viewport

    model_config = {
        "populate_by_name": True
    }


class DistilledData(BaseModel):
    """Distilled DOM information, ready for LLM processing."""
    title: str
    url: HttpUrl
    summary: list[DistilledElement]
    actions: list[DistilledElement]


# --- User Profile ---

class CognitiveProfile(BaseModel):
    support_level: Literal["none", "low", "medium", "high"] = "none"
    simplify_language: bool = True
    reduce_distractions: bool = True
    memory_aids: bool = False

class MotorProfile(BaseModel):
    precision_required: Literal["normal", "limited", "severe"] = "normal"
    click_assistance: bool = False
    keyboard_only: bool = False
    target_upscaling: bool = False

class SensoryProfile(BaseModel):
    vision_acuity: Literal["normal", "low", "blind"] = "normal"
    color_blindness: Optional[str] = None
    audio_sensitivity: bool = False
    high_contrast: bool = False

class ModalityPreferences(BaseModel):
    input_preferred: List[Literal["text", "speech", "vision"]] = ["text"]
    output_preferred: List[Literal["visual", "auditory", "haptic"]] = ["visual"]
    auto_tts: bool = False

class UserProfile(BaseModel):
    """Represents the user's persistent accessibility identity."""
    aura_id: str = Field(default="guest-user", description="Unique ID for persistent profile storage")
    theme: Literal["none", "dark", "contrast"] = "none"
    cognitive: CognitiveProfile = Field(default_factory=CognitiveProfile)
    motor: MotorProfile = Field(default_factory=MotorProfile)
    sensory: SensoryProfile = Field(default_factory=SensoryProfile)
    modalities: ModalityPreferences = Field(default_factory=ModalityPreferences)
    
    # Simple compatibility layer for existing code
    @property
    def cognitive_needs(self) -> bool:
        return self.cognitive.support_level != "none"
    
    @property
    def language_level(self) -> str:
        return "simple" if self.cognitive.simplify_language else "detailed"


# --- LLM Explanation & Action ---

class ExplanationResponse(BaseModel):
    """Structured explanation from the LLM, suitable for Adaptive Cards."""
    summary: str
    actions: list[str] = []  # List of actionable suggestions


class ActionRequest(BaseModel):
    """Payload for requesting an action mapping from LLM."""
    dom_data: dict[str, Any]  # Raw DOM data, will be distilled by backend
    query: str


class ActionResponse(BaseModel):
    """Mapped action from LLM to a specific DOM element."""
    selector: str
    explanation: str | None = None


# --- Feedback ---

class FeedbackRequest(BaseModel):
    aura_id: str
    url: str
    adaptation_id: str | None = None
    helpful: bool
    comment: str | None = None


# --- TTS Request ---

class TTSRequest(BaseModel):
    """Payload for Text-to-Speech request."""
    text: str


# --- Prefetch Request ---

class PrefetchRequest(BaseModel):
    """Payload for URL prefetching."""
    url: HttpUrl

class VerificationRequest(BaseModel):
    """Payload for screenshot-based visual verification."""
    screenshot: str  # Base64 encoded image
    goal: str
    actions_applied: list[str]
    url: str
