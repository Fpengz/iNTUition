import pytest
from app.agent.tools.ui_actions import SetFontSizeTool, SetThemeTool
from app.schemas import UserProfile

@pytest.mark.asyncio
async def test_set_font_size_tool():
    tool = SetFontSizeTool()
    # scale 1.2 means 120%
    result = await tool.run(scale=1.2)
    
    assert result["action"] == "call_ui_tool"
    assert result["tool"] == "IncreaseFontSize"
    assert result["params"]["scale"] == 1.2

@pytest.mark.asyncio
async def test_set_theme_tool():
    tool = SetThemeTool()
    result = await tool.run(theme="dark")
    
    assert result["action"] == "call_ui_tool"
    assert result["tool"] == "SetTheme"
    assert result["params"]["theme"] == "dark"

@pytest.mark.asyncio
async def test_set_theme_tool_invalid():
    tool = SetThemeTool()
    with pytest.raises(Exception):
        # Pydantic should catch this if we validate, 
        # but let's see how our tool handles it.
        await tool.run(theme="invalid_theme")
