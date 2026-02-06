from pydantic_ai.models import Model
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.ollama import OllamaProvider
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings

def get_model() -> Model:
    """Returns the configured model for PydanticAI based on settings."""
    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "gemini":
        # For Gemini, we use GoogleProvider with GoogleModel
        google_provider = GoogleProvider(
            api_key=settings.GEMINI_API_KEY
        )
        return GoogleModel(
            settings.GEMINI_MODEL,
            provider=google_provider
        )
    elif provider == "ollama":
        # For Ollama, we use OllamaProvider with OpenAIChatModel
        ollama_provider = OllamaProvider(
            base_url=f"{settings.OLLAMA_HOST}/v1"
        )
        return OpenAIChatModel(
            settings.OLLAMA_MODEL,
            provider=ollama_provider
        )
    elif provider == "openai":
        # For OpenAI, we use OpenAIProvider with OpenAIChatModel
        openai_provider = OpenAIProvider(
            api_key=settings.OPENAI_API_KEY
        )
        return OpenAIChatModel(
            settings.OPENAI_MODEL,
            provider=openai_provider
        )
    else:
        # Default fallback to Gemini
        google_provider = GoogleProvider(
            api_key=settings.GEMINI_API_KEY
        )
        return GoogleModel(
            settings.GEMINI_MODEL,
            provider=google_provider
        )
