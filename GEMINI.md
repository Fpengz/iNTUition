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
- `backend/app/main.py`: FastAPI entry point.
- `backend/app/core/distiller.py`: DOM distillation logic.
- `backend/app/core/explainer.py`: Gemini LLM integration.
- `backend/.env.template`: Environment variable template.
- `extension/src/content/index.ts`: Content script for DOM scraping.
- `TODO.md`: Project roadmap and task tracking.

## Technical Details: DOM Extraction
Aura uses a **Content Script** to scrape the DOM using `document.querySelectorAll`. It extracts semantic data (roles, labels) and serializes it into a JSON format that is then distilled by the backend before being sent to the Gemini API. For a full technical breakdown, see `extension/README.md`.

