"""Module for providing natural language explanations of web pages using Gemini."""

import os
from typing import Any

from google import genai


class AuraExplainer:
    """Uses Gemini to explain web pages and find actions.

    Attributes:
        client: The Google GenAI client instance.
    """

    def __init__(self) -> None:
        """Initializes the AuraExplainer with the Gemini API key."""
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client: genai.Client | None = genai.Client(api_key=api_key)
        else:
            self.client = None

    async def explain_page(
        self, distilled_dom: dict[str, Any], user_profile: dict[str, Any] | None = None
    ) -> str:
        """Generates a summary of the distilled DOM.

        Args:
            distilled_dom: The distilled representation of the page.
            user_profile: Optional user preferences and needs.

        Returns:
            A natural language summary of the page.
        """
        if not self.client:
            return "Aura is currently offline (Missing API Key)."

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

        response = self.client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        return str(response.text) if response.text else "Could not generate explanation."

    async def find_action(
        self, distilled_dom: dict[str, Any], query: str
    ) -> dict[str, Any]:
        """Maps a natural language query to a specific DOM element.

        Args:
            distilled_dom: The distilled representation of the page.
            query: The user's natural language query (e.g., "How do I pay?").

        Returns:
            A dictionary containing the selector and an explanation, or an error.
        """
        if not self.client:
            return {"error": "API Offline"}

        prompt = f"""
        Based on these web elements, which one should the user interact with to: "{query}"?

        Elements: {distilled_dom['actions']}

        Return ONLY the JSON selector of the best matching element.
        Example output: {{"selector": "#submit-button", "explanation": "Click this to send your form."}}
        If no match found, return: {{"error": "No matching action found"}}
        """

        response = self.client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        # In a real implementation, we'd parse the JSON from the LLM response carefully.
        return {"response": str(response.text) if response.text else "No action found."}

