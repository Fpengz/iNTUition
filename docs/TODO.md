# Aura: Project Roadmap & TODO

## ✅ Phase 1: Performance & Core Features (Completed)
*Goal: Optimize the core explanation engine for speed and efficiency.*

- [x] **Latency Audit:** Implemented timing middleware (`X-Process-Time`).
- [x] **DOM Optimization:**
    - [x] **Selective Scraping:** Filtered hidden/irrelevant elements on the frontend.
    - [x] **Viewport Priority:** Prioritized elements visible on the screen.
    - [x] **Token Compression:** Minimized JSON schema for LLM prompts.
- [x] **Backend Caching:** Implemented a TTL-based in-memory cache for explanations.
- [x] **Streaming Responses (SSE):**
    - [x] Created `/explain/stream` endpoint.
    - [x] Backend logic to stream responses.

---

## ✅ Phase 2: Multimodal UI & Voice Interaction (Completed)
*Goal: Enhance the user experience with rich UI and voice commands.*

- [x] **Adaptive Card UI:**
    - [x] Backend now generates structured JSON for UI cards.
    - [x] Frontend renders explanations using `adaptivecards-react`.
- [x] **Text-to-Speech (TTS):**
    - [x] Implemented `/tts` backend endpoint using `gTTS`.
    - [x] UI includes a button to read summaries aloud.
- [x] **Voice Wake-up:**
    - [x] Added microphone permission and background service worker.
    - [x] Implemented speech recognition to detect "Hey Aura" and activate the extension.

---

## ⏳ Phase 3: Speculative Execution & Future-Proofing (In Progress)
*Goal: Proactively reduce latency and document future architectural plans.*

- [ ] **Speculative Execution (Prefetch):**
    - [ ] Frontend: Detect link hovers to anticipate user navigation.
    - [ ] Backend: Create a `/prefetch` endpoint to process and cache pages before the user clicks.
- [x] **Architectural Vision:**
    - [x] Created `AGENTIC_ARCHITECTURE.md` outlining the roadmap to a proactive, agentic assistant.
- [x] **Documentation Update:**
    - [x] Updated `GEMINI.md` and `TODO.md` to reflect current project status.

---

## 🔮 Future Vision: Agentic Architecture
*Goal: Transform Aura into a multi-step task assistant.*

- [ ] **Refactor to Tools:** Convert existing services into a "toolkit" the agent can use.
- [ ] **Implement Agent Core:** Build the main reasoning loop (Observe-Orient-Decide-Act).
- [ ] **Expand Toolset:** Add more browser interaction tools (e.g., `click`, `fill_input`).

---

## 🏆 Judging Prep
- [ ] **Demo Polish:** Ensure a smooth, reliable live demo flow.
- [ ] **Finalize README:** Update all instructions for judges.
- [ ] **Record Video:** Create a backup video of the demo.
