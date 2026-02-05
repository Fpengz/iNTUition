# Aura: Project Roadmap & TODO

## 🏗️ Phase 1: Foundational Architecture (Aura - Idea 1)
*Goal: Create a browser extension "wrapper" that explains any website in real-time using Gemini.*

### 1.1 Infrastructure & Setup
- [x] **Extension Scaffold:** (Handled by user)
- [x] **Sidecar UI:** (Handled by user)
- [x] **Backend API:** Setup FastAPI with `uv` and modular folder structure (`/core`, `/identity`, `/perception`).
- [x] **Cross-Origin Bridge:** Configured CORS in FastAPI.

### 1.2 The Explainer Engine (LLM as Explainer)
- [x] **DOM Distiller:** Implement a script to extract a "Simplified Accessibility Tree" (JSON) from the active tab.
- [x] **Gemini 2.0 Integration:** 
    - [x] Develop prompts for "Page Summarization".
    - [x] Develop prompts for "Action Mapping" (answering "How do I...").
- [ ] **Streaming Response:** Implement WebSockets or SSE for real-time explanations to reduce perceived latency.
- [ ] **Multimodal Input:** Add Web Speech API support for voice commands.

### 1.3 Adaptive UI (Preparing for Idea 3)
- [ ] **Noise Dimmer:** Implement "Focus Mode" logic that can desaturate or hide non-essential DOM elements via CSS injection.
- [ ] **Action Highlighter:** Logic to visually pulse or highlight elements identified by the LLM as "Primary Actions".

---

## 🧬 Phase 2: Personalization (Idea 2)
*Goal: Allow Aura to adapt based on specific user profiles.*

- [ ] **Profile Schema:** Define `UserProfile` (e.g., visual needs, cognitive load tolerance).
- [ ] **Identity Service:** Create a basic backend service to save/load these profiles.
- [ ] **Context-Aware Prompts:** Inject the User Profile into the LLM context so explanations are tailored (e.g., "Use simple language for this user").

---

## 🧠 Phase 3: Cognitive Awareness (Idea 3)
*Goal: Automatically detect when a user is overwhelmed.*

- [ ] **Behavioral Monitoring:** Track "frustration signals" (rapid scrolling, erratic mouse movements, repeated clicks).
- [ ] **Cognitive Load Scorer:** A backend logic to trigger "Aura Intervention" automatically when a high-stress score is reached.

---

## ✅ Verification & Judging Prep
- [ ] **Demo Mode:** A "Split View" toggle to show Baseline vs. Aura.
- [x] **Latency Audit:** Implemented timing middleware and caching.
- [x] **DOM Optimization:** Optimized scraping and distillation payload.
- [ ] **README / GEMINI.md Update:** Finalize execution instructions for judges.

## 🚀 Performance & Scale (Added)
- [x] **Backend Caching:** TTL-based in-memory cache for explanations.
- [x] **Token Compression:** Minimized JSON schema for LLM prompts.
- [ ] **SSE/Streaming:** Transition from POST to SSE for real-time summaries.
- [ ] **Viewport Priority:** Implement prioritized scraping for visible elements.
