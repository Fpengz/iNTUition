"""Utility for formatting user-friendly error messages."""

import logging

logger = logging.getLogger(__name__)

def format_friendly_error(e: Exception) -> str:
    """Converts technical exceptions into calming, user-friendly messages."""
    error_msg = str(e)
    
    # Connection issues (Ollama, Gemini, OpenAI)
    if any(term in error_msg.lower() for term in ["connection", "refused", "errno 61", "timeout", "unreachable"]):
        return "Aura Brain is temporarily offline. Please ensure the local LLM or API provider is accessible."
    
    # Model missing issues
    if "not found" in error_msg.lower() and "model" in error_msg.lower():
        return "The requested AI model could not be found. Please check your configuration."
    
    # Authentication issues
    if any(term in error_msg.lower() for term in ["api key", "unauthorized", "invalid key"]):
        return "Authentication with the AI provider failed. Please check your API keys."

    # Rate limiting
    if "rate limit" in error_msg.lower() or "429" in error_msg:
        return "Aura is receiving too many requests. Please wait a moment before trying again."

    # Generic fallback
    return "Aura encountered an unexpected issue while processing the page."
