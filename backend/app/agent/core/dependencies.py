import os
from pydantic_ai.models.google import GoogleModel

def get_model() -> GoogleModel:

    """Returns the Gemini model configured for PydanticAI."""

    # pydantic-ai GoogleModel picks up API key from GEMINI_API_KEY or GOOGLE_API_KEY env vars

    # Environment variables are already mapped in main.py

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    return GoogleModel(model_name)
