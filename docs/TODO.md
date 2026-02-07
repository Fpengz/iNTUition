# Aura: Project Roadmap & TODO

> [!TIP]
> For a detailed long-term strategic plan, see **[ROADMAP.md](./ROADMAP.md)**.

## ✅ Phase 1: Core Performance (Completed)
- [x] **Latency Audit:** Implemented `X-Process-Time` tracing.
- [x] **DOM Optimization:** Viewport-aware scraping and token compression.
- [x] **Streaming:** Real-time token delivery for summaries.

## ✅ Phase 2: Multimodal Foundation (Completed)
- [x] **Text-to-Speech:** Integrated `gTTS` with frontend playback.
- [x] **Voice Wake-up:** "Hey Aura" offscreen document detection.
- [x] **Speculative Execution:** Link-hover prefetching logic.

## ✅ Phase 3: Proactive Agentic Loop (Completed)
- [x] **Aura Brain:** Multi-agent pipeline using **PydanticAI**.
- [x] **Accessibility Identity:** Persistent SQLite profile store.
- [x] **Modular Backend:** Reorganized into `/api/v1` specialized endpoints.

## ✅ Phase 4: UI Runtime & Isolation (Completed)
- [x] **Floating Window:** Draggable, resizable, persistent React UI.
- [x] **Shadow DOM:** Complete isolation from host page CSS.
- [x] **Theme Engine:** Safe Dark Mode and High Contrast Mode.
- [x] **TDD Baseline:** Vitest and Pytest environments established.

## 🚀 Phase 5: The Aura "Hand" and "Eye" (In Progress)
- [x] **Tool Execution Router (Hand):** Safe registry for agent-driven UI actions.
- [x] **Vision Judge (Eye):** Multimodal verification of layout integrity using Gemini 1.5 Pro.
- [ ] **Autonomous Corrections:** Enable agent to automatically retry adaptations based on Vision Judge feedback.
- [ ] **Regional Scaling:** Optimize Focus Portal to upscale specific regions instead of the whole page.

---

## ✅ Final Judging Prep
- [x] **Documentation:** Updated all READMEs and Roadmap docs.
- [x] **Benchmarking Script:** Created `backend/benchmark.py` for automated latency measurement.
- [x] **Observability:** Implemented structured logging and diagnostic tools.
- [ ] **Performance Benchmarking:** Document latency reduction from prefetching.
- [ ] **Recording:** Prepare demo videos showing "Real-time UI Healing" and "Vision Verification."