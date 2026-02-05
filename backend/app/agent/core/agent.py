import json
import logging
import re
from typing import Any, List

from app.agent.core.state import AgentState
from app.agent.tools.base import BaseTool
from app.core.factory import get_provider

logger = logging.getLogger(__name__)


class AuraAgent:
    """The central agent orchestrator for Aura, implementing an OODA-style loop."""

    def __init__(self, tools: List[BaseTool]) -> None:
        self.tools = {tool.name: tool for tool in tools}
        self.provider = get_provider()
        self.state = AgentState()
        self.max_iterations = 5

    def _prepare_prompt(self, user_query: str) -> str:
        """Prepares the ReAct prompt for the LLM."""
        tool_descriptions = "\n".join(
            [f"- {tool.name}: {tool.description}" for tool in self.tools.values()]
        )
        
        prompt = f"""
        You are Aura, a proactive AI accessibility assistant.
        Your goal is to help the user navigate and understand the web.

        Available Tools:
        {tool_descriptions}

        Use the following format:
        Thought: You should always think about what to do.
        Action: The action to take, should be one of [{", ".join(self.tools.keys())}]
        Action Input: The input to the action (as a JSON object).
        Observation: The result of the action.
        ... (this Thought/Action/Action Input/Observation can repeat)
        Final Answer: The final response to the user.

        Current Session State:
        - URL: {self.state.current_url}
        - Page Summary: {self.state.dom_summary}

        User Request: {user_query}
        """
        return prompt

    async def execute(self, user_query: str) -> str:
        """Runs the OODA loop to resolve a user query."""
        logger.info(f"Agent OODA Loop started for: {user_query}")
        self.state.add_message("user", user_query)
        
        for i in range(self.max_iterations):
            prompt = self._prepare_prompt(user_query)
            response = await self.provider.generate(prompt)
            content = response.content
            
            if "Final Answer:" in content:
                final_answer = content.split("Final Answer:")[1].strip()
                self.state.add_message("assistant", final_answer)
                return final_answer

            # Parse Action and Action Input
            try:
                action_match = re.search(r"Action: (.*)", content)
                input_match = re.search(r"Action Input: (.*)", content)
                
                if action_match and input_match:
                    tool_name = action_match.group(1).strip()
                    tool_input_str = input_match.group(1).strip()
                    tool_input = json.loads(tool_input_str)
                    
                    if tool_name in self.tools:
                        logger.info(f"Executing Tool: {tool_name} with {tool_input}")
                        observation = await self.tools[tool_name].run(**tool_input)
                        user_query += f"\nObservation: {observation}"
                    else:
                        user_query += f"\nObservation: Error - Tool '{tool_name}' not found."
                else:
                    logger.warning("Could not parse Action/Input from LLM response.")
                    break
            except Exception as e:
                logger.error(f"Error in OODA loop: {e}")
                break

        return "I'm sorry, I encountered an error while trying to help you."