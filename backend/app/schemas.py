"""Pydantic schemas for data exchange within the Aura backend."""

from typing import Any

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
    actions: list[str] = []  # List of actionable suggestions


class ActionRequest(BaseModel):
    """Payload for requesting an action mapping from LLM."""
    dom_data: dict[str, Any]  # Raw DOM data, will be distilled by backend
    query: str


class ActionResponse(BaseModel):
    """Mapped action from LLM to a specific DOM element."""
    selector: str
    explanation: str | None = None


# --- TTS Request ---

class TTSRequest(BaseModel):
    """Payload for Text-to-Speech request."""
    text: str


# --- Prefetch Request ---

class PrefetchRequest(BaseModel):
    """Payload for URL prefetching."""
    url: HttpUrl
