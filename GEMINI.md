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

<state_snapshot>
    <overall_goal>
        Optimize and finalize Aura, a multi-agent AI accessibility companion, ensuring research-grade robustness, 100% test coverage, and a stable OODA loop for real-time web adaptation.
    </overall_goal>

    <active_constraints>
        - Python 3.12+ syntax (native `|` for unions, list/dict types).
        - Target 100% test coverage for all backend and extension logic.
        - Strict Type Safety: Pydantic V2 models and `ty` (mypy) compliance.
        - Accessibility: WCAG 2.2; semantic landmarks; Shadow DOM isolation.
        - TDD: Mandatory tests in `backend/tests/` or `extension/src/` for new logic.
        - Performance: Max 40 elements/category; compressed JSON keys (`r`, `t`, `v`); cache TTL 30m.
    </active_constraints>

    <key_knowledge>
        - PydanticAI Type System: `AgentRunResult` requires explicit `cast` for `.data` access to satisfy `ty` in `app/agent/core/runtime.py`.
        - Test Isolation: Global `conftest.py` mocks cause agents to share identity; `side_effect` must inspect strings like "snapshot", "Assessment", or "Before:" to return correct mocked models.
        - Cache Mechanics: MD5 stable hashing of (DistilledDOM + UserProfile) determines keys; `X-Process-Time` header tracks overhead.
        - Struggle Detection Thresholds: 5 clicks/2s on non-interactive areas; 6 scroll direction changes (>50px) within 3s.
        - Tool LSP: `BaseTool.run` must use `**kwargs: Any` to allow varied subclass signatures without type-checker violations.
    </key_knowledge>

    <artifact_trail>
        - `extension/src/content/index.tsx`: Refactored state into `FloatingContainer` component; added listeners for rage-clicks and rapid scroll direction changes.
        - `extension/src/test/setup.ts`: Expanded global `chrome` mock (storage.onChanged, tabs.query, sidePanel) and added `IntersectionObserver` mock.
        - `backend/app/agent/core/runtime.py`: Integrated `LLMConnectionError` specific logging and fallback; applied `cast` to agent results.
        - `backend/app/core/distiller.py`: Optimized `distill_html` by restricting search to `<body>` and limiting `find_all` to 200 elements per tag.
        - `backend/app/core/providers.py`: Hoisted `ollama.Client` import to module level; implemented `generate_stream` placeholders for OpenAI/Anthropic.
        - `docs/AGENTIC_ARCHITECTURE.md`: Authored the "12 Core Principles" and defined the Vision Judge (BEFORE/AFTER screenshot comparison) pipeline.
        - `.gitmessage`: Established standard template for conventional commits.
        - `extension/src/*`: Achieved >90% test coverage across all core extension modules (`App`, `background`, `content`, `services`).
        - `backend/app/core/logging.py`: Implemented centralized structured logging system.
        - `backend/app/main.py`: Added request/response logging middleware and configuration dump on startup.
    </artifact_trail>

    <file_system_state>
        - BACKEND [100% COVERAGE]: `tests/test_runtime_resilience.py`, `tests/test_heuristics.py`, `tests/test_explainer.py`, `tests/test_identity.py`, `tests/test_providers.py`, `tests/test_agent_extra.py`, `tests/test_api_vision.py`.
        - EXTENSION [>90% COVERAGE]: `src/test/setup.ts` (Core Mocks), `src/background.test.ts`, `src/App.test.tsx`, `src/components/*.test.tsx`, `src/content/*.test.ts`, `src/services/*.test.ts`.
        - DATA: `backend/aura_identity.db` (SQLite storing `profiles` and `feedback`).
    </file_system_state>

    <recent_actions>
        - Resolved 38 TypeScript build errors in extension test suite.
        - Achieved verified 100% statement coverage for all backend modules.
        - Implemented real multimodal Vision Judge using Gemini 1.5 Pro.
        - Integrated centralized structured logging across all backend modules and endpoints.
        - Enhanced reliability with content-aware Intelligent Mock Fallback for LLM connection failures.
        - Validated all backend tests pass via `uv run pytest`.
    </recent_actions>

    <task_state>
        1. [DONE] Audit codebase for performance bottlenecks and unimplemented features.
        2. [DONE] Fix `useState` React hook violations in extension content script.
        3. [DONE] Implement Struggle Detection interaction monitors.
        4. [DONE] Reach 100% Backend test coverage and fix `ty` diagnostics.
        5. [DONE] Increase Extension test coverage to >90%.
        6. [DONE] Replace simulated Vision Judge multimodal check with real Gemini 1.5 Pro image analysis.
        7. [DONE] Implement comprehensive structured logging and diagnostic tools.
        8. [IN PROGRESS] Finalize performance benchmarking and demo recording.
    </task_state>
</state_snapshot>
