from typing import Any, List, Optional, Dict

from pydantic import BaseModel, Field


class AgentState(BaseModel):
    """Represents the current state of the agent's interaction."""
    
    conversation_history: List[dict[str, str]] = []
    current_url: Optional[str] = None
    dom_summary: Optional[str] = None
    scratchpad: dict[str, Any] = {}

    def add_message(self, role: str, content: str):
        """Adds a message to the conversation history."""
        self.conversation_history.append({"role": role, "content": content})

    def update_context(self, url: str, dom_summary: str):
        """Updates the current page context."""
        self.current_url = url
        self.dom_summary = dom_summary

    def clear(self):
        """Resets the state."""
        self.conversation_history = []
        self.current_url = None
        self.dom_summary = None
        self.scratchpad = {}


class SessionStore:
    """In-memory store for managing agent states across different sessions/tabs."""
    
    def __init__(self) -> None:
        self._sessions: Dict[str, AgentState] = {}

    def get_session(self, session_id: str) -> AgentState:
        """Retrieves or creates a new session state."""
        if session_id not in self._sessions:
            self._sessions[session_id] = AgentState()
        return self._sessions[session_id]

    def clear_session(self, session_id: str):
        """Removes a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]

# Global session store instance
aura_sessions = SessionStore()