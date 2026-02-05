"""Main entry point for the Aura Accessibility API."""

from typing import Annotated, Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.distiller import DOMDistiller
from app.core.explainer import AuraExplainer

load_dotenv()

app = FastAPI(title="iNTUition Accessibility API")
explainer = AuraExplainer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API.

    Returns:
        A welcome message.
    """
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}


@app.post("/explain")
async def explain(
    dom_data: Annotated[dict[str, Any], Body(...)],
    profile: Annotated[dict[str, Any] | None, Body()] = None,
) -> dict[str, Any]:
    """Explains a web page based on distilled DOM data.

    Args:
        dom_data: The raw DOM data from the frontend.
        profile: Optional user accessibility profile.

    Returns:
        A dictionary containing the explanation and distilled data.
    """
    distilled = DOMDistiller.distill(dom_data)
    explanation = await explainer.explain_page(distilled, profile)
    return {"explanation": explanation, "distilled": distilled}


@app.post("/action")
async def action(
    dom_data: Annotated[dict[str, Any], Body(...)],
    query: Annotated[str, Body(...)],
) -> dict[str, Any]:
    """Finds a specific action on the page based on a user query.

    Args:
        dom_data: The raw DOM data from the frontend.
        query: The user's natural language query.

    Returns:
        A dictionary containing the mapped action or an error.
    """
    distilled = DOMDistiller.distill(dom_data)
    result = await explainer.find_action(distilled, query)
    return result


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        The status of the API.
    """
    return {"status": "healthy"}

