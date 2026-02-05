# Gemini Project Context: iNTUition 2026

## Project Overview
This project is for **iNTUition 2026**, an AI-focused hackathon organized by the IEEE NTU Student Chapter. The core challenge is to solve **Interface Accessibility** problems using AI.

- **Problem Statement:** Build a functional, end-to-end system that adapts digital interfaces for users with diverse abilities (visual, auditory, motor, or cognitive). Solutions must go beyond mockups and provide multimodal interactions (text, speech, vision, or UI adaptation) that can be demonstrated live.
- **Primary Language:** Python 3.12 (as specified in `.python-version` and `pyproject.toml`).
- **Package Management:** `uv` is preferred.
- **Linting & Type Checking:** `ruff` for linting and formatting, and `mypy` (often referred to as `ty` by the user) for type checking.

## Judging Criteria
1. **Impact (25%):** Clear identification of accessibility barriers and measurable reduction in user burden.
2. **Real-time Performance & Latency (25%):** Responsiveness to multimodal inputs and stability.
3. **Design (25%):** Integration of AI, backend, and UI; dynamic adaptation; reliability of the live demo.
4. **Innovation & Creativity (25%):** Novel use of AI beyond standard accessibility tools (like simple screen readers).

## Building and Running
### Backend
- **Environment Setup:**
  ```bash
  cd backend
  cp .env.template .env  # Add your GEMINI_API_KEY
  uv sync
  ```
- **Running the Server:**
  ```bash
  cd backend
  export PYTHONPATH=.
  uv run uvicorn app.main:app --reload
  ```
- **Verification:**
  ```bash
  cd backend
  uv run python verify_backend.py
  ```

### Frontend
- **Setup:**
  - The frontend is managed by the user. Ensure it connects to `http://localhost:8000`.

## Key Files
- `backend/app/main.py`: FastAPI entry point with endpoints for explanations, TTS, and streaming.
- `backend/app/core/distiller.py`: DOM distillation logic, optimized for payload reduction.
- `backend/app/core/explainer.py`: Gemini LLM integration, generating structured JSON for UI.
- `backend/app/core/tts.py`: Text-to-Speech synthesis service.
- `backend/app/core/cache.py`: In-memory TTL cache for LLM responses and audio.
- `extension/src/App.tsx`: Main React component for the extension popup, handling state and streaming.
- `extension/src/components/AdaptiveCardDisplay.tsx`: React component for rendering the Adaptive Card UI.
- `extension/src/services/speechRecognition.ts`: Service for handling voice recognition.
- `extension/src/background.ts`: Background service worker for wake-word detection.
- `AGENTIC_ARCHITECTURE.md`: Document outlining the future vision for an agentic Aura.
- `TODO.md`: Project roadmap and task tracking.
- `PERFORMANCE_PLAN.md`: Performance optimization strategy and progress.

## Technical Details: DOM Extraction
Aura uses a **Content Script** to scrape the DOM using `document.querySelectorAll`. The scraping is now selective, targeting key interactive and structural elements. It extracts semantic data (roles, labels), filters out hidden or visually insignificant elements, detects viewport visibility (`in_viewport`), and sorts elements (viewport-first, then by vertical position). This refined data is then serialized into a compact JSON format.

The backend's `DOMDistiller` further processes this data, deduplicating elements by text, truncating text content, and shortening JSON keys (e.g., `role` to `r`, `text` to `t`, `in_viewport` to `v`) to minimize payload size and LLM token usage. This distilled data is then used by the `AuraExplainer` and `Gemini API`. For a full technical breakdown, see `extension/README.md`.

## Key Features

-   **Adaptive Card UI:** Explanations are rendered in a clean, structured card format, separating the summary from suggested actions.
-   **Text-to-Speech (TTS):** Users can click a button to have the page summary read aloud.
-   **Voice Wake-up:** The extension can be activated hands-free by saying "Hey Aura".
-   **Streaming Responses:** Explanations are streamed from the backend in real-time, appearing word-by-word for a more responsive user experience.

## Future Vision: Agentic Aura

To move beyond single-turn explanations, a long-term architectural vision has been created to evolve Aura into a proactive, agentic web assistant capable of multi-step tasks.

For more details, see [AGENTIC_ARCHITECTURE.md](./AGENTIC_ARCHITECTURE.md).

