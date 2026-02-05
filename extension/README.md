# Aura Extension: DOM Access & Extraction

This document details how Aura interacts with web pages to provide accessibility insights.

## Technical Architecture

### 1. API for DOM Access
Aura utilizes the standard Web **DOM API** within a **Content Script** (`src/content/index.ts`). Content scripts have full access to the page's DOM but operate in an isolated JavaScript environment.

### 2. Data Extraction Methods
Aura scrapes the page using `document.querySelectorAll` to identify interactive and semantic elements.
- **Target Selectors:** `button, a, input, h1, h2, h3, [role="button"]`.
- **Attribute Mapping:** 
    - **Role:** Inferred from `tagName` or `role` attribute.
    - **Label:** Priority order: `textContent` -> `placeholder` -> `aria-label`.
    - **Tracking:** Injects a temporary `data-aura-id` attribute into elements for precise mapping and highlighting.

### 3. Data Parsing & Distillation
Raw data is sent to the Backend (`backend/app/core/distiller.py`) for processing:
- **Filtering:** Removes empty or non-functional elements.
- **Classification:** Categorizes elements into `Actions` (interactive) and `Summary` (informational) to optimize LLM context.

### 4. Event Listener Implementation
Communication is handled via `chrome.runtime.onMessage`:
- **Trigger:** The Popup sends a `GET_DOM` message via `chrome.tabs.sendMessage`.
- **Response:** The Content Script executes the scrape and returns the serialized JSON payload.

### 5. Cross-Origin Restrictions (CORS)
- **Permissions:** `manifest.json` specifies `host_permissions` for `http://127.0.0.1:8000/*`.
- **Backend Policy:** FastAPI uses `CORSMiddleware` to allow requests from extension origins.

### 6. Error Handling
- **Injection Check:** Detects if the content script is missing (e.g., on `chrome://` pages or before a refresh).
- **Communication Safety:** Uses try-catch blocks around `sendMessage` and `fetch` calls to handle network or runtime failures gracefully.

### 7. Data Serialization Format (JSON)
```json
{
  "title": "Page Title",
  "url": "https://example.com",
  "elements": [
    {
      "role": "button",
      "text": "Login",
      "selector": "[data-aura-id='aura-el-5']",
      "aria_label": "Log into your account"
    }
  ]
}
```