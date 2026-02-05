"""Pydantic schemas for data exchange within the Aura backend."""

from typing import List, Optional, Dict, Any

from pydantic import BaseModel, HttpUrl, Field


# --- DOM Scraping & Distillation ---

class DOMElement(BaseModel):
    """Represents a single scraped DOM element before distillation."""
    role: str
    text: str
    selector: str
    aria_label: Optional[str] = None
    in_viewport: Optional[bool] = False
    y: Optional[int] = None # Vertical position for sorting

class DOMData(BaseModel):
    """Payload from the frontend content script containing raw DOM elements."""
    title: str
    url: HttpUrl
    elements: List[DOMElement]


class DistilledElement(BaseModel):
    """Represents a single DOM element after distillation for LLM consumption."""
    r: str = Field(..., alias="role")  # role
    t: str = Field(..., alias="text")  # text content
    s: Optional[str] = Field(None, alias="selector")  # CSS selector for mapping back
    l: Optional[str] = Field(None, alias="aria_label")  # aria_label
    v: Optional[bool] = Field(False, alias="in_viewport")  # is in viewport

    class Config:
        allow_population_by_field_name = True # Allow using 'role' as input for 'r'


class DistilledData(BaseModel):
    """Distilled DOM information, ready for LLM processing."""
    title: str
    url: HttpUrl
    summary: List[DistilledElement]
    actions: List[DistilledElement]


# --- User Profile ---

class UserProfile(BaseModel):
    """Represents the user's accessibility profile."""
    # This can be expanded based on specific needs (e.g., visual_impairment: bool, cognitive_load_tolerance: str)
    cognitive_needs: bool = True
    language_level: str = "simple"
    # Add other relevant profile attributes as needed


# --- LLM Explanation & Action ---

class ExplanationResponse(BaseModel):
    """Structured explanation from the LLM, suitable for Adaptive Cards."""
    summary: str
    actions: List[str] = [] # List of actionable suggestions


class ActionRequest(BaseModel):
    """Payload for requesting an action mapping from LLM."""
    dom_data: Dict[str, Any] # Raw DOM data, will be distilled by backend
    query: str


class ActionResponse(BaseModel):
    """Mapped action from LLM to a specific DOM element."""
    selector: str
    explanation: Optional[str] = None


# --- TTS Request ---

class TTSRequest(BaseModel):
    """Payload for Text-to-Speech request."""
    text: str


# --- Prefetch Request ---

class PrefetchRequest(BaseModel):
    """Payload for URL prefetching."""
    url: HttpUrl

