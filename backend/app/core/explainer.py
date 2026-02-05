"""Module for providing natural language explanations using a unified provider interface."""

import json
from typing import Any, AsyncGenerator

from app.core.factory import get_provider


class AuraExplainer:
    """Uses a unified LLM provider to explain web pages and find actions."""

    def __init__(self) -> None:
        """Initializes the AuraExplainer with the configured provider."""
        self.provider = get_provider()

    def _prepare_explain_prompt(self, distilled_dom: dict[str, Any], user_profile: dict[str, Any] | None) -> str:
        """Helper to create a consistent prompt for explanation."""
        # Prioritize items with 'v': True (visible in viewport)
        summary_items = [
            f"{'[VISIBLE] ' if item.get('v') else ''}{item['r']}: {item['t']}" 
            for item in distilled_dom['summary']
        ]
        action_items = [
            f"{'[VISIBLE] ' if item.get('v') else ''}{item['r']}: {item['t']}" 
            for item in distilled_dom['actions']
        ]

        return f"""
        You are Aura, an accessibility companion. 
        Summarize this page in 2 simple sentences for a user with: {user_profile if user_profile else "cognitive needs"}.
        
        IMPORTANT: Focus primarily on elements marked as [VISIBLE], as these are currently on the user's screen.

        Title: {distilled_dom['title']}
        Content: {", ".join(summary_items[:20])}
        Actions: {", ".join(action_items[:15])}

        Rules:
        1. What is this page?
        2. What is the main action visible right now?
        3. Use calming, simple language.
        """

    async def explain_page(
        self, distilled_dom: dict[str, Any], user_profile: dict[str, Any] | None = None
    ) -> str:
        """Generates a summary of the distilled DOM using the configured provider."""
        prompt = self._prepare_explain_prompt(distilled_dom, user_profile)
        try:
            response = await self.provider.generate(prompt)
            return response.content if response.content else "Could not generate explanation."
        except Exception as e:
            return f"Aura Error (Provider): {str(e)}"

    async def stream_explanation(
        self, distilled_dom: dict[str, Any], user_profile: dict[str, Any] | None = None
    ) -> AsyncGenerator[str, None]:
        """Streams a summary of the distilled DOM."""
        prompt = self._prepare_explain_prompt(distilled_dom, user_profile)
        try:
            async for chunk in self.provider.generate_stream(prompt):
                yield chunk
        except Exception as e:
            yield f"Aura Error (Stream): {str(e)}"

    async def find_action(
        self, distilled_dom: dict[str, Any], query: str
    ) -> dict[str, Any]:
        """Maps a natural language query to a specific DOM element."""
        # Provide only necessary fields to the LLM
        compact_actions = [{"t": item['t'], "r": item['r'], "s": item['s']} for item in distilled_dom['actions']]

        prompt = f"""
        User wants to: "{query}"
        Elements: {compact_actions}

        Return ONLY a JSON object: {{"selector": "...", "explanation": "..."}}
        Match the user's intent to the best element 't' (text) or 'r' (role).
        """

        try:
            response = await self.provider.generate(prompt)
            # The provider might return markdown, we should try to extract JSON
            content = response.content if response.content else ""
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "{" in content:
                content = content[content.find("{"):content.rfind("}")+1]
            
            return json.loads(content)
        except Exception as e:
            return {"error": f"Aura Error: {str(e)}"}

