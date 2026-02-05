# Aura Performance Optimization Plan

This document outlines the strategy for minimizing latency and optimizing resource usage (tokens/bandwidth) for Aura.

## 🚀 Completed Optimizations

### 1. Selective & Efficient DOM Scraping (Frontend)
- **Filtering:** Hidden elements (`display: none`, `opacity: 0`) and tiny decorative elements are ignored.
- **Truncation:** Text content is capped at 200 characters to reduce payload size.
- **Categorization:** Improved selectors to focus on semantic landmarks and interactive elements.
- **Deduplication:** Repeated text (e.g., duplicate nav links) is filtered out before sending to the backend.

### 2. Backend Latency Benchmarking
- **Middleware:** Added `X-Process-Time` header to all API responses.
- **Logging:** Server-side logs now track processing time per request.

### 3. Smart Caching
- **In-Memory Cache:** Implemented a TTL-based (30 min) cache for distilled DOM and LLM explanations.
- **Stable Hashing:** Cache keys are generated using a MD5 hash of the distilled elements and user profile.

### 4. LLM Token Efficiency
- **Key Compression:** Shortened JSON keys (`role` -> `r`, `text` -> `t`, etc.) in the distilled DOM sent to the LLM.
- **Context Pruning:** Limited the number of elements passed to the LLM (max 40 per category).
- **Prompt Engineering:** Concise prompts focused on 2-sentence summaries and direct action mapping.

### 5. Streaming Responses (SSE)
- **Real-time Feedback:** Implemented Server-Sent Events for the `/explain/stream` endpoint.
- **Improved UX:** Users see the explanation as it is being generated, significantly reducing perceived latency.

### 6. Viewport-First Scraping
- **Prioritization:** The extension now detects and prioritizes elements visible in the user's viewport.
- **Contextual Accuracy:** The LLM is instructed to focus on these [VISIBLE] elements for more immediate relevance.

## 🛠️ Planned/Future Optimizations

### 1. Speculative Execution (URL Prefetch)
- **Objective:** To make navigation feel instantaneous by processing the destination page before the user even clicks the link.
- **Frontend Mechanism:**
    - The content script will monitor `mouseover` events on `<a>` tags.
    - A delay (e.g., 750ms) will be used to confirm user intent (i.e., they are hovering, not just moving the mouse across the link).
    - Upon confirmation, the `href` of the link will be sent to the background script.
- **Backend Endpoint:**
    - A new, non-blocking `/prefetch` endpoint will be created.
    - It will accept a URL and immediately return a `202 Accepted` status.
- **Background Processing:**
    - In a background task, the backend will fetch the HTML of the prefetched URL, distill it, generate an explanation, and store the result in the `AuraCache`.
- **Result:** If the user clicks the link, the subsequent call to `/explain/stream` will result in a near-instant cache hit.

### 2. Local Distillation
- Move more of the "Summarization" logic to the extension using local models (e.g., Chrome Built-in AI / Gemini Nano) for simple tasks.

## 📊 Performance Baseline
- **Target Latency:** < 1.5s for cached hits, < 3s for fresh LLM generations.
- **Target Payload:** < 50KB for the distilled DOM transfer.
