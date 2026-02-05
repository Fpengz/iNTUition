from typing import Any, Type

from app.agent.tools.base import BaseTool
from app.core.distiller import DOMDistiller
from app.schemas import DOMData, DistilledData
from pydantic import BaseModel


class DistillerToolSchema(BaseModel):
    dom_data: dict[str, Any]


class DistillerTool(BaseTool):
    name: str = "dom_distiller"
    description: str = "Distills raw DOM data into a manageable format for LLMs."
    args_schema: Type[BaseModel] = DistillerToolSchema

    async def run(self, dom_data: dict[str, Any]) -> DistilledData:
        """Runs the DOM distillation."""
        # Convert dict to DOMData model
        model_data = DOMData(**dom_data)
        return DOMDistiller.distill(model_data)
