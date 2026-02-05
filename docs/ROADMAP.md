# Aura: Development Roadmap (iNTUition 2026)

This roadmap outlines the path for evolving Aura into a world-class AI accessibility assistant, focusing on performance, multimodal interaction, and proactive assistance.

## 🟢 Phase 1: Core Foundation & Intelligent Distillation (Completed / Polish)
*Objective: Build a robust backend and an efficient way to perceive the web.*

- [x] **Universal Distiller:** Multi-modal distillation (Browser DOM + Raw HTML for prefetching).
- [x] **Modern Schema:** Python 3.12+ type-safe Pydantic models for predictable data flow.
- [x] **Speculative Execution:** Link-hover prefetching to hide LLM latency.
- [x] **Persistent UI:** Migration to Chrome Side Panel for a non-disruptive user experience.
- [ ] **TDD Baseline:** Achieve >80% coverage on core distillation and explanation logic.
- [ ] **Logging & Observability:** Implement structured JSON logging and latency tracing (X-Process-Time).

## 🟡 Phase 2: Multimodal Perception & Interaction (Completed)
*Objective: Move beyond text to see, hear, and speak with the user.*

- [x] **Offscreen Voice Capture:**
    - Implemented `offscreen.ts` to stream Microphone for "Hey Aura" wake word detection.
    - Connected offscreen trigger to background script and Side Panel activation.
- [x] **Real-time Latency UI:**
    - Added latency indicator (X-Process-Time) in the Side Panel.
- [x] **Action Highlighting:**
    - Implemented click-to-highlight functionality for suggested actions.
- [x] **Personalized Accessibility Profiles:**
    - Added Settings UI for Cognitive Load and Language Level preferences.
    - Persisted settings via chrome.storage and integrated with backend.

## 🟠 Phase 3: Stability, Reliability & Design Polish
*Objective: Ensure Aura is a tool users can trust in real-time scenarios.*

- [ ] **Stability & Fallbacks:**
    - Implement retry logic with exponential backoff for LLM 429/500 errors.
    - Add local fallback models (Gemini Nano / Chrome Built-in AI) for basic page summaries when offline or rate-limited.
- [ ] **WCAG 2.2 Audit:**
    - Ensure the Aura Side Panel itself is fully accessible (Screen reader friendly, Keyboard navigable, proper contrast).
- [ ] **End-to-End Testing (Playwright):**
    - Develop a test suite that simulates a user navigating a complex site (e.g., a checkout flow) with Aura's assistance.
- [ ] **Latency Budgeting:**
    - Target: <500ms for cached hits, <1.5s for fresh streaming summaries.

## 🔵 Phase 4: Proactive Agentic Loop (The "Aura Brain")
*Objective: Transform from an "Explainer" to an "Agent" that acts on the user's behalf.*

- [ ] **The OODA Loop (Observe-Orient-Decide-Act):**
    - Implement the agentic reasoning loop defined in `AGENTIC_ARCHITECTURE.md`.
- [ ] **Tool-Equipped Agent:**
    - Convert backend services into "Tools" the LLM can invoke (e.g., `click_element`, `fill_form`, `summarize_section`).
- [ ] **Cross-Page Memory:**
    - Maintain a "Session Context" so Aura remembers what you were doing across different tabs or pages.
- [ ] **Proactive Suggestions:**
    - Aura detects cognitive load or user struggle (via camera/dwell time) and offers help before being asked.

---

## 🏆 Judging Criteria Alignment

| Criterion | Strategy |
| :--- | :--- |
| **Impact** | Solving rigid UI barriers by providing a dynamic, AI-driven semantic bridge tailored to individual profiles. |
| **Real-time Performance** | SSE Streaming + Speculative Prefetching + In-memory Caching to keep latency below user frustration thresholds. |
| **Design & Reliability** | Persistent Side Panel integration, clean Adaptive Card UI, and a robust, type-safe FastAPI backend. |
| **Innovation** | Moving beyond static screen readers to a proactive Agent that reasons about page intent and user goals. |
