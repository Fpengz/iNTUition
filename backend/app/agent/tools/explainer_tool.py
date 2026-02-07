from typing import Any

from pydantic import BaseModel

from app.agent.tools.base import BaseTool
from app.core.explainer import AuraExplainer
from app.schemas import DistilledData, ExplanationResponse, UserProfile


class ExplainerToolSchema(BaseModel):
    distilled_data: dict[str, Any]
    user_profile: dict[str, Any] | None = None


class ExplainerTool(BaseTool):
    name: str = "aura_explainer"
    description: str = "Generates a structured explanation of a distilled web page."
    args_schema: type[BaseModel] = ExplainerToolSchema

    def __init__(self) -> None:
        self.explainer = AuraExplainer()

    async def run(
        self, **kwargs: Any
    ) -> ExplanationResponse:
        """Runs the explanation logic."""
        distilled_data = kwargs.get("distilled_data")
        user_profile = kwargs.get("user_profile")
        model_distilled = DistilledData(**distilled_data) if isinstance(distilled_data, dict) else distilled_data
        model_profile = UserProfile(**user_profile) if user_profile else None
        return await self.explainer.explain_page(model_distilled, model_profile)
