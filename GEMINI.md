# Gemini Project Context: Aura (iNTUition 2026)

## Project Overview
Aura is an AI-powered cognitive companion designed for **iNTUition 2026**. It acts as a real-time accessibility bridge, distilling complex web interfaces into meaningful, actionable summaries to reduce cognitive load for users with diverse abilities.

The project consists of a **FastAPI backend** (the "Brain") and a **Chrome Extension** (the "Eyes and Ears") integrated into a persistent Side Panel.

### Core Technologies
- **Backend:** Python 3.12, FastAPI, Pydantic V2, BeautifulSoup4 (for prefetching), gTTS (for TTS).
- **AI Integration:** Google Gemini 2.0 Flash (primary), Ollama (local fallback), and a custom **Agentic OODA Loop** framework.
- **Frontend:** React (TypeScript), Vite, Chrome Side Panel API, Web Speech API (for voice wake-up).
- **Tooling:** `uv` for Python package management, `npm` for extension builds, `pytest` for TDD.

## Architecture & Logic
Aura has evolved from a reactive explainer to a proactive agent:
1.  **DOM Distillation:** Scrapes semantic landmarks and interactive elements, filtering for viewport visibility and deduplicating content.
2.  **Speculative Execution:** Prefetches and caches destination pages on link hover to minimize perceived LLM latency.
3.  **Agentic OODA Loop:** Uses an "Observe-Orient-Decide-Act" cycle. The agent uses a toolkit (Distiller, Explainer, TTS) to resolve user queries.
4.  **Multimodal Interaction:** Supports "Hey Aura" voice wake-word detection via an Offscreen Document and provides auditory feedback via TTS.
5.  **Proactive Assistance:** Detects user struggle (e.g., repetitive clicks on non-interactive areas) to offer help before being asked.

## Building and Running

### Backend
- **Environment:** Requires a `.env` file with `GEMINI_API_KEY`.
- **Install:** `cd backend && uv sync`
- **Run Server:** `export PYTHONPATH=. && uv run uvicorn app.main:app --reload`
- **Test:** `uv run pytest tests/`

### Extension
- **Install:** `cd extension && npm install`
- **Build:** `npm run build`
- **Loading:** Load the `extension/dist` folder as an unpacked extension in Chrome.
- **Permissions:** Visit the `setup.html` page (automatically opens on install) to grant Microphone/Camera access.

## Development Conventions
- **Python Standard:** Strictly use **Python 3.12+** syntax (native `list`, `dict`, and `|` for unions).
- **Type Safety:** All data exchanges must use Pydantic models defined in `app/schemas.py`.
- **TDD:** Follow Test-Driven Development. New features must include tests in `backend/tests/`.
- **Accessibility:** Adhere to WCAG 2.2 standards. Use semantic HTML5, high-contrast CSS variables, and maintain keyboard focus states.
- **Logging:** Use structured logging with `logger.info`, `logger.debug`, and `logger.error` (with `exc_info=True` for exceptions) to facilitate terminal-based debugging.

## Key API Endpoints
- `POST /explain/stream`: SSE endpoint for real-time streaming summaries.
- `POST /prefetch`: Background task for speculative HTML processing.
- `POST /action`: Natural language mapping of queries to CSS selectors.
- `POST /chat`: Direct interface to the agentic OODA reasoning loop.
- `POST /tts`: Generates MP3 bytes from text.
