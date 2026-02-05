# Aura: The AI Cognitive Companion (iNTUition 2026)

Aura is a real-time interface accessibility bridge designed to reduce cognitive load and break down digital barriers for users with diverse abilities. It acts as an intelligent "Explainer" wrapper that distills complex web interfaces into meaningful, actionable summaries.

## 🚀 Key Features
- **Intelligent Explainer:** Real-time page summarization and action mapping using Gemini 2.0 Flash.
- **DOM Distillation:** Accessibility-focused filtering of web elements for efficient AI processing.
- **Modular Design:** Built to support personalized accessibility profiles and cognitive load monitoring.

## 🛠️ Project Structure
- `backend/`: FastAPI engine providing AI reasoning and DOM distillation.
- `extension/`: (Development) Browser extension wrapper to inject Aura into any website.

## 🚦 Getting Started

### Backend Setup
1. **Prerequisites:** Install [uv](https://github.com/astral-sh/uv).
2. **Environment:**
   ```bash
   cd backend
   cp .env.template .env
   # Add your GEMINI_API_KEY to .env
   ```
3. **Run:**
   ```bash
   export PYTHONPATH=.
   uv run uvicorn app.main:app --reload
   ```

### Frontend Setup
- The frontend (extension) is currently under development. Ensure it points to `http://localhost:8000`.

## 🧪 Verification
Run the backend verification suite:
```bash
cd backend
uv run python verify_backend.py
```

## ⚖️ Judging Criteria Focus
- **Impact:** Addresses cognitive load and rigid UI failures.
- **Innovation:** Uses LLMs as a dynamic bridge rather than a static reader.
- **Performance:** Optimized for low-latency interactions with Gemini 2.0 Flash.
