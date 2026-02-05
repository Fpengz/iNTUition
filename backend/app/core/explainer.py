"""Module for providing natural language explanations using a unified provider interface."""

from typing import Any

from app.core.factory import get_provider


class AuraExplainer:
    """Uses a unified LLM provider to explain web pages and find actions."""

    def __init__(self) -> None:
        """Initializes the AuraExplainer with the configured provider."""
        self.provider = get_provider()

    async def explain_page(
        self, distilled_dom: dict[str, Any], user_profile: dict[str, Any] | None = None
    ) -> str:
        """Generates a summary of the distilled DOM using the configured provider."""
        prompt = f"""
        You are Aura, an accessibility companion.
        Analyze this distilled web page and provide a concise, 2-3 sentence summary for a user with cognitive impairments.

        Page Title: {distilled_dom['title']}
        Elements: {distilled_dom['summary']}
        Possible Actions: {distilled_dom['actions']}

        User Needs: {user_profile if user_profile else "General accessibility support"}

        Focus on:
        1. What is this page for?
        2. What is the most important thing to do here?
        3. Keep the language simple and calming.
        """

        try:
            response = await self.provider.generate(prompt)
            return response.content if response.content else "Could not generate explanation."
        except Exception as e:
            return f"Aura Error (Provider): {str(e)}"

    async def find_action(
        self, distilled_dom: dict[str, Any], query: str
    ) -> dict[str, Any]:
        """Maps a natural language query to a specific DOM element."""
        prompt = f"""
        Based on these web elements, which one should the user interact with to: "{query}"?

        Elements: {distilled_dom['actions']}

        Return ONLY the JSON selector of the best matching element.
        Example output: {{"selector": "#submit-button", "explanation": "Click this to send your form."}}
        If no match found, return: {{"error": "No matching action found"}}
        """

        try:
            response = await self.provider.generate(prompt)
            return {"response": response.content if response.content else "No action found."}
        except Exception as e:
            return {"error": f"Aura Error (Provider): {str(e)}"}

