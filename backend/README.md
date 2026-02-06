# Aura Backend: AI Accessibility Engine

The Aura backend provides multi-agent reasoning, DOM distillation, and multimodal verification using FastAPI and PydanticAI.

## 🚀 Setup

1. **Prerequisites:**
    - Python 3.12+
    - [uv](https://github.com/astral-sh/uv)

2. **Configuration:**
   ```bash
   cp .env.template .env
   # Edit .env with your GEMINI_API_KEY
   ```

3. **Installation & Running:**
   ```bash
   uv sync --all-groups
   uv run uvicorn app.main:app --reload
   ```

## 🏗️ API Structure (`/api/v1`)

The backend is organized into specialized endpoints for better scalability:
- `endpoints/accessibility.py`: Main AI logic including `/process`, `/explain/stream`, and `/verify`.
- `endpoints/identity.py`: User profile persistence and feedback store.
- `endpoints/system.py`: Health checks and root diagnostics.

## 🧠 Agentic Capabilities

- **Aura Brain:** A phased pipeline (Assessment -> Understanding -> Adaptation -> Judge).
- **Vision Judge:** Multimodal verification of UI adaptations using screenshots.
- **Tool Registry:** Set of safe actions (e.g., `SetFontSizeTool`, `SetThemeTool`) that the agent can "call" via structured JSON.
- **Real-time Streaming:** Token-by-token summary generation for reduced perceived latency.

## ⚙️ Centralized Configuration
Managed via `app/core/config.py` using **Pydantic Settings**.
- Resolves `.env` using absolute paths for reliability.
- Provides type-safe validation for all environment variables (LLM models, ports, DB paths).

## 🧪 Test-Driven Development
The backend uses **Pytest** with `asyncio` support.
- **Mocks:** Sophisticated mocking of `pydantic_ai` and `genai` providers allows running full API tests without incurring LLM costs or requiring API keys.
- **Run Tests:**
  ```bash
  export PYTHONPATH=.
  uv run pytest
  ```

## 🧪 Verification scripts
- `uv run python verify_runtime.py`: Tests the full `/process` agentic loop.