import inspect
from pydantic_ai.models.gemini import GeminiModel

print(inspect.signature(GeminiModel.__init__))
