from pydantic_ai.models.google import GoogleModel
from app.core.config import settings

def get_model() -> GoogleModel:
    """Returns the Gemini model configured for PydanticAI."""
    # pydantic-ai GoogleModel picks up API key from GEMINI_API_KEY or GOOGLE_API_KEY env vars
    model_name = settings.GEMINI_MODEL
    return GoogleModel(model_name)
