"""Module for distilling raw DOM data into a more manageable format."""

from typing import Any


class DOMDistiller:
    """Distills raw DOM information into a compact representation.

    Focuses on actionable elements and semantic structure to be used by LLMs.
    """

    @staticmethod
    def distill(dom_data: dict[str, Any], max_elements: int = 40) -> dict[str, Any]:
        """Distills raw DOM data.

        Args:
            dom_data: A dictionary containing 'title', 'url', and 'elements'.
            max_elements: Maximum number of elements to include in each category.

        Returns:
            A dictionary with 'title', 'url', 'summary', and 'actions'.
        """
        elements = dom_data.get("elements", [])

        distilled: dict[str, Any] = {
            "title": dom_data.get("title", ""),
            "url": dom_data.get("url", ""),
            "summary": [],
            "actions": [],
        }

        seen_texts: set[str] = set()

        for el in elements:
            role = el.get("role", "generic")
            text = el.get("text", "").strip()

            # Deduplicate by text to avoid redundant nav links/buttons
            if text and text.lower() in seen_texts:
                continue
            if text:
                seen_texts.add(text.lower())

            # Filter out empty or useless elements
            if not text and role not in ["button", "link", "input"]:
                continue

            item = {
                "r": role,  # Shortened keys to save tokens
                "t": text,
                "s": el.get("selector"),
                "l": el.get("aria_label"),
                "v": el.get("in_viewport", False),  # v for visible/viewport
            }

            if role in ["button", "link", "input", "select"]:
                if len(distilled["actions"]) < max_elements:
                    distilled["actions"].append(item)
            else:
                if len(distilled["summary"]) < max_elements:
                    distilled["summary"].append(item)

        return distilled

