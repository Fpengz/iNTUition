"""Module for distilling raw DOM data into a more manageable format."""

from typing import Any


class DOMDistiller:
    """Distills raw DOM information into a compact representation.

    Focuses on actionable elements and semantic structure to be used by LLMs.
    """

    @staticmethod
    def distill(dom_data: dict[str, Any]) -> dict[str, Any]:
        """Distills raw DOM data.

        Args:
            dom_data: A dictionary containing 'title', 'url', and 'elements'.
                'elements' should be a list of dictionaries with 'role', 'text',
                'selector', and 'aria_label'.

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

        for el in elements:
            role = el.get("role", "generic")
            text = el.get("text", "").strip()

            # Filter out empty or useless elements
            if not text and role not in ["button", "link", "input"]:
                continue

            item = {
                "role": role,
                "text": text,
                "selector": el.get("selector"),  # To map back for highlighting
                "aria_label": el.get("aria_label"),
            }

            if role in ["button", "link", "input", "select"]:
                distilled["actions"].append(item)
            else:
                distilled["summary"].append(item)

        return distilled

