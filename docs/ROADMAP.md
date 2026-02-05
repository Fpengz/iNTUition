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

## 🟠 Phase 3: Stability, Reliability & Design Polish (In Progress)
*Objective: Ensure Aura is a tool users can trust in real-time scenarios.*

- [x] **Stability & Fallbacks:**
    - Implemented exponential backoff retry logic for LLM providers (429/500 errors) using `tenacity`.
- [x] **WCAG 2.2 Audit:**
    - Overhauled Side Panel with semantic HTML5 and high-contrast CSS.
    - Ensured focus states and keyboard navigability for all interactive elements.
- [ ] **End-to-End Testing (Playwright):**
- [ ] **Latency Budgeting:**

## 🔵 Phase 4: Proactive Agentic Loop (The "Aura Brain") (In Progress)
*Objective: Transform from an "Explainer" to an "Agent" that acts on the user's behalf.*

- [x] **The OODA Loop (Observe-Orient-Decide-Act):**
    - Implemented a ReAct-based reasoning loop in `AuraAgent`.
- [x] **Tool-Equipped Agent:**
    - Refactored core services (`DOMDistiller`, `AuraExplainer`, `AuraTTS`) into a modular "Toolkit" framework.
- [x] **Cross-Page Memory:**
    - Implemented `SessionStore` to maintain agent context across multiple requests and pages.
- [ ] **Proactive Suggestions:**
    - Maintain a "Session Context" so Aura remembers what you were doing across different tabs or pages.
- [x] **Proactive Suggestions:**
    - Added struggle detection (repetitive clicks) in content script to proactively offer assistance.

---

## 🏆 Judging Criteria Alignment

| Criterion | Strategy |
| :--- | :--- |
| **Impact** | Solving rigid UI barriers by providing a dynamic, AI-driven semantic bridge tailored to individual profiles. |
| **Real-time Performance** | SSE Streaming + Speculative Prefetching + In-memory Caching to keep latency below user frustration thresholds. |
| **Design & Reliability** | Persistent Side Panel integration, clean Adaptive Card UI, and a robust, type-safe FastAPI backend. |
| **Innovation** | Moving beyond static screen readers to a proactive Agent that reasons about page intent and user goals. |
