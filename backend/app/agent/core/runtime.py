import logging
import asyncio
from typing import List, Optional, Dict

from app.agent.models.skeleton import PageSnapshot, AccessibilityAssessment, UIAdaptationDecision
from app.agent.core.heuristics import should_run_ai
from app.agent.core.bionic_helper import should_apply_bionic
from app.agent.agents.phased import assessment_agent, adaptation_agent, judge_agent
from app.schemas import UserProfile, DOMData

logger = logging.getLogger(__name__)

class AccessibilityRuntime:
    """Orchestrator for the Phased Multi-Agent Accessibility Runtime."""

    async def process_page(
        self, 
        dom_data: DOMData, 
        user_profile: UserProfile,
        interaction_logs: Optional[List[str]] = None,
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
            assessment_result = await assessment_agent.run(str(snapshot.model_dump()))
            assessment: AccessibilityAssessment = assessment_result.data
            logger.info(f"Assessment: Risk={assessment.risk_level} | Conf={assessment.confidence}")

            if assessment.confidence < 0.5 or assessment.risk_level == "low":
                return {"action": "suggest_help", "message": "Aura is standing by if you need help."}

            # 3. Phase 2: Adaptation Decision
            adaptation_input = f"Page: {snapshot.model_dump_json()}\nAssessment: {assessment.model_dump_json()}\nUser Profile: {user_profile.model_dump_json()}"
            adaptation_result = await adaptation_agent.run(adaptation_input)
            adaptation: UIAdaptationDecision = adaptation_result.data
            logger.info(f"Adaptation: Mode={adaptation.layout_mode} | Conf={adaptation.confidence}")

            if adaptation.confidence < 0.6:
                return {"action": "suggest_help", "explanation": adaptation.explanation}

            # 4. Phase 3: Validation (Judge)
            judge_input = f"Before: {snapshot.dom_text}\nProposed: {adaptation.model_dump_json()}"
            judge_result = await judge_agent.run(judge_input)
            
            if not judge_result.data.success:
                logger.warning(f"Judge rejected adaptation: {judge_result.data.errors}")
                return {"action": "warn", "message": "Proposed adaptation failed safety check."}

            # --- HARD SAFETY GATE: Never hide the main content ---
            safe_hide = [s for s in adaptation.hide_elements if s.lower() != main_selector.lower()]

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
                    "apply_bionic": should_apply_bionic(user_profile)
                },
                "mode": "phased_agent"
            }

        except Exception as e:
            logger.error(f"Error in phased runtime: {e}")
            # Intelligent fallback
            return self._get_mock_response(dom_data, user_profile)

    def _parse_logs(self, logs: Optional[List[str]]) -> Dict[str, float]:
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
                "apply_bionic": should_apply_bionic(user_profile)
            },
            "mode": "mock_fallback"
        }
