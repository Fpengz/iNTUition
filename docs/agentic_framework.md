# AI Accessibility Runtime — Agent Architecture & UI Adaptation Design

This document describes the **agent-based architecture**, **decision flow**, and **UI adaptation strategies** for an AI-powered accessibility runtime.  
The system is proactive, explainable, and demo-ready, designed to run with **local LLMs** and structured via **PydanticAI-style agents**.

---

## 1. System Overview

**Goal**  
Build a real-time accessibility layer that:
- Understands any webpage semantically
- Personalizes behavior using an accessibility profile
- Detects cognitive overload and accessibility risks proactively
- Adapts the UI structurally (not just visually)
- Verifies that adaptations actually improve accessibility

**Key Principles**
- AI proposes actions, UI executes them
- All AI outputs are structured and explainable
- Adaptations are reversible and auditable
- No passive waiting for user failure — proactive help

---

## 2. High-Level Agent Pipeline

┌────────────────────────┐
│ Accessibility Health │ (Proactive scan)
│ Check Agent │
└───────────┬────────────┘
↓
┌────────────────────────┐
│ Page Understanding │
│ Agent │
└───────────┬────────────┘
↓
┌────────────────────────┐
│ User Profile │
│ Interpreter Agent │
└───────────┬────────────┘
↓
┌────────────────────────┐
│ Cognitive Load │
│ Evaluator Agent │
└───────────┬────────────┘
↓
┌────────────────────────┐
│ UI Adaptation │
│ Decision Agent │
└───────────┬────────────┘
↓
┌────────────────────────┐
│ Accessibility Judge │
│ Agent │ (Validation & QA)
└────────────────────────┘


---

## 3. Agent Specifications

### 3.1 Accessibility Health Check Agent (Proactive Trigger)

**Purpose**  
Detect whether a webpage poses accessibility risks *before* the user struggles.

**Inputs**
- DOM snapshot
- ARIA roles
- Font sizes
- Contrast ratios
- Click target sizes
- Layout density indicators

**Outputs**
```python
class AccessibilityRisk(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    issues: list[str]
    recommend_intervention: bool
Examples of Issues

Missing labels on inputs

Poor color contrast

Dense layout with many interactive elements

Small or tightly packed click targets

Why It Matters

Shifts accessibility from reactive to proactive

Creates a clear AI justification early in the pipeline

3.2 Page Understanding Agent (LLM Explainer)
Purpose
Generate a semantic, task-oriented understanding of the current webpage.

Inputs

Cleaned DOM structure

Visible text

Element roles and hierarchy

Outputs

class PageSummary(BaseModel):
    page_type: str                  # form, article, dashboard, ecommerce, etc.
    primary_goal: str               # what the user is likely trying to do
    main_actions: list[str]         # key actions
    secondary_elements: list[str]   # non-essential UI elements
    complexity_score: int           # 1–10
Usage

Drives explanation generation

Feeds into cognitive load detection

Informs UI prioritization

3.3 User Profile Interpreter Agent
Purpose
Translate a human-friendly accessibility profile into concrete UI constraints.

Inputs

class UserProfile(BaseModel):
    vision: str                     # normal, low, color-blind
    cognitive_support: str          # low, medium, high
    motor_precision: str            # normal, limited
    preferences: dict
Outputs

class AccessibilityConstraints(BaseModel):
    max_elements_visible: int
    simplify_text_level: int         # 0–3
    enable_speech: bool
    emphasize_primary_action: bool
Why It Matters

Makes personalization actionable

Separates preference storage from AI reasoning

3.4 Cognitive Load Evaluator Agent
Purpose
Determine whether the user is currently experiencing cognitive overload.

Inputs

Interaction logs (scroll loops, hover duration, repeated clicks)

Page complexity score

Accessibility constraints

Outputs

class CognitiveState(BaseModel):
    overloaded: bool
    confidence: float               # 0–1
    signals: list[str]
Example Signals

Repeated up/down scrolling

Long hesitation without action

Clicking the same element multiple times

3.5 UI Adaptation Decision Agent
Purpose
Decide how the interface should adapt to reduce friction and overload.

Inputs

PageSummary

AccessibilityConstraints

CognitiveState

Outputs

class UIActions(BaseModel):
    hide_elements: list[str]         # semantic IDs or roles
    highlight_elements: list[str]
    layout_mode: Literal["normal", "simplified", "focus"]
    explanation: str
Important Design Choice

AI proposes actions

UI layer applies changes using CSS / DOM transforms

All actions are reversible

### 3.6 Tool Execution Router (The "Hand")
**Purpose**  
Safely execute accessibility actions requested by the agent without running arbitrary code.

**Inputs**  
Structured tool calls from the LLM (e.g., `tool="IncreaseFontSize", params={scale: 1.2}`).

**Available Tools**
- **Typography:** `IncreaseFontSize`, `ChangeFontFamily`, `AdjustLineSpacing`
- **Visuals:** `EnableDarkMode`, `EnableHighContrast`, `ReduceMotion`
- **Cognitive:** `SimplifyLayout`, `HideSection`, `FocusElement`
- **Navigation:** `ScrollTo`, `HighlightElement`

**Why It Matters**
- **Safety:** The AI cannot execute raw JavaScript or break the site logic.
- **Determinism:** Tools have predictable, tested outcomes.
- **Explainability:** Users can see exactly which "tool" was used (e.g., "Aura used 'High Contrast Mode'").

### 3.7 Vision Judge Agent (Closed-Loop Verification)
**Purpose**  
Verify that UI adaptations actually improve accessibility using **computer vision** (VLM).

**Inputs**
- **Before Screenshot:** The UI state before adaptation.
- **After Screenshot:** The UI state after tools were applied.
- **Goal:** The original intent (e.g., "Make text readable").

**Outputs**
```python
class VisionVerdict(BaseModel):
    success: bool
    improvement_score: float        # 0–1
    new_issues: list[str]           # e.g., "Text overlapping", "Button hidden"
    recommendation: Literal["keep", "refine", "rollback"]
