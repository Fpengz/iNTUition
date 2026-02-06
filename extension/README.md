# Aura Extension: Adaptive Accessibility UI

This document details how the Aura extension interacts with web pages and provides isolated, robust accessibility tools.

## Technical Architecture

### 1. UI Isolation (Shadow DOM)
Aura uses a **Shadow DOM** (`src/content/ShadowRoot.tsx`) to encapsulate its interface. 
- **Zero Conflict:** Host page CSS cannot bleed into Aura, and Aura's styles cannot break the host page.
- **Reset Styles:** Aura uses `all: initial` at the shadow root to ensure a consistent, branded experience on every website.

### 2. Floating Window UI
Aura provides a draggable, resizable, and persistent floating window (`src/components/FloatingWindow.tsx`).
- **State Persistence:** Uses `chrome.storage.local` to remember position, size, and minimized state across page reloads.
- **Smart Dragging:** Includes a movement threshold to differentiate between dragging the window and clicking its branding to expand/collapse.

### 3. Theme Adaptation Engine
The **ThemeManager** (`src/content/ThemeManager.ts`) applies safe, real-time transformations:
- **Media Protection:** Uses CSS `:not()` selectors and filter logic to ensure images, videos, and icons are not inverted or broken when applying Dark or High Contrast modes.
- **Performance:** Applies changes instantly via injected stylesheets with `!important` overrides.

### 4. Event Bridge & Tooling
Aura decouples AI reasoning from DOM action using a **Tool Router** (`src/services/ToolRouter.ts`):
- **Structured Commands:** Instead of raw JS, the backend sends specific tool calls (e.g., `IncreaseFontSize`).
- **Security:** Only predefined, safe tools can be executed by the agent.

### 5. Vision Loop (Multimodal Verification)
For high-impact changes, the extension implements a closed-loop verification:
1. **Act:** Apply UI adaptation.
2. **Capture:** Use `chrome.tabs.captureVisibleTab` to take a viewport screenshot.
3. **Verify:** Send screenshot to backend for analysis by the Vision Judge Agent.
4. **Correct:** Revert or refine the UI if the judge detects layout issues.

## Development & Build System

### Vite Bundling
To comply with Chrome Extension security and performance standards, the content script is built using a specialized configuration (`vite.content.config.ts`):
- **Single File:** Bundles all dependencies (React, components, libraries) into one self-contained `index.js`.
- **IIFE Format:** Prevents variable name collisions with the host page.

### TDD Strategy
The extension uses **Vitest** and **JSDOM** for testing:
- **Unit Tests:** `src/content/index.test.ts` (Scraping logic).
- **Component Tests:** `src/components/FloatingWindow.test.tsx` (UI behavior).
- **Service Tests:** `src/services/ToolRouter.test.ts` (Command routing).

## Configuration
All API calls use the `VITE_AURA_API_URL` environment variable defined in `extension/.env`. Default is `http://localhost:8000`.
