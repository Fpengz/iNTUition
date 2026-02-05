# Aura Agentic Architecture Vision

This document outlines a future architectural vision for evolving Aura from a responsive accessibility tool into a proactive, agentic web-browsing assistant.

## 1. Current Architecture (Request-Response)

Aura currently operates on a primarily reactive, request-response model:
1.  **User Action:** The user clicks "Explain this Page" or speaks a wake word.
2.  **Frontend:** The extension scrapes the DOM and sends it to the backend.
3.  **Backend:** The backend distills the DOM, queries an LLM for a summary, and streams a response.
4.  **Frontend:** The UI renders the response.

This is effective but limited. The "intelligence" is confined to a single turn of reasoning by the LLM.

## 2. Future Vision: Proactive Agentic Loop

The future vision is to transform Aura into an agent that can reason, plan, and execute multi-step tasks on behalf of the user. This is based on a classic **Observe-Orient-Decide-Act (OODA)** loop.

-   **Observe:** Aura continuously perceives the state of the web page (DOM, user events, etc.).
-   **Orient:** It uses an LLM to understand the context, the user's potential goals, and what's possible on the page.
-   **Decide:** The LLM forms a plan, deciding which tool to use next (e.g., `click_element`, `fill_input`, `navigate_to_url`).
-   **Act:** Aura executes the chosen tool, changing the state of the web page.

This loop would allow Aura to perform complex actions like "Book the next available flight to Singapore" or "Find the contact form and send a message asking about order status."

## 3. Proposed Agentic Components

To achieve this, the backend architecture would need to evolve to include the following components, potentially leveraging a framework like **LangChain**, **LlamaIndex**, or a custom implementation.

### a. State Manager
-   **Responsibility:** Manages the state of the interaction, including conversation history, current page URL, and a summary of the DOM.
-   **Implementation:** Could be a simple in-memory store for short-term tasks or a more persistent store for long-running operations.

### b. Tool Registry & Toolkit
-   **Responsibility:** A collection of functions (tools) that the agent can decide to use. The current services (`DOMDistiller`, `AuraExplainer`, `AuraTTS`) would be refactored into tools.
-   **Pydantic Integration:** The Pydantic schemas now used for API requests and responses (e.g., `DOMData`, `ExplanationResponse`, `TTSRequest`, `PrefetchRequest`) directly define the expected inputs and outputs of these tools. This provides a strong, type-safe foundation for agentic frameworks to understand and interact with each tool's interface.
-   **Example Tools:**
    -   `read_page_summary()`: Returns the high-level summary.
    -   `find_element(description: str)`: Finds a specific element based on a text description.
    -   `click_element(selector: str)`: Clicks a given element.
    -   `fill_input(selector: str, text: str)`: Fills an input field.
    -   `navigate(url: str)`: Goes to a new URL.
    -   `ask_user(question: str)`: Pauses execution and asks the user for clarification via the UI.

### c. Agent Core (The "Brain")
-   **Responsibility:** The central orchestrator that runs the agent loop.
-   **Implementation:**
    1.  Receives the initial user goal (e.g., "book a flight").
    2.  Enters a loop:
    3.  It formats a prompt for the LLM containing the current state, available tools, and the overall goal.
    4.  The LLM responds with a "thought" and a "tool to use" (with parameters). This is often achieved using ReAct (Reasoning and Acting) prompting.
    5.  The Agent Core parses the LLM's response and executes the chosen tool.
    6.  It captures the result from the tool, updates the state, and repeats the loop until the goal is achieved.

## 4. High-Level Roadmap

**Step 1: Refactor Backend Services into Tools**
-   Isolate the existing `DOMDistiller`, `AuraExplainer`, and `AuraTTS` into self-contained, tool-like functions that can be called independently.

**Step 2: Implement a Basic Agent Loop**
-   Create a new endpoint (e.g., `/agent/execute`).
-   Build a simple agent core that can use one or two tools (e.g., `read_page_summary` and `find_element`).

**Step 3: Expand the Toolkit**
-   Gradually add more tools for interacting with web pages (`click`, `fill_input`). This will require the Chrome extension to have functions that the backend can invoke.

**Step 4: Introduce State Management**
-   Implement a state manager to handle multi-step tasks and conversation history.

This architectural shift would represent a significant leap in Aura's capabilities, moving it from a simple accessibility layer to a true AI partner for navigating the web.
