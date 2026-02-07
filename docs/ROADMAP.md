# Aura: Development Roadmap (iNTUition 2026)

This roadmap outlines the path for evolving Aura into a world-class AI accessibility assistant, focusing on performance, multimodal interaction, and proactive assistance.

## 🟢 Phase 1: Core Foundation & Intelligent Distillation (Completed / Polish)
*Objective: Build a robust backend and an efficient way to perceive the web.*

- [x] **Universal Distiller:** Multi-modal distillation (Browser DOM + Raw HTML for prefetching).
- [x] **Modern Schema:** Python 3.12+ type-safe Pydantic models for predictable data flow.
- [x] **Speculative Execution:** Link-hover prefetching to hide LLM latency.
- [x] **Persistent UI:** Migration to Chrome Side Panel for a non-disruptive user experience.
- [x] **TDD Baseline:** Achieve >80% coverage on core distillation and explanation logic.
- [x] **Logging & Observability:** Implement structured JSON logging and latency tracing (X-Process-Time).

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

## 🔵 Phase 4: Proactive Agentic Loop (The "Aura Brain") (Completed)
*Objective: Transform from an "Explainer" to an "Agent" that acts on the user's behalf.*

- [x] **The OODA Loop (Observe-Orient-Decide-Act):**
    - Implemented a multi-agent pipeline using **PydanticAI** to orchestrate Health Checks, Understanding, and Decision making.
- [x] **Advanced UI Adaptation:**
    - Implemented **Surgical Augmentation** (Target Upscaling + Tooltips).
- [x] **Persistent Accessibility Identity:**
    - Developed a SQLite-backed identity store for granular user profiles (Cognitive, Motor, Sensory).
- [x] **Continuous Feedback Loop:**
    - Added built-in user satisfaction tracking and one-click UI reversibility.
- [x] **Intelligent Mock Fallback:**
    - Implemented high-quality mock responses to ensure demo stability during API throttling.

## 🟣 Phase 5: Advanced Tooling & Self-Verification (The "Aura Hand") (Planned)
*Objective: Empower the agent to safely manipulate the environment and verify its own actions.*

- [ ] **Tool Execution Layer:**
    - Implement a safe registry of accessibility tools (e.g., `IncreaseFontSize`, `EnableDarkMode`, `SimplifyLayout`).
    - Enable the LLM to call tools with structured parameters instead of executing raw code.
    - Build a "Tool Router" in the extension runtime to execute agent commands safely.
- [x] **Vision Judge Agent (Closed-Loop AI):**
    - Implement a self-correcting feedback loop: Detect -> Change -> Observe (Screenshot) -> Evaluate.
    - Use Gemini 1.5 Pro to verify accessibility improvements visually.
    - Enable automatic rollback if the "Judge" detects broken UI or reduced usability.
- [ ] **Visual Diffing:**
    - Capture "Before" and "After" snapshots to allow the agent to reason about the impact of its changes.

---

## 🏆 Judging Criteria Alignment

| Criterion | Strategy |
| :--- | :--- |
| **Impact** | Reducing user burden via structural simplification and physical UI healing (Upscaling). |
| **Real-time Performance** | Consolidated Agent requests + Speculative Prefetching + Intelligent Mock Fallbacks. |
| **Design & Reliability** | Self-validating "Judge" agent + Persistent Identity Store + Surgical DOM Augmentation. |
| **Innovation** | Multi-agent "Judge-and-Act" architecture built on PydanticAI for safe, proactive web navigation. |
