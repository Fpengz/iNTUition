from typing import Any, Optional, Type

from app.agent.tools.base import BaseTool
from app.core.explainer import AuraExplainer
from app.schemas import DistilledData, ExplanationResponse, UserProfile
from pydantic import BaseModel


class ExplainerToolSchema(BaseModel):
    distilled_data: dict[str, Any]
    user_profile: Optional[dict[str, Any]] = None


class ExplainerTool(BaseTool):
    name: str = "aura_explainer"
    description: str = "Generates a structured explanation of a distilled web page."
    args_schema: Type[BaseModel] = ExplainerToolSchema

    def __init__(self) -> None:
        self.explainer = AuraExplainer()

    async def run(
        self, distilled_data: dict[str, Any], user_profile: Optional[dict[str, Any]] = None
    ) -> ExplanationResponse:
        """Runs the explanation logic."""
        model_distilled = DistilledData(**distilled_data)
        model_profile = UserProfile(**user_profile) if user_profile else None
        return await self.explainer.explain_page(model_distilled, model_profile)
