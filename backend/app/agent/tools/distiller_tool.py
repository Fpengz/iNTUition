from typing import Any

from pydantic import BaseModel

from app.agent.tools.base import BaseTool
from app.core.distiller import DOMDistiller
from app.schemas import DistilledData, DOMData


class DistillerToolSchema(BaseModel):
    dom_data: dict[str, Any]


class DistillerTool(BaseTool):
    name: str = "dom_distiller"
    description: str = "Distills raw DOM data into a manageable format for LLMs."
    args_schema: type[BaseModel] = DistillerToolSchema

    async def run(self, **kwargs: Any) -> DistilledData:
        """Runs the DOM distillation."""
        dom_data = kwargs.get("dom_data")
        # Convert dict to DOMData model
        model_data = DOMData(**dom_data) if isinstance(dom_data, dict) else dom_data
        return DOMDistiller.distill(model_data)