```

**Workflow**
1. **Detect:** Agent identifies a readability issue.
2. **Act:** Tool Router applies `IncreaseFontSize`.
3. **Observe:** System captures a screenshot of the new state.
4. **Evaluate:** Vision Judge compares Before vs. After.
   - *If text overlaps:* Judge triggers `rollback` or `Refine(ReduceScale)`.
   - *If readable:* Judge approves.

**Why This Is Powerful**
- **Self-Correction:** The system detects if it broke the UI and fixes it automatically.
- **Multimodal Intelligence:** Demonstrates reasoning about visual layout, not just code.
- **Trust:** Ensures adaptations are safe before the user has to deal with a broken interface.

## 4. UI Adaptation Strategy
4.1 What UI Adaptation Means Here
UI adaptation is structural transformation, not cosmetic theming.

Instead of only:

Increasing font size

Changing colors

The system:

Reorders content by importance

Collapses or hides secondary elements

Emphasizes primary actions

Switches layout modes dynamically

4.2 Example: E-Commerce Page Transformation
Original View

[Promo Banner]
[Image Gallery]  [Price | Small Add to Cart]
[Long Description]
[Reviews]
[Related Products]
Adapted View (High Cognitive Load + Low Vision)

[Accessibility Help Active]
[LARGE Product Image]
[LARGE PRIMARY CTA: Add to Cart]
[Short, Simplified Description]
[Reviews — collapsed]
[Related Products — hidden]
Benefits

Reduced visual noise

Clear task focus

Larger interaction targets

Lower cognitive demand

4.3 Trending UI Adaptation Patterns
1. Adaptive Cards

Content grouped into cards

Cards can expand, collapse, reorder

Ideal for progressive disclosure

2. Focus Mode

Only essential UI is shown

Secondary content is dimmed or hidden

Especially effective for cognitive accessibility

3. Progressive Disclosure

Show only what’s needed now

Reveal more on demand (click or voice)

4. Semantic Reflow

AI reprioritizes content based on meaning

Layout reflects task importance, not original design

5. Execution Flow (Consolidated Pipeline)
To optimize for latency and API quota, Aura uses a **Consolidated Brain Agent** that processes the entire pipeline in a single structured request while maintaining the multi-agent reasoning logic:

1. **Observe:** Extension captures DOM snapshot and interaction logs.
2. **Brain Execution:**
   - `health_agent` identifies immediate risks.
   - `understanding_agent` maps page intent.
   - `profile_interpreter` applies user identity constraints.
   - `decision_agent` selects UI actions (e.g., Target Upscaling or Focus Portal).
   - `judge_agent` validates the plan for WCAG safety.
3. **Act:** Extension applies surgical DOM changes or activates the Focus Portal.
4. **Feedback:** User provides satisfaction data; system enables one-click reset.

## 6. Advanced: The Vision Loop (Closed-Loop Adaptation)
To move beyond "fire-and-forget" adaptations, Aura implements a self-correcting vision loop:

1.  **Trigger:** A high-impact tool (e.g., `SimplifyLayout`) is executed.
2.  **Capture:** The extension captures a visible tab screenshot.
3.  **Analysis:** The **Vision Judge Agent** (using GPT-4o or LLaVA) analyzes the visual result.
4.  **Verdict:**
    *   **Pass:** The change is kept.
    *   **Fail:** The system triggers an immediate rollback or attempts a refinement (e.g., reduces font scaling).

This loop ensures that Aura never leaves the user with a broken or unusable interface, simulating a human designer reviewing their own work.

## 7. Reliability & Fallbacks
To ensure a consistent user experience during demos or in offline scenarios, Aura includes an **Intelligent Mock Fallback** mechanism:
- **Connection Awareness:** The system detects when the primary LLM provider (e.g., local Ollama instance) is unavailable.
- **Contextual Synthesis:** Instead of a generic error, the system synthesizes a useful response using the locally-scraped `dom_data` (Title, URL, and Content Summary).
- **Personalization Preservation:** The fallback honors the user's `language_level` preference even without an active LLM.

## 8. Key Differentiators
Proactive accessibility intervention

Structured, explainable AI decisions

Semantic UI restructuring (not just styling)

Built-in validation and regression detection

Works with local LLMs (no API dependency)

## 8. Summary
This agent-based architecture transforms accessibility from:

static settings and passive tools
into
a live, intelligent, adaptive runtime.

The result is a system that:

Understands users

Understands interfaces

Acts responsibly

Verifies its own impact

This is accessibility as infrastructure, not a feature.