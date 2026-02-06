import os
from pydantic_ai.models.gemini import GeminiModel

def get_model() -> GeminiModel:
    """Returns the Gemini model configured for PydanticAI."""
    # pydantic-ai GeminiModel picks up API key from GEMINI_API_KEY or GOOGLE_API_KEY env vars
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    return GeminiModel(model_name)