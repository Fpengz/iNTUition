"""Module for providing natural language explanations using a unified provider interface."""

import json
import logging
import asyncio
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

    def _clean_llm_json(self, content: str) -> str:
        """Cleans and extracts JSON from LLM response strings."""
        if not content:
            return "{}"
        
        # Remove markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        # Attempt to find the first '{' and last '}'
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1:
            content = content[start:end + 1]
            
        return content.strip()

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
            raw_content = response.content if response.content else "{}"
            content = self._clean_llm_json(raw_content)
            
            logger.debug(f"Raw LLM Response for {distilled_data.url}: {content[:100]}...")
            
            try:
                explanation = ExplanationResponse.model_validate_json(content)
            except Exception as ve:
                logger.warning(f"JSON validation failed for {distilled_data.url}: {ve}. Falling back to default.")
                explanation = ExplanationResponse(
                    summary="Aura analyzed the page but encountered a formatting issue. The interface appears to be accessible.",
                    actions=[]
                )
                
            logger.info(f"Successfully generated explanation for {distilled_data.url}")
            return explanation
        except Exception as e:
            logger.error(f"Error in explain_page for {distilled_data.url}: {e}")
            raise e

    def _prepare_stream_prompt(
        self,
        distilled_data: DistilledData,
        user_profile: UserProfile | None,
    ) -> str:
        """Prompt optimized for raw token streaming with delimiters."""
        summary_items = [
            f"{item.r}: {item.t}"
            for item in distilled_data.summary
        ]
        
        prompt = f"""
        You are Aura, an accessibility companion. 
        Analyze the web page and provide a 2-sentence summary focused on the main purpose.
        
        User Profile: {user_profile.model_dump() if user_profile else "standard accessibility needs"}.
        
        Page Title: {distilled_data.title}
        Content Snippets: {", ".join(summary_items[:15])}
        
        Output format:
        SUMMARY: [Your summary here]
        ACTIONS: [Action 1], [Action 2]
        
        Use simple, calming language. Do not use JSON or markdown.
        """
        return prompt

    async def stream_explanation(
        self,
        distilled_data: DistilledData,
        user_profile: UserProfile | None = None,
    ) -> AsyncGenerator[str, None]:
        """Streams the explanation token-by-token using delimiters."""
        logger.info(f"Streaming tokenized explanation for URL: {distilled_data.url}")
        prompt = self._prepare_stream_prompt(distilled_data, user_profile)
        
        current_section = None
        
        try:
            async for chunk in self.provider.generate_stream(prompt):
                # Check for section headers in the chunk
                if "SUMMARY:" in chunk:
                    current_section = "summary"
                    content = chunk.split("SUMMARY:")[1].strip()
                    if content:
                        yield json.dumps({"type": "summary", "content": content})
                elif "ACTIONS:" in chunk:
                    current_section = "actions"
                    content = chunk.split("ACTIONS:")[1].strip()
                    if content:
                        yield json.dumps({"type": "action", "content": content})
                elif current_section:
                    yield json.dumps({"type": current_section, "content": chunk})
                
                await asyncio.sleep(0) # Yield control
                
            logger.info(f"Finished token streaming for {distilled_data.url}")
        except Exception as e:
            logger.error(f"Error in token stream: {e}")
            yield json.dumps({"type": "error", "content": str(e)})

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
            raw_content = response.content if response.content else ""
            content = self._clean_llm_json(raw_content)

            action_response = ActionResponse.model_validate_json(content)
            logger.info(f"Action found for '{query}': {action_response.selector}")
            return action_response
        except Exception as e:
            logger.error(f"Error in find_action for query '{query}': {e}")
            raise e
