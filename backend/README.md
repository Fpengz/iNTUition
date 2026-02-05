# Aura Backend: AI Accessibility Engine

This is the FastAPI-based backend for Aura, providing DOM distillation and AI-powered reasoning using Gemini 2.0 Flash.

## 🚀 Setup

1. **Prerequisites:**
   - Python 3.12+
   - [uv](https://github.com/astral-sh/uv) (recommended)

2. **Environment Configuration:**
   Create a `.env` file in this directory and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Installation & Running:**
   ```bash
   export PYTHONPATH=.
   uv run uvicorn app.main:app --reload
   ```

## 🛠️ Key Components
- `app/api/`: API route definitions.
- `app/core/distiller.py`: Logic for filtering and serializing DOM elements.
- `app/core/explainer.py`: Integration with Gemini for page summarization and action mapping.
- `app/core/providers.py`: LLM provider configurations.

## 🧪 Verification
Run the verification script to ensure the backend and AI connection are working correctly:
```bash
uv run python verify_backend.py
```
