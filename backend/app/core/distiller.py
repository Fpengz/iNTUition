"""Module for distilling raw DOM data into a more manageable format."""

import logging
from typing import Any, List

logger = logging.getLogger(__name__)

from app.schemas import DOMData, DistilledData, DistilledElement, DOMElement # Import Pydantic schemas


class DOMDistiller:
    """Distills raw DOM information into a compact representation.

    Focuses on actionable elements and semantic structure to be used by LLMs.
    """

    @staticmethod
    def distill(dom_data: DOMData, max_elements: int = 40) -> DistilledData: # Use Pydantic models
        """Distills raw DOM data.

        Args:
            dom_data: A dictionary containing 'title', 'url', and 'elements'.
            max_elements: Maximum number of elements to include in each category.

        Returns:
            A Dictionary with 'title', 'url', 'summary', and 'actions'.
        """
        elements: List[DOMElement] = dom_data.elements # Access elements directly
        logger.info(f"Starting DOM distillation for URL: {dom_data.url} with {len(elements)} raw elements.")

        distilled_summary: List[DistilledElement] = []
        distilled_actions: List[DistilledElement] = []

        seen_texts: set[str] = set()

        for el in elements:
            role = el.role if el.role else "generic"
            text = el.text.strip()

            # Deduplicate by text to avoid redundant nav links/buttons
            if text and text.lower() in seen_texts:
                continue
            if text:
                seen_texts.add(text.lower())

            # Filter out empty or useless elements
            if not text and role not in ["button", "link", "input"]:
                continue

            item = DistilledElement( # Construct DistilledElement
                role=role,
                text=text,
                selector=el.selector,
                aria_label=el.aria_label,
                in_viewport=el.in_viewport,
            )

            if role in ["button", "link", "input", "select"]:
                if len(distilled_actions) < max_elements:
                    distilled_actions.append(item)
            else:
                if len(distilled_summary) < max_elements:
                    distilled_summary.append(item)

        logger.info(f"Finished DOM distillation. Summary elements: {len(distilled_summary)}, Action elements: {len(distilled_actions)}")
        
        return DistilledData( # Return DistilledData model
            title=dom_data.title,
            url=dom_data.url,
            summary=distilled_summary,
            actions=distilled_actions,
        )
