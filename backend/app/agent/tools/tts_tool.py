from typing import Type

from app.agent.tools.base import BaseTool
from app.core.tts import AuraTTS
from pydantic import BaseModel


class TTSToolSchema(BaseModel):
    text: str


class TTSTool(BaseTool):
    name: str = "tts_synthesizer"
    description: str = "Converts text into audio (MP3) for auditory accessibility."
    args_schema: Type[BaseModel] = TTSToolSchema

    def __init__(self) -> None:
        self.tts = AuraTTS()

    async def run(self, text: str) -> bytes:
        """Runs the TTS synthesis."""
        return self.tts.synthesize_speech(text)
