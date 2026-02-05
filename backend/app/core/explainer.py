"""Module for providing natural language explanations using a unified provider interface."""

import json
import logging
from collections.abc import AsyncGenerator

from app.core.factory import get_provider
from app.schemas import (
    ActionResponse,
    DistilledData,
    ExplanationResponse,
    UserProfile,
)

logger = logging.getLogger(__name__)


class AuraExplainer:
    """Uses a unified LLM provider to explain web pages and find actions."""

    def __init__(self) -> None:
        """Initializes the AuraExplainer with the configured provider."""
        self.provider = get_provider()

    def _prepare_explain_prompt(
        self,
        distilled_data: DistilledData,
        user_profile: UserProfile | None,
    ) -> str:
        """Helper to create a consistent prompt for explanation."""
        summary_items = [
            f"{'[VISIBLE] ' if item.v else ''}{item.r}: {item.t}"
            for item in distilled_data.summary
        ]
        action_items = [
            f"{item.t}"
            for item in distilled_data.actions
            if item.v
        ]

        prompt = f"""
        You are Aura, an accessibility companion. Your task is to create a structured JSON output for an Adaptive Card UI.
        Analyze the provided web page context and generate a JSON object with two keys: "summary" and "actions".

        - "summary": A concise, 2-sentence summary for a user with: {user_profile.model_dump() if user_profile else "cognitive needs"}. Focus on the page's main purpose.
        - "actions": A list of 2-3 brief, actionable suggestions based on the most important visible elements.

        IMPORTANT: Prioritize elements marked as [VISIBLE].

        Page Title: {distilled_data.title}
        Content: {", ".join(summary_items[:20])}
        Visible Actions: {", ".join(action_items[:10])}

        Rules for output:
        1.  Return ONLY a valid JSON object. Do not include markdown or any other text.
        2.  The "summary" must be a single string.
        3.  The "actions" must be a JSON array of strings.
        4.  Use simple, calming language.

        Example JSON output:
        {{
            "summary": "This is a login page. You can enter your credentials to access your account.",
            "actions": ["Enter username", "Enter password", "Click Login"]
        }}
        """
        return prompt

    async def explain_page(
        self,
        distilled_data: DistilledData,
        user_profile: UserProfile | None = None,
    ) -> ExplanationResponse:
        """Generates a structured summary of the distilled DOM."""
        logger.info(f"Generating explanation for URL: {distilled_data.url}")
        prompt = self._prepare_explain_prompt(distilled_data, user_profile)
        try:
            response = await self.provider.generate(prompt)
            content = response.content if response.content else "{}"
            
            # Clean potential markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            logger.debug(f"Raw LLM Response for {distilled_data.url}: {content[:100]}...")
            explanation = ExplanationResponse.model_validate_json(content)
            logger.info(f"Successfully generated explanation for {distilled_data.url}")
            return explanation
        except Exception as e:
            logger.error(f"Error in explain_page for {distilled_data.url}: {e}")
            raise e

    async def stream_explanation(
        self,
        distilled_data: DistilledData,
        user_profile: UserProfile | None = None,
    ) -> AsyncGenerator[str, None]:
        """Streams a structured summary of the distilled DOM as JSON chunks."""
        logger.info(f"Streaming explanation for URL: {distilled_data.url}")
        prompt = self._prepare_explain_prompt(distilled_data, user_profile)
        try:
            response_text = await self.provider.generate(prompt)
            content = response_text.content if response_text.content else "{}"
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()

            explanation_data = ExplanationResponse.model_validate_json(content)

            if explanation_data.summary:
                logger.debug(f"Yielding summary chunk for {distilled_data.url}")
                yield json.dumps(
                    {"type": "summary", "content": explanation_data.summary}
                )

            if explanation_data.actions:
                for action in explanation_data.actions:
                    logger.debug(f"Yielding action chunk: {action}")
                    yield json.dumps({"type": "action", "content": action})
            
            logger.info(f"Finished streaming explanation for {distilled_data.url}")
        except Exception as e:
            logger.error(f"Error in stream_explanation for {distilled_data.url}: {e}")
            yield json.dumps(
                {"type": "error", "content": f"Aura Error (Stream): {str(e)}"}
            )

    async def find_action(
        self, distilled_data: DistilledData, query: str
    ) -> ActionResponse:
        """Maps a natural language query to a specific DOM element."""
        logger.info(
            f"Finding action for query: '{query}' on URL: {distilled_data.url}"
        )
        compact_actions = [
            {"t": item.t, "r": item.r, "s": item.s}
            for item in distilled_data.actions
        ]

        prompt = f"""
        User wants to: "{query}"
        Elements: {compact_actions}

        Return ONLY a JSON object: {{"selector": "...", "explanation": "..."}}
        Match the user's intent to the best element 't' (text) or 'r' (role).
        """
        try:
            response = await self.provider.generate(prompt)
            content = response.content if response.content else ""
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "{" in content:
                content = content[content.find("{") : content.rfind("}") + 1]

            action_response = ActionResponse.model_validate_json(content)
            logger.info(f"Action found for '{query}': {action_response.selector}")
            return action_response
        except Exception as e:
            logger.error(f"Error in find_action for query '{query}': {e}")
            raise e
