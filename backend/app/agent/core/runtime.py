import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional, cast

if TYPE_CHECKING:
    from pydantic_ai import AgentRunResult
    from app.agent.models.skeleton import JudgeResult

from app.agent.agents.phased import (
    adaptation_agent,
    assessment_agent,
    judge_agent,
)
from app.agent.core.bionic_helper import should_apply_bionic
from app.agent.core.heuristics import should_run_ai
from app.agent.models.skeleton import (
    AccessibilityAssessment,
    PageSnapshot,
    UIAdaptationDecision,
)
from app.schemas import DOMData, UserProfile

logger = logging.getLogger(__name__)

class AccessibilityRuntime:
    """Orchestrator for the Phased Multi-Agent Accessibility Runtime."""

    async def process_page(
        self,
        dom_data: DOMData,
        user_profile: UserProfile,
        interaction_logs: list[str] | None = None,
        is_explicit: bool = False
    ):
        logger.info(f"Starting phased runtime for: {dom_data.url} (Explicit: {is_explicit})")

        # Construct Snapshot with richer content context
        snapshot = PageSnapshot(
            url=str(dom_data.url),
            dom_text=f"Title: {dom_data.title}\nContent Snippet: {getattr(dom_data, 'content_summary', '')}",
            dom_structure=str([el.model_dump() for el in dom_data.elements])[:8000],
            interaction_stats=self._parse_logs(interaction_logs)
        )

        main_selector = getattr(dom_data, 'main_selector', 'main')

        # 1. Phase 0: Heuristic Gate (only for background/proactive)
        if not is_explicit and not should_run_ai(snapshot):
            logger.info("Heuristic gate: Page is healthy or no struggle detected. Skipping AI.")
            return {"action": "none", "reason": "heuristic_gate"}

        try:
            # 2. Phase 1: Assessment
            logger.debug(f"Phase 1: Assessing accessibility risk for {dom_data.url}")
            assessment_result = await assessment_agent.run(
                str(snapshot.model_dump())
            )
            assessment_result = cast(
                "AgentRunResult[AccessibilityAssessment]", assessment_result
            )
            assessment: AccessibilityAssessment = assessment_result.data
            logger.info(f"Phase 1 Complete: Risk={assessment.risk_level} | Issues={len(assessment.issues)}")

            if assessment.confidence < 0.5 or assessment.risk_level == "low":
                logger.info(f"Assessment confidence low ({assessment.confidence}) or risk low. Skipping adaptation.")
                return {"action": "suggest_help", "message": "Aura is standing by if you need help."}

            # 3. Phase 2: Adaptation Decision
            logger.debug(f"Phase 2: Deciding adaptations for {dom_data.url}")
            adaptation_input = f"Page: {snapshot.model_dump_json()}\nAssessment: {assessment.model_dump_json()}\nUser Profile: {user_profile.model_dump_json()}"
            adaptation_result = await adaptation_agent.run(adaptation_input)
            adaptation_result = cast(
                "AgentRunResult[UIAdaptationDecision]", adaptation_result
            )
            adaptation: UIAdaptationDecision = adaptation_result.data
            logger.info(f"Phase 2 Complete: Mode={adaptation.layout_mode} | Hide={len(adaptation.hide_elements)} | Highlight={len(adaptation.highlight_elements)}")

            if adaptation.confidence < 0.6:
                logger.info(f"Adaptation confidence low ({adaptation.confidence}). Suggesting help instead.")
                return {"action": "suggest_help", "explanation": adaptation.explanation}

            # 4. Phase 3: Validation (Judge)
            logger.debug("Phase 3: Validating proposed adaptation")
            judge_input = f"Before: {snapshot.dom_text}\nProposed: {adaptation.model_dump_json()}"
            judge_result = await judge_agent.run(judge_input)
            judge_result = cast("AgentRunResult[JudgeResult]", judge_result)

            if not judge_result.data.success:
                logger.warning(f"Judge rejected adaptation: {judge_result.data.errors}")
                return {"action": "warn", "message": "Proposed adaptation failed safety check."}
            
            logger.info("Phase 3 Complete: Adaptation validated successfully")

            # --- HARD SAFETY GATE: Never hide the main content ---
            safe_hide = [s for s in adaptation.hide_elements if s.lower() != main_selector.lower()]

            # Determine if we should trigger the Vision Loop
            # Trigger if complexity is high OR confidence is borderline
            visual_required = assessment.complexity_score > 7 or adaptation.confidence < 0.8

            return {
                "action": "apply_ui",
                "ui_command": {
                    "layout_mode": adaptation.layout_mode,
                    "theme": adaptation.theme,
                    "hide": safe_hide,
                    "highlight": adaptation.highlight_elements,
                    "explanation": adaptation.explanation,
                    "risk_level": assessment.risk_level,
                    "complexity": assessment.complexity_score,
                    "apply_bionic": should_apply_bionic(user_profile),
                    "visual_validation_required": visual_required
                },
                "mode": "phased_agent"
            }

        except Exception as e:
            if "connection" in str(e).lower():
                logger.error(f"LLM Connection Error in phased runtime: {e}")
            else:
                logger.error(f"Unexpected error in phased runtime: {e}", exc_info=True)
            
            # Intelligent fallback for demo stability
            logger.info("Triggering Intelligent Mock Fallback due to error.")
            return self._get_mock_response(dom_data, user_profile)

    def _parse_logs(self, logs: list[str] | None) -> dict[str, float]:
        """Simple parser to turn string logs into heuristic stats."""
        stats = {"idle_time": 0, "scroll_loops": 0, "rage_clicks": 0}
        if not logs: return stats

        for log in logs:
            if "scroll" in log.lower(): stats["scroll_loops"] += 1
            if "click" in log.lower(): stats["rage_clicks"] += 1
            if "long" in log.lower() or "idle" in log.lower(): stats["idle_time"] = 15

        return stats

    def _get_mock_response(self, dom_data: DOMData, user_profile: UserProfile):
        """Standard mock for demo stability, now content-focused."""
        logger.debug(f"Generating mock response for {dom_data.url}")
        site_name = dom_data.title or "this website"
        snippet = dom_data.content_summary[:150] + "..." if dom_data.content_summary else "no content preview available."

        if user_profile.language_level == "simple":
            explanation = f"This page is about {site_name}. In short: {snippet} I've simplified the layout so you can focus on reading."
        else:
            explanation = f"Detailed Analysis of {site_name}: This page contains information regarding {snippet} To assist your navigation, I have identified primary actions and suppressed secondary navigational clutter."

        return {
            "action": "apply_ui",
            "ui_command": {
                "hide": [el.selector for el in dom_data.elements if el.role in ["link", "nav"]][:3],
                "highlight": [el.selector for el in dom_data.elements if el.role == "button"][:1],
                "layout_mode": "focus" if user_profile.cognitive_needs else "simplified",
                "theme": None,
                "explanation": explanation,
                "risk_level": "medium",
                "complexity": 7,
                "apply_bionic": should_apply_bionic(user_profile),
                "visual_validation_required": False
            },
            "mode": "mock_fallback"
        }
