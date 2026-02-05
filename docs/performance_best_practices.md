# Aura: Performance & Optimization Best Practices

This document outlines performance strategies specifically tailored for the Aura project (Chrome Extension + FastAPI Backend + Gemini AI).

---

## 1. AI & Backend Latency (Critical)

### 🧠 DOM Distillation (The Aura USP)
- **Token Reduction:** Always distill the DOM on the client or backend before sending it to Gemini. This directly reduces latency, token costs, and improves reasoning accuracy.
- **Selective Extraction:** Only extract interactive elements (`button`, `a`, `input`) and semantic headers. Ignore hidden elements, scripts, and styles.

### 🏎️ Asynchronous API Design
- **FastAPI Concurrency:** Use `async def` for all endpoints and `httpx.AsyncClient` for external calls to prevent blocking the event loop.
- **Parallel Processing:** Use `asyncio.gather()` when fetching multiple insights (e.g., summarizing and finding actions simultaneously).

### 📡 Payload Efficiency
- **Compression:** Enable `GZipMiddleware` in FastAPI to compress the serialized DOM data being sent between the extension and backend.
- **Minimal JSON:** Return only the necessary fields in the `/explain` and `/action` responses.

---

## 2. Chrome Extension & Frontend

### 📦 Bundle Size & Loading
- **Vite Manual Chunks:** Use Vite's `manualChunks` to separate React and common libraries from the content script. This keeps the initial script injection lightweight.
- **Dynamic Imports:** Lazy load heavy components in the extension popup (e.g., complex UI animations or markdown parsers).

### ⚡ Content Script Performance
- **Minimal Execution:** The content script (`src/content/index.ts`) should only run when requested. Avoid heavy constant polling of the host page DOM.
- **Efficient Scrapes:** Use specific CSS selectors (`querySelectorAll`) rather than traversing the entire tree to find interactive elements.

### 🌐 Data Fetching
- **Request Deduplication:** Use **TanStack Query** in the popup/dashboard to prevent redundant calls to the backend when the user toggles the interface.
- **Stale-While-Revalidate:** Cache distillation results temporarily to allow for instant re-renders if the user re-opens the extension on the same page.

---

## 3. Infrastructure & Security

### 🔓 CORS Optimization
- **Restricted Origins:** Instead of `allow_origins=["*"]`, explicitly allow the Chrome extension ID in production to reduce overhead and improve security.

### 🔑 Secret Management
- **Environment Variables:** Never hardcode the `GEMINI_API_KEY`. Use `.env` files and ensure they are ignored by git.

---

## 🏁 Aura Performance Checklist
1. [ ] **Distillation:** Is the DOM payload < 50KB for average pages?
2. [ ] **AI Latency:** Does Gemini 2.0 Flash respond in < 2 seconds?
3. [ ] **Injection:** Does the content script impact the host page's FPS?
4. [ ] **Bundle:** Is the `extension/dist` size minimized?