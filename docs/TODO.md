# Aura: Project Roadmap & TODO

> [!TIP]
> For a detailed long-term strategic plan, see **[ROADMAP.md](./ROADMAP.md)**.

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

## ✅ Phase 3: Speculative Execution & Future-Proofing (Completed)
*Goal: Proactively reduce latency and document future architectural plans.*

- [x] **Speculative Execution (Prefetch):**
    - [x] Frontend: Detect link hovers to anticipate user navigation.
    - [x] Backend: Created `/prefetch` endpoint with HTML distillation and caching.
- [x] **Architectural Vision:**
    - [x] Created `AGENTIC_ARCHITECTURE.md` outlining the roadmap to a proactive, agentic assistant.
- [x] **Documentation Update:**
    - [x] Updated `GEMINI.md` and `TODO.md` to reflect current project status.

---

## ✅ Phase 4: Agentic Runtime & UI Adaptation (Completed)
*Goal: Transform Aura into a proactive, self-validating accessibility runtime.*

- [x] **Multi-Agent Pipeline:** Built a Judge-and-Act loop using PydanticAI.
- [x] **Structural UI Healing:** Implemented Target Upscaling and Focus Portal.
- [x] **Identity Store:** Persistent SQLite storage for rich accessibility profiles.
- [x] **Stability:** Intelligent mock fallbacks for 429 error handling.

---

## 🏆 Final Judging Prep
- [x] **Demo Polish:** Multi-agent runtime integrated and verified.
- [ ] **Finalize README:** (Completed)
- [ ] **Record Video:** Backup video of the "Focus Portal" in action.
