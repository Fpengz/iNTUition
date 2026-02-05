"""Module for distilling raw DOM data into a more manageable format."""

import logging

from app.schemas import (
    DistilledData,
    DistilledElement,
    DOMData,
    DOMElement,
)

logger = logging.getLogger(__name__)


class DOMDistiller:
    """Distills raw DOM information into a compact representation.

    Focuses on actionable elements and semantic structure to be used by LLMs.
    """

    @staticmethod
    def distill(dom_data: DOMData, max_elements: int = 40) -> DistilledData:
        """Distills raw DOM data.

        Args:
            dom_data: A DOMData model containing title, url, and elements.
            max_elements: Maximum number of elements to include in each category.

        Returns:
            A DistilledData model with summary and actions elements.
        """
        try:
            elements: list[DOMElement] = dom_data.elements
            logger.info(
                f"Distilling DOM: {dom_data.url} | Raw elements: {len(elements)}"
            )

            distilled_summary: list[DistilledElement] = []
            distilled_actions: list[DistilledElement] = []

            seen_texts: set[str] = set()

            for i, el in enumerate(elements):
                try:
                    role = el.role if el.role else "generic"
                    text = el.text.strip() if el.text else ""

                    if text and text.lower() in seen_texts:
                        logger.debug(f"Skipping duplicate text at index {i}: {text[:30]}...")
                        continue
                    if text:
                        seen_texts.add(text.lower())

                    if not text and role not in ["button", "link", "input"]:
                        continue

                    item = DistilledElement(
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
                except Exception as el_err:
                    logger.warning(
                        f"Failed to process element at index {i}: {el_err}"
                    )
                    continue

            logger.info(
                f"Distillation complete | Summary: {len(distilled_summary)} | Actions: {len(distilled_actions)}"
            )

            return DistilledData(
                title=dom_data.title,
                url=dom_data.url,
                summary=distilled_summary,
                actions=distilled_actions,
            )
        except Exception as e:
            logger.error(f"Critical failure in DOMDistiller.distill: {e}")
            return DistilledData(
                title=dom_data.title if dom_data else "Unknown",
                url=dom_data.url if dom_data else "http://unknown.com",  # ty:ignore[arg-type]
                summary=[],
                actions=[],
            )

    @staticmethod
    def distill_html(
        html: str, url: str, max_elements: int = 40
    ) -> DistilledData:
        """Distills raw HTML into a DistilledData model using BeautifulSoup.

        Args:
            html: The raw HTML content.
            url: The URL of the page.
            max_elements: Maximum number of elements to include in each category.

        Returns:
            A DistilledData object.
        """
        from bs4 import BeautifulSoup

        logger.info(f"Distilling raw HTML from URL: {url}")
        try:
            soup = BeautifulSoup(html, "html.parser")
            title_tag = soup.title
            title = title_tag.string if title_tag else "No Title Found"

            distilled_summary: list[DistilledElement] = []
            distilled_actions: list[DistilledElement] = []
            seen_texts: set[str] = set()

            tags_to_roles = {
                "h1": "heading",
                "h2": "heading",
                "h3": "heading",
                "p": "text",
                "button": "button",
                "a": "link",
                "input": "input",
                "select": "select",
            }

            for tag, role in tags_to_roles.items():
                elements = soup.find_all(tag)
                logger.debug(f"Found {len(elements)} elements for tag <{tag}>")
                for el in elements:
                    text = el.get_text().strip()
                    if not text and tag == "input":
                        text = el.get("placeholder", "") or el.get(
                            "aria-label", ""
                        )

                    if not text and role not in [
                        "button",
                        "link",
                        "input",
                        "select",
                    ]:
                        continue

                    if text and text.lower() in seen_texts:
                        continue
                    if text:
                        seen_texts.add(text.lower())

                    item = DistilledElement(
                        role=role,
                        text=text[:200],
                        selector=None,
                        aria_label=el.get("aria-label"),
                        in_viewport=True,
                    )

                    if role in ["button", "link", "input", "select"]:
                        if len(distilled_actions) < max_elements:
                            distilled_actions.append(item)
                    else:
                        if len(distilled_summary) < max_elements:
                            distilled_summary.append(item)

            logger.info(
                f"HTML distillation complete | Summary: {len(distilled_summary)} | Actions: {len(distilled_actions)}"
            )
            return DistilledData(
                title=str(title),
                url=url,  # ty:ignore[arg-type]
                summary=distilled_summary,
                actions=distilled_actions,
            )
        except Exception as e:
            logger.error(f"Failed to distill HTML from {url}: {e}")
            return DistilledData(
                title="Error",
                url=url,  # ty:ignore[arg-type]
                summary=[],
                actions=[],
            )
