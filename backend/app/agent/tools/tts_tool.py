
from typing import Any

from pydantic import BaseModel

from app.agent.tools.base import BaseTool
from app.core.tts import AuraTTS


class TTSToolSchema(BaseModel):
    text: str


class TTSTool(BaseTool):
    name: str = "tts_synthesizer"
    description: str = "Converts text into audio (MP3) for auditory accessibility."
    args_schema: type[BaseModel] = TTSToolSchema

    def __init__(self) -> None:
        self.tts = AuraTTS()

    async def run(self, **kwargs: Any) -> bytes:
        """Runs the TTS synthesis."""
        text = kwargs.get("text", "")
        return self.tts.synthesize_speech(text)
