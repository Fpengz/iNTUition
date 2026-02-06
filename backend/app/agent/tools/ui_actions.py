from typing import Any, Type, Literal
from pydantic import BaseModel, Field
from app.agent.tools.base import BaseTool

class SetFontSizeSchema(BaseModel):
    scale: float = Field(..., description="The scale factor for font size (e.g., 1.2 for 120%)")

class SetFontSizeTool(BaseTool):
    name: str = "set_font_size"
    description: str = "Adjusts the font size of the webpage content."
    args_schema: Type[BaseModel] = SetFontSizeSchema

    async def run(self, scale: float) -> dict[str, Any]:
        return {
            "action": "call_ui_tool",
            "tool": "IncreaseFontSize",
            "params": {"scale": scale}
        }

class SetThemeSchema(BaseModel):
    theme: Literal["none", "dark", "contrast"] = Field(..., description="The accessibility theme to apply")

class SetThemeTool(BaseTool):
    name: str = "set_theme"
    description: str = "Applies an accessibility theme (dark mode or high contrast) to the page."
    args_schema: Type[BaseModel] = SetThemeSchema

    async def run(self, theme: str) -> dict[str, Any]:
        # Validate theme against schema manually for the test case if not using PydanticAI's auto-validation
        validated = SetThemeSchema(theme=theme)
        return {
            "action": "call_ui_tool",
            "tool": "SetTheme",
            "params": {"theme": validated.theme}
        }
